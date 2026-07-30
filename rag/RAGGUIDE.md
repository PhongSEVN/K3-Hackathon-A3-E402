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
│   ├── chroma_retriever.py
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
├── requirements.txt
└── vectorstore/
    ├── chunks.jsonl
    ├── manifest.json
    └── chroma/            # persistent ChromaDB store (gitignored, rebuild with --chroma)
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

## Vector database thật (ChromaDB)

Mặc định retriever là BM25-lite trên `chunks.jsonl` (không cần mạng, không tốn phí). Có thể chuyển sang **ChromaDB** (persistent, embedding bằng OpenAI) song song, chọn qua flag `--backend`.

Cài dependency:

```powershell
pip install -r rag/requirements.txt
```

Cần `API_KEY` hợp lệ trong `.env` ở root repo (đã dùng sẵn cho chat completion trong `agent.py`) — embedding cũng gọi qua endpoint OpenAI nên cần mạng.

Build Chroma collection (persist tại `rag/vectorstore/chroma/`):

```powershell
python rag/ingest/ingest.py --chroma
```

Hỏi bằng Chroma thay vì BM25:

```powershell
python -m rag.app.agent "Cà phê bị rỉ sắt thì xử lý sao?" --backend chroma
```

So sánh với BM25 mặc định (không cần flag):

```powershell
python -m rag.app.agent "Cà phê bị rỉ sắt thì xử lý sao?"
```

Lưu ý:

- `ChromaRetriever` lọc bỏ chunk có độ tương đồng dưới ngưỡng (`min_score`, mặc định 0.35) để giữ đúng hành vi "câu hỏi ngoài phạm vi dữ liệu → không tự bịa, chuyển fallback an toàn" giống BM25.
- Eval RAGAS (`rag/eval/ragas.py`) hiện vẫn chạy trên backend BM25 mặc định để giữ `results.md` so sánh được qua thời gian; chưa wire sang Chroma.
- Thư mục `rag/vectorstore/chroma/` không commit git (đã thêm vào `.gitignore`), build lại bất cứ lúc nào bằng lệnh `--chroma` ở trên.

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
