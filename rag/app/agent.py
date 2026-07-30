from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import asdict
from pathlib import Path

from .prompts import ANSWER_PROMPT, SYSTEM_PROMPT
from .rag_pipeline import LocalRetriever, detect_crop, detect_crops, detect_out_of_scope_crops
from .schemas import Citation, QuestionAnalysis, RAGAnswer, RetrievedChunk


SYMPTOM_HINTS = [
    "đốm",
    "vàng lá",
    "cháy lá",
    "rỉ sắt",
    "khô",
    "héo",
    "thối",
    "sâu",
    "phấn trắng",
    "khảm",
    "tungro",
    "đạo ôn",
]


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


def analyze_question(question: str, retriever: LocalRetriever | None = None) -> QuestionAnalysis:
    lowered = question.lower()
    mentioned_crops = detect_crops(question)
    crop = detect_crop(question)
    # Câu hỏi nêu tên bệnh nhưng không nêu tên cây ("bệnh rỉ sắt chữa bằng thuốc
    # gì") vẫn xác định được cây khi bệnh đó chỉ có ở một cây trong kho.
    if not crop and not mentioned_crops and retriever is not None:
        crop = retriever.infer_crop_from_disease(question)
    symptoms = [hint for hint in SYMPTOM_HINTS if hint in lowered]

    unsafe_drug_request = any(phrase in lowered for phrase in ["liều lượng", "kê đơn", "thuốc mạnh nhất"])
    broad_or_unknown = any(phrase in lowered for phrase in ["mọi bệnh", "tất cả bệnh", "chính xác", "chưa biết bệnh"])
    # Cây nằm ngoài kho là "ngoài phạm vi", không phải "người dùng quên nói cây
    # gì" — hỏi lại cũng vô ích vì kho không có tài liệu cho cây đó.
    out_of_scope_crops = detect_out_of_scope_crops(question) if not mentioned_crops else []

    missing = []
    if len(mentioned_crops) > 1:
        missing.append("cây trồng cụ thể")
    elif not crop and not out_of_scope_crops:
        missing.append("cây trồng")
    if any(phrase in lowered for phrase in ["chưa mô tả triệu chứng", "không mô tả triệu chứng", "chưa biết bệnh"]):
        missing.append("triệu chứng cụ thể")
    # Nhắc chung chung "xuất hiện triệu chứng/biểu hiện bệnh" mà không nêu cụ
    # thể là vàng/đốm/khô gì thì vẫn coi là thiếu triệu chứng, dù câu hỏi dài
    # (câu hỏi thật thường mô tả bằng ảnh kèm theo, không phải bằng chữ).
    vague_symptom_mention = not symptoms and any(
        phrase in lowered for phrase in ["triệu chứng", "biểu hiện", "dấu hiệu"]
    )
    if not symptoms and (len(question.split()) < 8 or vague_symptom_mention):
        missing.append("triệu chứng")

    if unsafe_drug_request and broad_or_unknown:
        intent = "safe_refusal"
    elif out_of_scope_crops:
        intent = "out_of_scope"
        missing = []
    else:
        intent = "treatment" if any(word in lowered for word in ["trị", "chữa", "phòng", "xử lý"]) else "diagnosis"
    return QuestionAnalysis(
        original_question=question,
        crop=crop or (out_of_scope_crops[0] if out_of_scope_crops else ""),
        intent=intent,
        missing_fields=missing,
        symptoms=symptoms,
    )


def format_contexts(contexts: list[RetrievedChunk]) -> str:
    lines = []
    for index, item in enumerate(contexts, start=1):
        source = ", ".join(item.citation.source_urls) if item.citation.source_urls else item.citation.relative_path
        lines.append(
            f"[{index}] crop={item.crop}; disease={item.disease}; source={source}; "
            f"chunk={item.citation.chunk_index}\n{item.text}"
        )
    return "\n\n".join(lines)


def call_openai(prompt: str) -> str:
    load_env_file()
    api_key = os.getenv("API_KEY_OPEN_AI")
    if not api_key:
        return ""
    payload = {
        "model": os.getenv("RAG_OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = json.loads(response.read().decode("utf-8"))
            return raw["choices"][0]["message"]["content"].strip()
    except (urllib.error.URLError, KeyError, TimeoutError, json.JSONDecodeError):
        return ""


def fallback_answer(question: str, analysis: QuestionAnalysis, contexts: list[RetrievedChunk]) -> str:
    if analysis.intent == "safe_refusal":
        crop = analysis.crop or "cây trồng"
        return (
            f"Mình không thể đưa một liều lượng thuốc chính xác cho mọi bệnh trên {crop}. "
            "Mình không bịa tên thuốc hay liều lượng khi nguồn không nêu rõ, và khi chưa biết bệnh "
            "cụ thể thì lại càng không kê được. "
            "Liều lượng phụ thuộc bệnh, giai đoạn cây, hoạt chất, nhãn thuốc, thời tiết và quy định địa phương. "
            "Bạn nên nêu bệnh/triệu chứng cụ thể, hoặc hỏi cán bộ BVTV / chuyên gia trước khi phun."
        )
    if analysis.intent == "out_of_scope":
        crop = analysis.crop or "cây trồng bạn hỏi"
        return (
            f"Chưa đủ dữ liệu trong kho tài liệu RAG để trả lời có nguồn cho cây {crop}. "
            "Kho hiện chỉ có tài liệu về lúa, cà phê, mía và ngô. "
            "Nên chuyển câu hỏi cho chuyên gia thay vì trả lời khi không có nguồn."
        )
    if analysis.missing_fields:
        missing = ", ".join(analysis.missing_fields)
        crop_line = (
            f"Bạn đang hỏi về cây {analysis.crop}, nhưng mình vẫn thiếu phần còn lại. "
            if analysis.crop
            else ""
        )
        return (
            f"Mình cần thêm thông tin về {missing} trước khi chẩn đoán chắc hơn. "
            f"{crop_line}"
            "Hiện chưa đủ dữ liệu để kết luận, nên không phun thuốc ngay khi chưa xác định được bệnh — "
            "phun sai vừa tốn tiền vừa hại cây. "
            "Bạn hãy mô tả cây trồng và triệu chứng cụ thể: vị trí vết bệnh, màu sắc vết, "
            "giai đoạn cây và thời tiết gần đây."
        )
    if not contexts:
        return "Chưa đủ dữ liệu trong kho tài liệu RAG để trả lời có nguồn. Nên chuyển câu hỏi cho chuyên gia."

    top = contexts[0]
    citations = "\n".join(
        f"[{i}] {citation.source_file} - "
        + (", ".join(citation.source_urls) if citation.source_urls else citation.relative_path)
        for i, citation in enumerate(distinct_citations(contexts), start=1)
    )
    evidence = "\n".join(f"- {item.text[:260].strip()}..." for item in contexts[:2])
    return f"""Chẩn đoán khả năng:
- Câu hỏi có vẻ liên quan đến {top.disease or "một bệnh trong tài liệu"} trên cây {top.crop or analysis.crop}.

Dấu hiệu đối chiếu:
{evidence}

Khuyến nghị xử lý:
- Đối chiếu thêm vị trí vết bệnh, màu sắc, thời điểm xuất hiện và điều kiện ẩm/nhiệt độ.
- Ưu tiên biện pháp canh tác an toàn trong nguồn: vệ sinh tàn dư bệnh, dùng giống phù hợp, quản lý nước và phân bón cân đối.
- Chỉ dùng thuốc/liều lượng khi có khuyến cáo rõ trên nhãn hoặc từ cán bộ BVTV địa phương.

Khi nào cần hỏi chuyên gia:
- Nếu bệnh lan nhanh, cây đang giai đoạn ra bông/nuôi trái, hoặc triệu chứng không khớp nguồn truy xuất.

Nguồn:
{citations}"""


def distinct_citations(contexts: list[RetrievedChunk], limit: int = 3) -> list[Citation]:
    """Mỗi tài liệu trích một lần.

    Lấy thẳng 3 chunk đầu thì câu so sánh hai bệnh thường ra 3 chunk cùng một
    tài liệu, người đọc chỉ thấy một nguồn cho hai bệnh (xem golden set G14).
    """
    citations: list[Citation] = []
    seen: set[str] = set()
    for item in contexts:
        key = item.citation.relative_path
        if key in seen:
            continue
        seen.add(key)
        citations.append(item.citation)
        if len(citations) == limit:
            break
    return citations


def confidence_from(contexts: list[RetrievedChunk], analysis: QuestionAnalysis) -> float:
    if analysis.intent in ("safe_refusal", "out_of_scope"):
        return 0.15
    if analysis.missing_fields or not contexts:
        return 0.2
    best = contexts[0].score
    second = contexts[1].score if len(contexts) > 1 else 0.0
    separation = min(0.2, max(0.0, best - second) / 10)
    base = min(0.85, best / 12)
    return round(min(1.0, max(0.25, base + separation)), 2)


class AgenticRAG:
    def __init__(self, retriever: LocalRetriever | None = None, use_llm: bool = True) -> None:
        self.retriever = retriever or LocalRetriever()
        self.use_llm = use_llm

    def answer_question(self, question: str, top_k: int = 5) -> RAGAnswer:
        analysis = analyze_question(question, retriever=self.retriever)
        contexts = (
            []
            if analysis.missing_fields or analysis.intent in ("safe_refusal", "out_of_scope")
            else self.retriever.search(question, top_k=top_k, crop=analysis.crop)
        )
        # No LLM call when there is nothing grounded to answer from: missing
        # required fields, a safe-refusal intent, or an empty retrieval (out
        # of scope). Otherwise the LLM tends to answer anyway from its own
        # knowledge instead of asking to clarify / refusing, and does so
        # without citations (see golden set G11/G12/G19/G32/G33).
        if contexts:
            prompt = ANSWER_PROMPT.format(
                question=question,
                crop=analysis.crop or "chưa rõ",
                intent=analysis.intent,
                missing_fields=", ".join(analysis.missing_fields) or "không",
                contexts=format_contexts(contexts),
            )
            answer = call_openai(prompt) if self.use_llm else ""
        else:
            answer = ""
        answer = answer or fallback_answer(question, analysis, contexts)
        confidence = confidence_from(contexts, analysis)
        citations: list[Citation] = distinct_citations(contexts)
        return RAGAnswer(
            question=question,
            answer=answer,
            confidence=confidence,
            needs_human_review=confidence < 0.55,
            analysis=analysis,
            citations=citations,
            contexts=contexts,
        )


def main() -> None:
    import argparse
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Ask the local Agentic RAG pipeline.")
    parser.add_argument("question")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument(
        "--backend",
        choices=["bm25", "chroma"],
        default="bm25",
        help="Retriever backend: local BM25 index (default) or ChromaDB vector store.",
    )
    args = parser.parse_args()

    if args.backend == "chroma":
        from .chroma_retriever import ChromaRetriever

        retriever = ChromaRetriever()
    else:
        retriever = None

    result = AgenticRAG(retriever=retriever).answer_question(args.question, top_k=args.top_k)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
