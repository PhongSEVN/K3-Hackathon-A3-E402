from __future__ import annotations

import argparse
import json
import math
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INDEX_DIR = ROOT / "vectorstore"
INDEX_PATH = INDEX_DIR / "chunks.jsonl"
MANIFEST_PATH = INDEX_DIR / "manifest.json"


@dataclass
class Chunk:
    id: str
    text: str
    crop: str
    disease: str
    source_file: str
    source_url: str
    relative_path: str
    chunk_index: int
    token_count: int


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFC", value)
    value = value.replace("\ufeff", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def tokenize(value: str) -> list[str]:
    value = unicodedata.normalize("NFKC", value.lower())
    return re.findall(r"[\wÀ-ỹ]+", value, flags=re.UNICODE)


def load_source_maps(data_dir: Path) -> dict[Path, dict[str, str]]:
    maps: dict[Path, dict[str, str]] = {}
    for source_file in data_dir.rglob("sources.json"):
        try:
            raw = json.loads(source_file.read_text(encoding="utf-8"))
            maps[source_file.parent] = {str(k): str(v) for k, v in raw.items()}
        except (UnicodeDecodeError, json.JSONDecodeError):
            maps[source_file.parent] = {}
    return maps


def source_for(path: Path, source_maps: dict[Path, dict[str, str]]) -> str:
    for parent in [path.parent, *path.parents]:
        mapping = source_maps.get(parent)
        if not mapping:
            continue
        return mapping.get(path.name) or mapping.get("*") or ""
    return ""


def infer_crop_and_disease(path: Path, data_dir: Path) -> tuple[str, str]:
    rel = path.relative_to(data_dir)
    parts = rel.parts
    crop = parts[0] if parts else "unknown"
    disease = ""
    if len(parts) >= 3 and parts[-1].lower() == "text.txt":
        disease = parts[-2]
    elif len(parts) >= 2 and parts[1] != "pdf":
        disease = parts[1]
    return crop, disease


def read_text_file(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1258", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(errors="ignore")


def read_optional_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return ""
    try:
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def read_optional_docx(path: Path) -> str:
    try:
        from docx import Document  # type: ignore
    except Exception:
        return ""
    try:
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def iter_documents(data_dir: Path, include_binary: bool = False) -> Iterable[tuple[Path, str]]:
    for path in sorted(data_dir.rglob("*")):
        if not path.is_file() or path.name == "sources.json":
            continue
        suffix = path.suffix.lower()
        if suffix == ".txt":
            text = read_text_file(path)
        elif include_binary and suffix == ".pdf":
            text = read_optional_pdf(path)
        elif include_binary and suffix == ".docx":
            text = read_optional_docx(path)
        else:
            text = ""
        text = normalize_text(text)
        if text:
            yield path, text


def split_chunks(text: str, max_tokens: int = 220, overlap: int = 45) -> list[str]:
    words = text.split()
    if len(words) <= max_tokens:
        return [text]
    chunks: list[str] = []
    step = max(1, max_tokens - overlap)
    for start in range(0, len(words), step):
        part = words[start : start + max_tokens]
        if len(part) < 35 and chunks:
            chunks[-1] = f"{chunks[-1]} {' '.join(part)}"
            break
        chunks.append(" ".join(part))
    return chunks


def build_chunks(data_dir: Path, include_binary: bool = False) -> list[Chunk]:
    source_maps = load_source_maps(data_dir)
    chunks: list[Chunk] = []
    for path, text in iter_documents(data_dir, include_binary=include_binary):
        crop, disease = infer_crop_and_disease(path, data_dir)
        source_url = source_for(path, source_maps)
        rel = path.relative_to(ROOT).as_posix()
        for index, chunk_text in enumerate(split_chunks(text)):
            chunk_id = f"{len(chunks):06d}"
            chunks.append(
                Chunk(
                    id=chunk_id,
                    text=chunk_text,
                    crop=crop,
                    disease=disease,
                    source_file=path.name,
                    source_url=source_url,
                    relative_path=rel,
                    chunk_index=index,
                    token_count=len(tokenize(chunk_text)),
                )
            )
    return chunks


def write_index(chunks: list[Chunk], index_path: Path = INDEX_PATH) -> None:
    index_path.parent.mkdir(parents=True, exist_ok=True)
    with index_path.open("w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(asdict(chunk), ensure_ascii=False) + "\n")
    manifest = {
        "chunk_count": len(chunks),
        "source_count": len({chunk.relative_path for chunk in chunks}),
        "crops": sorted({chunk.crop for chunk in chunks}),
        "diseases": sorted({chunk.disease for chunk in chunks if chunk.disease}),
        "scoring": "BM25-lite lexical baseline; optional LLM synthesis happens in rag/app/agent.py",
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def build_chroma_index(chunks: list[Chunk]) -> None:
    sys.path.insert(0, str(ROOT.parent))
    from rag.app.chroma_retriever import PERSIST_DIR, COLLECTION_NAME, OpenAIEmbeddingFunction
    import chromadb

    client = chromadb.PersistentClient(path=str(PERSIST_DIR))
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=OpenAIEmbeddingFunction(),
        metadata={"hnsw:space": "cosine"},
    )
    batch_size = 100
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        collection.upsert(
            ids=[chunk.id for chunk in batch],
            documents=[chunk.text for chunk in batch],
            metadatas=[
                {
                    "crop": chunk.crop,
                    "disease": chunk.disease,
                    "source_file": chunk.source_file,
                    "source_url": chunk.source_url,
                    "relative_path": chunk.relative_path,
                    "chunk_index": chunk.chunk_index,
                }
                for chunk in batch
            ],
        )
    print(f"Upserted {len(chunks)} chunks into Chroma collection '{COLLECTION_NAME}' at {PERSIST_DIR}")


def idf_stats(chunks: list[Chunk]) -> dict[str, float]:
    doc_count = len(chunks)
    df: Counter[str] = Counter()
    for chunk in chunks:
        df.update(set(tokenize(chunk.text)))
    return {term: math.log((doc_count + 1) / (count + 0.5)) for term, count in df.items()}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Build the local RAG chunk index.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--out", type=Path, default=INDEX_PATH)
    parser.add_argument("--include-binary", action="store_true", help="Also try PDF/DOCX extraction.")
    parser.add_argument(
        "--chroma",
        action="store_true",
        help="Also embed chunks into a persistent ChromaDB collection (needs API_KEY + network).",
    )
    args = parser.parse_args()

    chunks = build_chunks(args.data_dir, include_binary=args.include_binary)
    write_index(chunks, args.out)
    print(f"Indexed {len(chunks)} chunks from {args.data_dir} -> {args.out}")

    if args.chroma:
        build_chroma_index(chunks)


if __name__ == "__main__":
    main()
