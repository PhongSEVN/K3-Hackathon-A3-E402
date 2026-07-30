# RAGGUIDE.md

## Phạm vi của Nhi

- Làm trong `/rag`.
- Xây Agentic RAG trả lời câu hỏi nông dân về bệnh cây trồng.
- Câu trả lời phải có nguồn, độ tin cậy và cờ chuyển chuyên gia khi thiếu dữ liệu.
- Eval bằng RAGAS nếu môi trường có cài `ragas`; nếu chưa có thì dùng baseline heuristic để vẫn có bảng kết quả.

## Cấu trúc

```text
rag/
├── app/
│   ├── agent.py
│   ├── prompts.py
│   ├── rag_pipeline.py
│   └── schemas.py
├── data/
├── eval/
│   ├── golden_set.jsonl
│   ├── ragas.py
│   ├── results.csv
│   └── results.md
├── ingest/
│   └── ingest.py
└── vectorstore/
    ├── chunks.jsonl
    └── manifest.json
```

## Luồng Agentic RAG

1. Phân tích câu hỏi để nhận biết cây trồng, ý định và thông tin còn thiếu.
2. Nếu thiếu cây trồng hoặc triệu chứng chính, hệ thống hỏi lại thay vì đoán.
3. Nếu đủ dữ liệu, retriever lấy các đoạn liên quan từ index local.
4. Agent tổng hợp câu trả lời theo nguồn; nếu có `API_KEY`, gọi LLM thật.
5. Nếu không có key hoặc API lỗi, hệ thống dùng câu trả lời baseline có trích dẫn từ context.
6. Trả về `answer`, `citations`, `confidence`, `needs_human_review`.

Agent tự đọc `API_KEY` từ `.env` ở root repo nếu biến môi trường chưa được export.

## Lệnh chạy

Build index:

```powershell
python rag/ingest/ingest.py
```

Hỏi thử:

```powershell
python -m rag.app.agent "Lúa có vết hình thoi, giữa xám tro, viền nâu thì bị gì?"
```

Chạy eval:

```powershell
python rag/eval/ragas.py
```

Ép chạy baseline heuristic:

```powershell
python rag/eval/ragas.py --force-heuristic
```

## Quality Bar

- Faithfulness >= 0.75
- Answer relevancy >= 0.75
- Context precision >= 0.65

Nếu chưa đạt, vẫn ghi kết quả thật trong `rag/eval/results.md` và phân tích nguyên nhân.

## Interface cho backend

Backend có thể gọi:

```python
from rag.app.agent import AgenticRAG

rag = AgenticRAG()
result = rag.answer_question("Cà phê có vết vàng cam ở mặt dưới lá là bệnh gì?")
```

Các field quan trọng:

- `result.answer`
- `result.citations`
- `result.confidence`
- `result.needs_human_review`

## Ghi chú an toàn

- Không bịa thuốc hoặc liều lượng.
- Nếu câu hỏi nằm ngoài cây trồng trong `/rag/data`, chuyển chuyên gia.
- Nếu câu hỏi thiếu cây trồng/triệu chứng, hỏi lại.
- Citation lấy từ file hoặc URL trong `sources.json`.
