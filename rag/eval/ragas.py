from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import asdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag.app.agent import AgenticRAG  # noqa: E402
from rag.app.rag_pipeline import tokenize  # noqa: E402


GOLDEN_PATH = ROOT / "eval" / "golden_set.jsonl"
RESULTS_CSV = ROOT / "eval" / "results.csv"
RESULTS_MD = ROOT / "eval" / "results.md"


def load_golden(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def overlap_score(expected: list[str], actual: str) -> float:
    if not expected:
        return 1.0
    actual_terms = set(tokenize(actual))
    hits = 0
    for item in expected:
        terms = set(tokenize(item))
        if terms and len(terms & actual_terms) / len(terms) >= 0.5:
            hits += 1
    return hits / len(expected)


def source_score(expected_sources: list[str], result_sources: list[str]) -> float:
    if not expected_sources:
        return 1.0
    haystack = " ".join(result_sources).lower()
    hits = sum(1 for source in expected_sources if source.lower() in haystack)
    return hits / len(expected_sources)


def heuristic_eval(cases: list[dict], agent: AgenticRAG) -> list[dict]:
    rows = []
    for case in cases:
        result = agent.answer_question(case["question"])
        sources = [citation.relative_path for citation in result.citations] + [
            url for citation in result.citations for url in citation.source_urls
        ]
        answer = result.answer
        expected_points = case.get("expected_points", [])
        row = {
            "id": case["id"],
            "question": case["question"],
            "difficulty": case.get("difficulty", ""),
            "expected_behavior": case.get("expected_behavior", "answer"),
            "answer_relevancy": round(overlap_score(expected_points, answer), 3),
            "context_precision": round(source_score(case.get("expected_sources", []), sources), 3),
            "faithfulness": round(1.0 if result.citations or result.needs_human_review else 0.0, 3),
            "confidence": result.confidence,
            "needs_human_review": result.needs_human_review,
            "answer": answer,
            "sources": " | ".join(sources),
        }
        rows.append(row)
    return rows


def try_ragas_eval(cases: list[dict], agent: AgenticRAG) -> list[dict] | None:
    try:
        from datasets import Dataset  # type: ignore
        from ragas import evaluate  # type: ignore
        from ragas.metrics import answer_relevancy, context_precision, faithfulness  # type: ignore
    except Exception:
        return None

    answers = []
    contexts = []
    questions = []
    ground_truths = []
    raw_results = []
    for case in cases:
        result = agent.answer_question(case["question"])
        raw_results.append(result)
        questions.append(case["question"])
        answers.append(result.answer)
        contexts.append([item.text for item in result.contexts])
        ground_truths.append("; ".join(case.get("expected_points", [])))

    dataset = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        }
    )
    scores = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision]).to_pandas()
    rows = []
    for index, case in enumerate(cases):
        result = raw_results[index]
        rows.append(
            {
                "id": case["id"],
                "question": case["question"],
                "difficulty": case.get("difficulty", ""),
                "expected_behavior": case.get("expected_behavior", "answer"),
                "answer_relevancy": round(float(scores.loc[index, "answer_relevancy"]), 3),
                "context_precision": round(float(scores.loc[index, "context_precision"]), 3),
                "faithfulness": round(float(scores.loc[index, "faithfulness"]), 3),
                "confidence": result.confidence,
                "needs_human_review": result.needs_human_review,
                "answer": result.answer,
                "sources": " | ".join(citation.relative_path for citation in result.citations),
            }
        )
    return rows


def write_results(rows: list[dict], csv_path: Path, md_path: Path, mode: str) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "id",
        "question",
        "difficulty",
        "expected_behavior",
        "answer_relevancy",
        "context_precision",
        "faithfulness",
        "confidence",
        "needs_human_review",
        "sources",
        "answer",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    averages = {
        "answer_relevancy": sum(row["answer_relevancy"] for row in rows) / len(rows),
        "context_precision": sum(row["context_precision"] for row in rows) / len(rows),
        "faithfulness": sum(row["faithfulness"] for row in rows) / len(rows),
    }
    lines = [
        "# RAG Eval Results",
        "",
        f"- Mode: {mode}",
        f"- Cases: {len(rows)}",
        f"- Quality bar: faithfulness >= 0.75, answer_relevancy >= 0.75, context_precision >= 0.65",
        f"- Avg faithfulness: {averages['faithfulness']:.3f}",
        f"- Avg answer_relevancy: {averages['answer_relevancy']:.3f}",
        f"- Avg context_precision: {averages['context_precision']:.3f}",
        "",
        "| id | relevancy | context precision | faithfulness | human review |",
        "|---|---:|---:|---:|---|",
    ]
    for row in rows:
        lines.append(
            f"| {row['id']} | {row['answer_relevancy']} | {row['context_precision']} | "
            f"{row['faithfulness']} | {row['needs_human_review']} |"
        )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Run RAGAS eval when installed, otherwise baseline eval.")
    parser.add_argument("--golden", type=Path, default=GOLDEN_PATH)
    parser.add_argument("--csv", type=Path, default=RESULTS_CSV)
    parser.add_argument("--md", type=Path, default=RESULTS_MD)
    parser.add_argument("--force-heuristic", action="store_true")
    parser.add_argument(
        "--backend",
        choices=["bm25", "chroma", "hybrid"],
        default="bm25",
        help="Retriever backend to eval. bm25 stays the eval default for quick iteration; "
        "hybrid (dense + BM25 via RRF + cross-encoder rerank) is what rag_client.py wires "
        "into production — pass --backend hybrid to eval what users actually get.",
    )
    args = parser.parse_args()

    cases = load_golden(args.golden)
    retriever = None
    if args.backend == "chroma":
        from rag.app.chroma_retriever import ChromaRetriever

        retriever = ChromaRetriever()
    elif args.backend == "hybrid":
        from rag.app.hybrid_retriever import HybridRetriever

        retriever = HybridRetriever()
    agent = AgenticRAG(retriever=retriever, use_llm=not args.force_heuristic)
    rows = None if args.force_heuristic else try_ragas_eval(cases, agent)
    mode = "ragas" if rows is not None else "heuristic-fallback"
    if rows is None:
        rows = heuristic_eval(cases, agent)
    write_results(rows, args.csv, args.md, mode)
    print(f"Wrote {len(rows)} eval rows with {mode}: {args.csv}")


if __name__ == "__main__":
    main()
