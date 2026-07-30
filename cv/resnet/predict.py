"""Inference: phân loại bệnh + chặn ảnh không liên quan.

Luật quyết định (2 cửa):
  1. argmax == _khong_lien_quan            -> reject (reason=irrelevant_class)
  2. score OOD > ngưỡng calibrate           -> reject (reason=ood_score)
  còn lại                                   -> trả class bệnh + confidence

    python predict.py --ckpt runs/resnet50_ood/best.pt \
                      --threshold-file runs/resnet50_ood/ood_threshold.json \
                      --input ../../data/dataset/test/Lua_khoe_manh --json out.json

Dùng như module (cho backend FastAPI):
    from predict import PlantClassifier
    clf = PlantClassifier("runs/resnet50_ood/best.pt", "runs/resnet50_ood/ood_threshold.json")
    clf.predict_path("anh.jpg")   -> dict
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
import torch.nn.functional as F
from PIL import Image, ImageFile

from datamodule import IRRELEVANT_CLASS, build_transforms, list_images
from eval_ood import ood_scores
from train import build_model

ImageFile.LOAD_TRUNCATED_IMAGES = True


class PlantClassifier:
    def __init__(
        self,
        ckpt_path: str | Path,
        threshold_file: str | Path | None = None,
        device: str | None = None,
        score: str | None = None,
    ):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        ckpt = torch.load(Path(ckpt_path), map_location="cpu", weights_only=False)
        self.classes: list[str] = ckpt["classes"]
        self.irrelevant_idx = ckpt.get("irrelevant_index")
        self.img_size = ckpt.get("img_size", 224)
        self.model = build_model(ckpt["arch"], len(self.classes), pretrained=False)
        self.model.load_state_dict(ckpt["model"])
        self.model.eval().to(self.device, memory_format=torch.channels_last)
        self.transform = build_transforms(self.img_size, train=False)

        self.score_name, self.threshold = "energy", None
        if threshold_file:
            cfg = json.loads(Path(threshold_file).read_text(encoding="utf-8"))
            self.score_name = score or cfg.get("score", "energy")
            self.threshold = cfg["thresholds"][self.score_name]
        elif score:
            self.score_name = score

    @torch.no_grad()
    def predict_batch(self, images: list[Image.Image]) -> list[dict]:
        x = torch.stack([self.transform(im.convert("RGB")) for im in images])
        x = x.to(self.device, memory_format=torch.channels_last)
        logits = self.model(x).float().cpu()
        scores = ood_scores(logits, self.irrelevant_idx)[self.score_name]
        probs = F.softmax(logits, dim=1)

        plant_cols = [
            i for i in range(len(self.classes))
            if self.irrelevant_idx is None or i != self.irrelevant_idx
        ]
        out = []
        for i in range(len(images)):
            top_all = int(probs[i].argmax())
            plant_probs = probs[i][plant_cols]
            top_plant = plant_cols[int(plant_probs.argmax())]
            score = float(scores[i])

            reject_reason = None
            if self.irrelevant_idx is not None and top_all == self.irrelevant_idx:
                reject_reason = "irrelevant_class"
            elif self.threshold is not None and score > self.threshold:
                reject_reason = "ood_score"

            k = min(3, len(plant_cols))
            topk = torch.topk(plant_probs, k)
            out.append({
                "is_relevant": reject_reason is None,
                "reject_reason": reject_reason,
                "label": IRRELEVANT_CLASS if reject_reason else self.classes[top_plant],
                "confidence": float(probs[i][top_plant]),
                "ood_score": {"name": self.score_name, "value": score,
                              "threshold": self.threshold},
                "top3": [
                    {"label": self.classes[plant_cols[int(j)]], "prob": float(v)}
                    for v, j in zip(topk.values, topk.indices)
                ],
            })
        return out

    def predict_path(self, path: str | Path) -> dict:
        with Image.open(path) as im:
            res = self.predict_batch([im.copy()])[0]
        res["path"] = str(path)
        return res


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default="runs/resnet50_ood/best.pt")
    ap.add_argument("--threshold-file", default="runs/resnet50_ood/ood_threshold.json")
    ap.add_argument("--input", required=True, help="1 ảnh hoặc 1 thư mục")
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--json", default="", help="ghi kết quả ra file JSON")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    resolve = lambda p: Path(p) if Path(p).is_absolute() else (here / p).resolve()
    thr_file = resolve(args.threshold_file)
    clf = PlantClassifier(resolve(args.ckpt), thr_file if thr_file.exists() else None)
    if not thr_file.exists():
        print(f"[predict] không thấy {thr_file} -> chỉ dùng class _khong_lien_quan, "
              "không có cửa OOD score")

    target = Path(args.input)
    files = [target] if target.is_file() else list_images(target)
    print(f"[predict] {len(files)} ảnh | score={clf.score_name} thr={clf.threshold}")

    results: list[dict] = []
    for i in range(0, len(files), args.batch_size):
        chunk = files[i : i + args.batch_size]
        images, ok = [], []
        for p in chunk:
            try:
                with Image.open(p) as im:
                    images.append(im.copy())
                ok.append(p)
            except Exception as exc:
                results.append({"path": str(p), "error": str(exc)[:120]})
        if images:
            for p, r in zip(ok, clf.predict_batch(images)):
                r["path"] = str(p)
                results.append(r)

    rejected = sum(1 for r in results if r.get("is_relevant") is False)
    for r in results[:20]:
        if "error" in r:
            print(f"  LỖI      {Path(r['path']).name}: {r['error']}")
        elif r["is_relevant"]:
            print(f"  OK       {Path(r['path']).name}: {r['label']} "
                  f"({r['confidence']:.3f}) score={r['ood_score']['value']:.2f}")
        else:
            print(f"  CHẶN     {Path(r['path']).name}: {r['reject_reason']} "
                  f"score={r['ood_score']['value']:.2f}")
    if len(results) > 20:
        print(f"  ... còn {len(results) - 20} ảnh")
    print(f"[predict] chặn {rejected}/{len(results)} ảnh")

    if args.json:
        out = resolve(args.json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[predict] đã ghi {out}")


if __name__ == "__main__":
    main()
