from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from chromadb.api.types import Documents, EmbeddingFunction

from .rag_pipeline import ROOT
from .schemas import Citation, RetrievedChunk


PERSIST_DIR = ROOT / "vectorstore" / "chroma"
COLLECTION_NAME = "agri_rag_chunks"
EMBEDDING_MODEL = os.getenv("RAG_OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# Chroma always returns the top-k nearest vectors even when nothing is
# actually relevant (unlike BM25, which naturally returns [] on zero term
# overlap). Below this similarity we treat the question as out of scope so
# the agent falls back to a safe/clarifying answer instead of grounding a
# response in unrelated chunks (see agent.py's `if contexts:` LLM gate).
#
# OpenAI embeddings have a noise floor well above 0 for unrelated Vietnamese
# text (empirically ~0.35-0.42 cosine similarity for off-topic questions
# against this corpus), so a naive low cutoff like 0.35 does not actually
# filter anything out. 0.46 was picked from a quick calibration: irrelevant
# questions (weather, random chit-chat, a crop/disease not in the corpus)
# topped out at ~0.42, while genuinely relevant in-corpus questions scored
# >=0.50. Re-check this if the corpus or embedding model changes.
MIN_SCORE = 0.46


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class OpenAIEmbeddingFunction(EmbeddingFunction[Documents]):
    """Chroma embedding function backed by the OpenAI embeddings HTTP API."""

    def __init__(self, model: str = EMBEDDING_MODEL, batch_size: int = 100) -> None:
        load_env_file()
        self.model = model
        self.batch_size = batch_size
        self.api_key = os.getenv("API_KEY")
        if not self.api_key:
            raise RuntimeError("API_KEY is required in .env to compute OpenAI embeddings.")

    def name(self) -> str:
        return f"openai-{self.model}"

    def __call__(self, input: list[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for start in range(0, len(input), self.batch_size):
            batch = input[start : start + self.batch_size]
            embeddings.extend(self._embed_batch(batch))
        return embeddings

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        payload = {"model": self.model, "input": texts}
        request = urllib.request.Request(
            "https://api.openai.com/v1/embeddings",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError(f"OpenAI embeddings request failed: {exc}") from exc
        return [item["embedding"] for item in raw["data"]]


class ChromaRetriever:
    def __init__(
        self,
        persist_dir: Path = PERSIST_DIR,
        collection_name: str = COLLECTION_NAME,
        min_score: float = MIN_SCORE,
    ) -> None:
        import chromadb  # local import: optional heavy dependency

        self.min_score = min_score
        self.client = chromadb.PersistentClient(path=str(persist_dir))
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=OpenAIEmbeddingFunction(),
            metadata={"hnsw:space": "cosine"},
        )

    def search(self, question: str, top_k: int = 5, crop: str = "") -> list[RetrievedChunk]:
        if self.collection.count() == 0:
            return []
        result = self.collection.query(
            query_texts=[question],
            n_results=min(top_k, self.collection.count()),
            where={"crop": crop} if crop else None,
        )
        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        results: list[RetrievedChunk] = []
        for chunk_id, text, metadata, distance in zip(ids, documents, metadatas, distances):
            similarity = 1 - distance
            score = round(similarity * 10, 4)
            if similarity < self.min_score:
                continue
            citation = Citation(
                source_file=metadata.get("source_file", ""),
                source_url=metadata.get("source_url", ""),
                relative_path=metadata.get("relative_path", ""),
                chunk_index=int(metadata.get("chunk_index", 0)),
            )
            results.append(
                RetrievedChunk(
                    id=chunk_id,
                    text=text,
                    score=score,
                    crop=metadata.get("crop", ""),
                    disease=metadata.get("disease", ""),
                    citation=citation,
                )
            )
        return results
