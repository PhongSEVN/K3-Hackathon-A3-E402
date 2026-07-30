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

# Cây trồng người dùng hay hỏi nhưng kho tài liệu không có. Nhận ra được thì
# trả lời "ngoài phạm vi, chuyển chuyên gia" thay vì hỏi lại thông tin cây trồng.
OUT_OF_SCOPE_CROP_ALIASES = {
    "xoài": {"xoài"},
    "thanh long": {"thanh long"},
    "sầu riêng": {"sầu riêng"},
    "hồ tiêu": {"hồ tiêu", "cây tiêu"},
    "điều": {"cây điều"},
    "cam": {"cam", "quýt", "bưởi"},
    "chuối": {"chuối"},
    "sắn": {"sắn", "khoai mì"},
    "khoai": {"khoai lang", "khoai tây"},
    "cao su": {"cao su"},
    "chè": {"chè", "cây trà"},
    "dừa": {"dừa"},
    "nhãn": {"nhãn", "vải thiều"},
    "mít": {"mít"},
    "bơ": {"cây bơ"},
    "cà chua": {"cà chua"},
    "dưa hấu": {"dưa hấu", "dưa lưới", "dưa tây", "dưa gang", "dưa lê"},
    "đậu": {"đậu tương", "đậu nành", "đậu phộng"},
    "đu đủ": {"đu đủ"},
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


def _match_aliases(question: str, alias_map: dict[str, set[str]]) -> list[str]:
    question_terms = tokenize(question)
    haystack = " ".join(question_terms)
    matched = []
    for name, aliases in alias_map.items():
        for alias in aliases:
            alias_terms = tokenize(alias)
            alias_text = " ".join(alias_terms)
            if alias_terms and (
                alias_text == haystack
                or f" {alias_text} " in f" {haystack} "
                or (len(alias_terms) == 1 and alias_terms[0] in question_terms)
            ):
                matched.append(name)
                break
    return matched


def detect_crops(question: str) -> list[str]:
    return _match_aliases(question, CROP_ALIASES)


def detect_out_of_scope_crops(question: str) -> list[str]:
    return _match_aliases(question, OUT_OF_SCOPE_CROP_ALIASES)


class LocalRetriever:
    def __init__(self, index_path: Path = INDEX_PATH) -> None:
        self.index_path = index_path
        self.chunks = self._load_chunks(index_path)
        self.doc_count = max(1, len(self.chunks))
        self.avg_len = sum(len(tokenize(chunk["text"])) for chunk in self.chunks) / self.doc_count
        self.df = self._document_frequency()
        self.disease_crops = self._disease_crop_map()

    def _disease_crop_map(self) -> dict[str, set[str]]:
        """Tên bệnh (đã bỏ tiền tố 'bệnh') -> tập cây trồng chứa bệnh đó."""
        mapping: dict[str, set[str]] = {}
        for chunk in self.chunks:
            terms = [term for term in tokenize(chunk.get("disease", "")) if term != "benh"]
            crop = chunk.get("crop", "")
            if not terms or not crop:
                continue
            mapping.setdefault(" ".join(terms), set()).add(crop)
        return mapping

    def infer_crop_from_disease(self, question: str) -> str:
        """Suy cây trồng khi câu hỏi nêu tên bệnh nhưng không nêu tên cây.

        Chỉ nhận khi tên bệnh khớp trỏ về đúng một cây. Ưu tiên tên bệnh dài
        nhất: "rỉ sắt" trỏ cà phê, còn "rỉ sắt ngô" trỏ ngô.
        """
        haystack = f" {' '.join(tokenize(question))} "
        matched = {
            disease: crops
            for disease, crops in self.disease_crops.items()
            if f" {disease} " in haystack
        }
        if not matched:
            return ""
        longest = max(len(disease.split()) for disease in matched)
        crops = {
            crop
            for disease, disease_crops in matched.items()
            if len(disease.split()) == longest
            for crop in disease_crops
        }
        return crops.pop() if len(crops) == 1 else ""

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

    def search(
        self,
        question: str,
        top_k: int = 5,
        crop: str = "",
        max_per_doc: int = 2,
    ) -> list[RetrievedChunk]:
        """Tìm chunk liên quan, giới hạn số chunk lấy từ cùng một tài liệu.

        Không giới hạn thì câu so sánh hai bệnh bị một tài liệu chiếm hết top_k
        và bệnh còn lại không có nguồn nào (xem golden set G14).
        """
        query_terms = tokenize(question)
        if not query_terms:
            return []
        scored = []
        for chunk in self.chunks:
            score = self._score(query_terms, chunk, crop)
            if score > 0:
                scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)

        results = []
        per_doc: Counter[str] = Counter()
        overflow = []
        for score, chunk in scored:
            doc = chunk["relative_path"]
            if per_doc[doc] >= max_per_doc:
                overflow.append((score, chunk))
                continue
            per_doc[doc] += 1
            results.append(self._to_result(chunk, score))
            if len(results) == top_k:
                return results
        # Kho chỉ có ít tài liệu khớp: lấp phần thiếu bằng chunk đã bị chặn.
        for score, chunk in overflow[: top_k - len(results)]:
            results.append(self._to_result(chunk, score))
        return results

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
