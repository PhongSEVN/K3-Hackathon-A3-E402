from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Citation:
    source_file: str
    source_urls: list[str]
    relative_path: str
    chunk_index: int


@dataclass
class RetrievedChunk:
    id: str
    text: str
    score: float
    crop: str
    disease: str
    citation: Citation


@dataclass
class QuestionAnalysis:
    original_question: str
    crop: str = ""
    intent: str = "diagnosis"
    missing_fields: list[str] = field(default_factory=list)
    symptoms: list[str] = field(default_factory=list)


@dataclass
class RAGAnswer:
    question: str
    answer: str
    confidence: float
    needs_human_review: bool
    analysis: QuestionAnalysis
    citations: list[Citation]
    contexts: list[RetrievedChunk]
