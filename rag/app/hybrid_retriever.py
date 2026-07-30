from __future__ import annotations

import math
from dataclasses import replace

from .chroma_retriever import ChromaRetriever
from .rag_pipeline import LocalRetriever
from .schemas import RetrievedChunk

# Standard RRF constant (Cormack et al.) — large enough that rank 1 vs rank 2
# in a single retriever doesn't dominate the fused score; what matters is
# showing up near the top of *both* rankings.
RRF_K = 60

# Chroma's score is cosine_similarity*10 (0-10ish, see chroma_retriever.py),
# BM25's raw score can exceed 10 for strong term overlap. Rescaling the
# cross-encoder's sigmoid output to the same ~0-10 range keeps
# confidence_from()'s `best / 12` formula in agent.py meaningful regardless
# of which retriever originally surfaced the top chunk.
RERANK_SCALE = 10


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


class HybridRetriever:
    """Dense (ChromaDB) + lexical (BM25-lite) retrieval, combined with
    Reciprocal Rank Fusion, then re-ordered by a cross-encoder.

    Duck-types the same `.search()` / `.infer_crop_from_disease()` interface
    as ChromaRetriever/LocalRetriever so it drops into AgenticRAG unchanged.
    """

    def __init__(
        self,
        dense: ChromaRetriever | None = None,
        lexical: LocalRetriever | None = None,
        reranker_model: str = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1",
    ) -> None:
        self.dense = dense or ChromaRetriever()
        self.lexical = lexical or LocalRetriever()
        self._reranker_model_name = reranker_model
        self._reranker = None

    def infer_crop_from_disease(self, question: str) -> str:
        return self.lexical.infer_crop_from_disease(question)

    def search(self, question: str, top_k: int = 5, crop: str = "", pool_size: int = 20) -> list[RetrievedChunk]:
        dense_hits = self.dense.search(question, top_k=pool_size, crop=crop)
        lexical_hits = self.lexical.search(question, top_k=pool_size, crop=crop)
        fused = self._reciprocal_rank_fusion(dense_hits, lexical_hits)
        if not fused:
            return []
        candidate_count = max(top_k * 3, 10)
        reranked = self._rerank(question, fused[:candidate_count])
        return self._cap_per_document(reranked, top_k)

    def _reciprocal_rank_fusion(
        self, dense_hits: list[RetrievedChunk], lexical_hits: list[RetrievedChunk]
    ) -> list[RetrievedChunk]:
        scores: dict[str, float] = {}
        items: dict[str, RetrievedChunk] = {}
        for ranked in (dense_hits, lexical_hits):
            for rank, item in enumerate(ranked, start=1):
                scores[item.id] = scores.get(item.id, 0.0) + 1.0 / (RRF_K + rank)
                items.setdefault(item.id, item)
        ordered_ids = sorted(scores, key=lambda key: scores[key], reverse=True)
        return [items[key] for key in ordered_ids]

    def _get_reranker(self):
        if self._reranker is None:
            from sentence_transformers import CrossEncoder

            self._reranker = CrossEncoder(self._reranker_model_name)
        return self._reranker

    def _rerank(self, question: str, candidates: list[RetrievedChunk]) -> list[RetrievedChunk]:
        model = self._get_reranker()
        pairs = [(question, item.text) for item in candidates]
        raw_scores = model.predict(pairs)
        rescored = [
            replace(item, score=round(_sigmoid(float(raw)) * RERANK_SCALE, 4))
            for item, raw in zip(candidates, raw_scores)
        ]
        rescored.sort(key=lambda item: item.score, reverse=True)
        return rescored

    def _cap_per_document(self, ranked: list[RetrievedChunk], top_k: int, max_per_doc: int = 2) -> list[RetrievedChunk]:
        """Same cap LocalRetriever applies: a comparison question shouldn't
        have its top-k swallowed by one document (golden set G14)."""
        results: list[RetrievedChunk] = []
        per_doc: dict[str, int] = {}
        overflow: list[RetrievedChunk] = []
        for item in ranked:
            doc = item.citation.relative_path
            if per_doc.get(doc, 0) >= max_per_doc:
                overflow.append(item)
                continue
            per_doc[doc] = per_doc.get(doc, 0) + 1
            results.append(item)
            if len(results) == top_k:
                return results
        results.extend(overflow[: top_k - len(results)])
        return results
