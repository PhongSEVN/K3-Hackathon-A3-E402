from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import asdict
from pathlib import Path

from .prompts import ANSWER_PROMPT, OFF_TOPIC_REPLY, SYSTEM_PROMPT
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

# Nông dân đã tự xử lý bằng thuốc cụ thể mà chưa khỏi. Kho tài liệu chỉ có
# hướng dẫn xử lý chung cho từng bệnh, không đủ để xác định vì sao cách đã
# dùng chưa hiệu quả (liều lượng, thời điểm phun, kháng thuốc, chẩn đoán sai
# bệnh...) — cần chuyên gia kiểm tra trực tiếp thay vì đoán tiếp qua RAG.
TREATMENT_FAILED_HINTS = [
    "đã dùng",
    "có dùng",
    "đã phun",
    "có phun",
    "đã xịt",
    "có xịt",
    "đã sử dụng",
    "đã áp dụng",
    "đã bón",
    "đã trị",
    "chưa khỏi",
    "không khỏi",
    "vẫn không hết",
    "chưa hết",
    "không hết bệnh",
]

# Yêu cầu rõ ràng ngoài phạm vi tư vấn bệnh cây trồng (viết code, lập trình...).
# Kiểm tra TRƯỚC known_crop/known_disease: một phiên chat đính kèm ảnh chẩn
# đoán vẫn có thể hỏi lạc đề giữa chừng, không nên cố nhét ngữ cảnh bệnh cây
# vào một câu hỏi rõ ràng không liên quan (xem session thật: hỏi "cho code
# python in Hello World" vẫn bị trả lời về bệnh than đen mía).
OFF_TOPIC_HINTS = [
    "đoạn code",
    "viết code",
    "lập trình",
    "viết chương trình",
    "viết hàm",
    "viết script",
    "viết thuật toán",
    "python",
    "javascript",
    "typescript",
    "sql",
    "html",
    "hello world",
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


def analyze_question(
    question: str,
    retriever: LocalRetriever | None = None,
    known_crop: str = "",
    known_disease: str = "",
    history: list[tuple[str, str]] | None = None,
) -> QuestionAnalysis:
    """`known_crop`/`known_disease` come from an already-confirmed diagnosis
    (e.g. the CV image classifier) rather than being parsed from the question
    text. `history` means this isn't the first message in the session —
    prior turns the caller will also feed into the prompt. Any of these
    means the crop/symptom fields below are considered answered even if the
    question itself is short or generic ("bệnh này chữa thế nào?", "liều
    lượng thế nào?") — a short follow-up in an ongoing conversation shouldn't
    be treated as "user forgot to say what plant/symptom", it's continuing
    a topic already established earlier in the same session.
    """
    lowered = question.lower()
    has_history = bool(history)
    mentioned_crops = detect_crops(question)
    crop = known_crop or detect_crop(question)
    # Câu hỏi hiện tại không nêu cây trồng, nhưng lịch sử hội thoại có thể đã
    # nêu ("Cho mình thuốc chữa bệnh rỉ sắt trên ngô" ở lượt trước) — dùng lại
    # để retrieval lọc đúng crop thay vì tìm trên toàn bộ kho không giới hạn.
    if not crop and not mentioned_crops and history:
        history_text = " ".join(prior_question for prior_question, _ in history)
        history_crops = detect_crops(history_text)
        crop = history_crops[0] if len(history_crops) == 1 else detect_crop(history_text)
    # Câu hỏi nêu tên bệnh nhưng không nêu tên cây ("bệnh rỉ sắt chữa bằng thuốc
    # gì") vẫn xác định được cây khi bệnh đó chỉ có ở một cây trong kho.
    if not crop and not mentioned_crops and retriever is not None:
        infer_crop_from_disease = getattr(retriever, "infer_crop_from_disease", None)
        crop = infer_crop_from_disease(question) if infer_crop_from_disease else ""
    symptoms = [hint for hint in SYMPTOM_HINTS if hint in lowered]

    unsafe_drug_request = any(phrase in lowered for phrase in ["liều lượng", "kê đơn", "thuốc mạnh nhất"])
    broad_or_unknown = any(phrase in lowered for phrase in ["mọi bệnh", "tất cả bệnh", "chính xác", "chưa biết bệnh"])
    # Cây nằm ngoài kho là "ngoài phạm vi", không phải "người dùng quên nói cây
    # gì" — hỏi lại cũng vô ích vì kho không có tài liệu cho cây đó.
    out_of_scope_crops = detect_out_of_scope_crops(question) if not mentioned_crops and not known_crop else []

    missing = []
    if len(mentioned_crops) > 1 and not known_crop:
        missing.append("cây trồng cụ thể")
    elif not crop and not out_of_scope_crops and not has_history:
        missing.append("cây trồng")
    if any(phrase in lowered for phrase in ["chưa mô tả triệu chứng", "không mô tả triệu chứng", "chưa biết bệnh"]):
        missing.append("triệu chứng cụ thể")
    # Nhắc chung chung "xuất hiện triệu chứng/biểu hiện bệnh" mà không nêu cụ
    # thể là vàng/đốm/khô gì thì vẫn coi là thiếu triệu chứng, dù câu hỏi dài
    # (câu hỏi thật thường mô tả bằng ảnh kèm theo, không phải bằng chữ).
    vague_symptom_mention = not symptoms and not known_disease and any(
        phrase in lowered for phrase in ["triệu chứng", "biểu hiện", "dấu hiệu"]
    )
    if (
        not symptoms
        and not known_disease
        and not has_history
        and (len(question.split()) < 8 or vague_symptom_mention)
    ):
        missing.append("triệu chứng")

    # Đã tự xử lý bằng thuốc cụ thể mà chưa khỏi: kho chỉ có hướng dẫn xử lý
    # chung theo bệnh, không đủ để chẩn đoán vì sao cách đã dùng thất bại —
    # cần chuyên gia kiểm tra trực tiếp thay vì RAG đoán thêm một liệu trình khác.
    treatment_already_tried = any(phrase in lowered for phrase in TREATMENT_FAILED_HINTS)
    off_topic = any(phrase in lowered for phrase in OFF_TOPIC_HINTS)

    if off_topic:
        # Chạy trước mọi nhánh khác: một câu hỏi rõ ràng ngoài chủ đề (viết
        # code...) không nên bị known_crop/known_disease từ ảnh chẩn đoán
        # trước đó ép thành câu hỏi về bệnh cây.
        intent = "off_topic"
        missing = []
    elif unsafe_drug_request and broad_or_unknown:
        intent = "safe_refusal"
    elif out_of_scope_crops:
        intent = "out_of_scope"
        missing = []
    elif treatment_already_tried:
        intent = "treatment_failed"
        missing = []
    else:
        intent = "treatment" if any(word in lowered for word in ["trị", "chữa", "phòng", "xử lý"]) else "diagnosis"
    return QuestionAnalysis(
        original_question=question,
        crop=crop or (out_of_scope_crops[0] if out_of_scope_crops else ""),
        intent=intent,
        missing_fields=missing,
        symptoms=symptoms or ([known_disease] if known_disease else []),
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


def format_history(history: list[tuple[str, str]] | None) -> str:
    if not history:
        return "(không có, đây là câu hỏi đầu tiên trong đoạn chat)"
    turns = [f"Người dùng: {question}\nTrợ lý: {answer}" for question, answer in history]
    return "\n\n".join(turns)


def build_search_query(question: str, history: list[tuple[str, str]] | None) -> str:
    """A follow-up like "Liều lượng như nào? Thời gian sử dụng ra sao?" has no
    crop/disease terms of its own — searched alone it retrieves near-random
    chunks even though analyze_question correctly stopped asking "what
    plant?" because history already covers it. Word count is not a reliable
    trigger here (that question is 10 words and still context-free), so
    enrich whenever the current question itself doesn't name a crop — fold
    in the *prior questions* only, not the answers: after 2+ generic
    follow-ups in a row the crop/disease name may only appear in turn 1's
    question, and assistant answers are long enough (several sentences) that
    mixing them in dilutes the query and drifts retrieval toward a generic
    chunk instead of the specific one. The LLM still only answers CÂU HỎI
    HIỆN TẠI — this only widens what retrieval searches on."""
    if history and not detect_crops(question) and not detect_crop(question):
        prior_questions = " ".join(prior_question for prior_question, _ in history)
        return f"{prior_questions} {question}"
    return question


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


_SOURCE_HEADING_RE = re.compile(r"^\s*nguồn(\s+tham\s+khảo)?\s*:?\s*$|^\s*nguồn(\s+tham\s+khảo)?\s*:", re.IGNORECASE)


def strip_llm_source_section(answer: str) -> str:
    """ANSWER_PROMPT tells the model not to add its own "Nguồn"/"Nguồn tham
    khảo" section — gpt-4o-mini doesn't always obey. The system appends the
    real, verified citations separately (see chatFormat.ts), so a
    self-generated source list here is at best a duplicate, at worst
    mismatched with what was actually retrieved. Cut everything from the
    first line that looks like a source heading onward.
    """
    lines = answer.split("\n")
    for index, line in enumerate(lines):
        if _SOURCE_HEADING_RE.match(line):
            return "\n".join(lines[:index]).rstrip()
    return answer


def fallback_answer(question: str, analysis: QuestionAnalysis, contexts: list[RetrievedChunk]) -> str:
    if analysis.intent == "off_topic":
        return (
            "Chưa đủ dữ liệu trong kho tài liệu RAG để trả lời yêu cầu này — mình chỉ hỗ trợ tư vấn "
            "bệnh cây trồng (lúa, cà phê, mía, ngô), không viết code hay hỗ trợ chủ đề ngoài nông nghiệp. "
            "Bạn có câu hỏi nào về bệnh cây trồng không?"
        )
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
    if analysis.intent == "treatment_failed":
        crop = analysis.crop or "cây trồng bạn hỏi"
        return (
            f"Chưa đủ dữ liệu trong kho tài liệu RAG để xác định vì sao cách đã xử lý cho {crop} chưa hiệu "
            "quả — có thể do liều lượng, thời điểm phun, thuốc bị kháng, hoặc chẩn đoán bệnh chưa đúng, và kho "
            "chỉ có hướng dẫn xử lý chung theo từng bệnh chứ không chẩn đoán được ca đã điều trị thất bại. "
            "Nên chuyển câu hỏi cho chuyên gia / cán bộ BVTV kiểm tra trực tiếp thay vì trả lời khi không có nguồn."
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
    if analysis.intent == "off_topic":
        # Chắc chắn đây là câu hỏi ngoài phạm vi — không cần chuyên gia nông
        # nghiệp xem lại yêu cầu viết code.
        return 0.9
    if analysis.intent in ("safe_refusal", "out_of_scope", "treatment_failed"):
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

    def answer_question(
        self,
        question: str,
        top_k: int = 5,
        known_crop: str = "",
        known_disease: str = "",
        history: list[tuple[str, str]] | None = None,
    ) -> RAGAnswer:
        analysis = analyze_question(
            question,
            retriever=self.retriever,
            known_crop=known_crop,
            known_disease=known_disease,
            history=history,
        )
        contexts = (
            []
            if analysis.missing_fields
            or analysis.intent in ("safe_refusal", "out_of_scope", "treatment_failed", "off_topic")
            else self.retriever.search(build_search_query(question, history), top_k=top_k, crop=analysis.crop)
        )
        # No LLM call when there is nothing grounded to answer from: missing
        # required fields, a safe-refusal intent, or an empty retrieval (out
        # of scope). Otherwise the LLM tends to answer anyway from its own
        # knowledge instead of asking to clarify / refusing, and does so
        # without citations (see golden set G11/G12/G19/G32/G33).
        if contexts:
            prompt = ANSWER_PROMPT.format(
                history=format_history(history),
                question=question,
                crop=analysis.crop or "chưa rõ",
                intent=analysis.intent,
                # known_disease (không phải contexts[0].disease) — đây là bệnh
                # đã CHẮC CHẮN xác nhận từ trước (vd CV), khác với bệnh tài
                # liệu vừa gợi ý cho câu hỏi này. Dùng contexts[0].disease ở
                # đây từng khiến LLM rút gọn cấu trúc cho cả câu hỏi chẩn đoán
                # lần đầu, vì retrieval luôn trả về một bệnh "khả năng cao
                # nhất" bất kể người dùng đã biết bệnh hay chưa.
                confirmed_disease=known_disease or "chưa xác nhận",
                missing_fields=", ".join(analysis.missing_fields) or "không",
                contexts=format_contexts(contexts),
            )
            answer = call_openai(prompt) if self.use_llm else ""
            answer = strip_llm_source_section(answer)
        else:
            answer = ""
        answer = answer or fallback_answer(question, analysis, contexts)
        # Bộ từ khóa OFF_TOPIC_HINTS chỉ bắt được các câu hỏi lạc đề đã liệt
        # kê trước — LLM tự nhận ra chủ đề tốt hơn nhiều so với danh sách từ
        # khóa cố định (xem ANSWER_PROMPT). Khi LLM tự chối vì câu hỏi không
        # liên quan, dọn sạch citations/confidence để không gắn nguồn của một
        # bệnh không liên quan vào câu trả lời từ chối.
        if OFF_TOPIC_REPLY in answer:
            return RAGAnswer(
                question=question,
                answer=OFF_TOPIC_REPLY,
                confidence=0.9,
                needs_human_review=False,
                analysis=analysis,
                citations=[],
                contexts=[],
            )
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
        choices=["bm25", "chroma", "hybrid"],
        default="bm25",
        help="Retriever backend: local BM25 index (default), ChromaDB vector store, or "
        "hybrid (dense + BM25 via RRF, then cross-encoder rerank — what production uses).",
    )
    args = parser.parse_args()

    if args.backend == "chroma":
        from .chroma_retriever import ChromaRetriever

        retriever = ChromaRetriever()
    elif args.backend == "hybrid":
        from .hybrid_retriever import HybridRetriever

        retriever = HybridRetriever()
    else:
        retriever = None

    result = AgenticRAG(retriever=retriever).answer_question(args.question, top_k=args.top_k)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
