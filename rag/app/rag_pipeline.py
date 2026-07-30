from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

from .schemas import Citation, RetrievedChunk


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "vectorstore" / "chunks.jsonl"

CROP_ALIASES = {
    "lúa": {"lúa", "lua", "rice"},
    "cà phê": {"cà phê", "ca phe", "coffee"},
    "mía": {"mía", "mia", "sugarcane"},
    "ngô": {"ngô", "ngo", "bắp", "bap", "corn", "maize"},
}


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def tokenize(value: str) -> list[str]:
    value = strip_accents(unicodedata.normalize("NFKC", value.lower()))
    return re.findall(r"[a-z0-9_]+", value)


def detect_crop(question: str) -> str:
    crops = detect_crops(question)
    return crops[0] if len(crops) == 1 else ""


def detect_crops(question: str) -> list[str]:
    question_terms = tokenize(question)
    haystack = " ".join(question_terms)
    crops = []
    for crop, aliases in CROP_ALIASES.items():
        for alias in aliases:
            alias_terms = tokenize(alias)
            alias_text = " ".join(alias_terms)
            if alias_terms and (
                alias_text == haystack
                or f" {alias_text} " in f" {haystack} "
                or (len(alias_terms) == 1 and alias_terms[0] in question_terms)
            ):
                crops.append(crop)
                break
    return crops


class LocalRetriever:
    def __init__(self, index_path: Path = INDEX_PATH) -> None:
        self.index_path = index_path
        self.chunks = self._load_chunks(index_path)
        self.doc_count = max(1, len(self.chunks))
        self.avg_len = sum(len(tokenize(chunk["text"])) for chunk in self.chunks) / self.doc_count
        self.df = self._document_frequency()

    def _load_chunks(self, index_path: Path) -> list[dict]:
        if not index_path.exists():
            raise FileNotFoundError(
                f"Missing RAG index at {index_path}. Run `python rag/ingest/ingest.py` first."
            )
        with index_path.open(encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def _document_frequency(self) -> Counter[str]:
        df: Counter[str] = Counter()
        for chunk in self.chunks:
            df.update(set(tokenize(chunk["text"])))
        return df

    def _idf(self, term: str) -> float:
        return math.log(1 + (self.doc_count - self.df.get(term, 0) + 0.5) / (self.df.get(term, 0) + 0.5))

    def _score(self, query_terms: list[str], chunk: dict, crop: str = "") -> float:
        terms = tokenize(chunk["text"])
        if not terms:
            return 0.0
        counts = Counter(terms)
        k1 = 1.5
        b = 0.75
        score = 0.0
        for term in query_terms:
            freq = counts.get(term, 0)
            if not freq:
                continue
            denom = freq + k1 * (1 - b + b * len(terms) / max(1, self.avg_len))
            score += self._idf(term) * (freq * (k1 + 1) / denom)
        if crop and chunk.get("crop") == crop:
            score *= 1.25
        if crop and chunk.get("crop") != crop:
            score *= 0.65
        disease_terms = [term for term in tokenize(chunk.get("disease", "")) if term != "benh"]
        if disease_terms and all(term in query_terms for term in disease_terms):
            score *= 1.6
        elif disease_terms and len(set(disease_terms) & set(query_terms)) >= min(2, len(disease_terms)):
            score *= 1.25
        return score

    def search(self, question: str, top_k: int = 5, crop: str = "") -> list[RetrievedChunk]:
        query_terms = tokenize(question)
        if not query_terms:
            return []
        scored = []
        for chunk in self.chunks:
            score = self._score(query_terms, chunk, crop)
            if score > 0:
                scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [self._to_result(chunk, score) for score, chunk in scored[:top_k]]

    def _to_result(self, chunk: dict, score: float) -> RetrievedChunk:
        citation = Citation(
            source_file=chunk["source_file"],
            source_urls=chunk.get("source_urls", []),
            relative_path=chunk["relative_path"],
            chunk_index=int(chunk["chunk_index"]),
        )
        return RetrievedChunk(
            id=chunk["id"],
            text=chunk["text"],
            score=round(score, 4),
            crop=chunk.get("crop", ""),
            disease=chunk.get("disease", ""),
            citation=citation,
        )
