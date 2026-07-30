import sys
import threading
from pathlib import Path

# The `rag` package lives at the project root, a sibling of `backend/`, not
# inside this package. Make it importable regardless of the backend's cwd.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag.app.agent import AgenticRAG  # noqa: E402
from rag.app.chroma_retriever import ChromaRetriever  # noqa: E402
from rag.app.schemas import RAGAnswer  # noqa: E402

_rag: AgenticRAG | None = None
_lock = threading.Lock()


def _get_rag() -> AgenticRAG:
    global _rag
    if _rag is None:
        with _lock:
            if _rag is None:
                _rag = AgenticRAG(retriever=ChromaRetriever())
    return _rag


def ask_question(question: str, known_crop: str = "", known_disease: str = "") -> RAGAnswer:
    return _get_rag().answer_question(question, known_crop=known_crop, known_disease=known_disease)
