"""Calibrate + đo ngưỡng chặn ảnh không liên quan (OOD).

Class "_khong_lien_quan" bắt được ảnh GIỐNG negative đã train. Ảnh lạ chưa từng thấy
(vệ tinh, hoá đơn, ảnh mờ...) vẫn có thể bị gán nhãn bệnh với confidence cao -> cần
thêm 1 cửa: score OOD tính từ logits của 25 class bệnh.

Score (càng CAO càng khả năng là ảnh không liên quan):
  energy   = -logsumexp(logits_benh)          (thường tốt nhất)
  msp      = 1 - max softmax(logits_benh)
  maxlogit = -max(logits_benh)
  p_irr    = softmax prob của class _khong_lien_quan

Ngưỡng chọn theo mức GIỮ LẠI ảnh bệnh (--target-keep, mặc định 0.95 = chỉ chặn oan 5%).
Calibrate trên val, báo cáo trên test.

    python eval_ood.py --ckpt runs/resnet50_ood/best.pt
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import roc_auc_score

from datamodule import (
    IRRELEVANT_CLASS,
    PlantDataset,
    build_samples,
    build_transforms,
    list_plant_classes,
)
from train import build_model
from torch.utils.data import DataLoader


@torch.no_grad()
def collect_logits(model, loader, device, amp_dtype):
    model.eval()
    logits_all, labels_all = [], []
    for x, y in loader:
        x = x.to(device, non_blocking=True, memory_format=torch.channels_last)
        with torch.autocast(device_type=device.type, dtype=amp_dtype,
                            enabled=amp_dtype is not None):
            out = model(x)
        logits_all.append(out.float().cpu())
        labels_all.append(y)
    return torch.cat(logits_all), torch.cat(labels_all)


def ood_scores(logits: torch.Tensor, irrelevant_idx: int | None) -> dict[str, np.ndarray]:
    """logits: (N, C). Trả về dict score, càng cao càng OOD."""
    if irrelevant_idx is None:
        plant_logits = logits
        p_irr = np.zeros(len(logits), dtype=np.float32)
    else:
        keep = [i for i in range(logits.shape[1]) if i != irrelevant_idx]
        plant_logits = logits[:, keep]
        p_irr = F.softmax(logits, dim=1)[:, irrelevant_idx].numpy()

    return {
        "energy": (-torch.logsumexp(plant_logits, dim=1)).numpy(),
        "msp": (1.0 - F.softmax(plant_logits, dim=1).max(dim=1).values).numpy(),
        "maxlogit": (-plant_logits.max(dim=1).values).numpy(),
        "p_irr": p_irr,
    }


def threshold_at_keep(scores_in: np.ndarray, target_keep: float) -> float:
    """Ngưỡng sao cho >= target_keep phần ảnh in-distribution KHÔNG bị chặn."""
    return float(np.quantile(scores_in, target_keep))


def summarize(scores_in: np.ndarray, scores_out: np.ndarray, thr: float) -> dict:
    y_true = np.r_[np.zeros(len(scores_in)), np.ones(len(scores_out))]
    y_score = np.r_[scores_in, scores_out]
    fpr95 = float((scores_in > np.quantile(scores_out, 0.05)).mean()) if len(scores_out) else 0.0
    return {
        "threshold": thr,
        "auroc": float(roc_auc_score(y_true, y_score)) if len(scores_out) else float("nan"),
        "ood_recall": float((scores_out > thr).mean()) if len(scores_out) else float("nan"),
        "false_reject_rate": float((scores_in > thr).mean()),
        "fpr_at_95_tpr": fpr95,
    }


def make_loader(data_root, negatives_root, split, classes, img_size, batch_size, num_workers):
    samples = build_samples(data_root, split, classes, negatives_root)
    ds = PlantDataset(samples, build_transforms(img_size, train=False), classes)
    return DataLoader(ds, batch_size=batch_size, shuffle=False, num_workers=num_workers,
                      pin_memory=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default="runs/resnet50_ood/best.pt")
    ap.add_argument("--data-root", default="../../data/dataset")
    ap.add_argument("--negatives-root", default="../../data/negatives")
    ap.add_argument("--extra-ood-dir", default="", help="thư mục ảnh lạ tự thu thập để test thêm")
    ap.add_argument("--batch-size", type=int, default=128)
    ap.add_argument("--num-workers", type=int, default=8)
    ap.add_argument("--target-keep", type=float, default=0.95)
    ap.add_argument("--score", default="energy", choices=["energy", "msp", "maxlogit", "p_irr"])
    ap.add_argument("--out", default="", help="mặc định: cạnh ckpt -> ood_threshold.json")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    resolve = lambda p: Path(p) if Path(p).is_absolute() else (here / p).resolve()
    ckpt_path = resolve(args.ckpt)
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)

    classes = ckpt["classes"]
    irrelevant_idx = ckpt.get("irrelevant_index")
    img_size = ckpt.get("img_size", 224)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    amp_dtype = (torch.bfloat16 if device.type == "cuda" and torch.cuda.is_bf16_supported()
                 else (torch.float16 if device.type == "cuda" else None))

    model = build_model(ckpt["arch"], len(classes), pretrained=False)
    model.load_state_dict(ckpt["model"])
    model = model.to(device, memory_format=torch.channels_last)

    data_root = resolve(args.data_root)
    neg_root = resolve(args.negatives_root) if args.negatives_root else None

    results: dict[str, dict] = {}
    thresholds: dict[str, float] = {}

    for split in ("val", "test"):
        loader = make_loader(data_root, neg_root, split, classes, img_size,
                            args.batch_size, args.num_workers)
        logits, labels = collect_logits(model, loader, device, amp_dtype)
        scores = ood_scores(logits, irrelevant_idx)
        is_ood = (labels == irrelevant_idx).numpy() if irrelevant_idx is not None \
            else np.zeros(len(labels), dtype=bool)

        split_res = {}
        for name, s in scores.items():
            s_in, s_out = s[~is_ood], s[is_ood]
            if split == "val":
                thresholds[name] = threshold_at_keep(s_in, args.target_keep)
            split_res[name] = summarize(s_in, s_out, thresholds[name])

        # accuracy 25-class chỉ trên ảnh bệnh, sau khi bỏ ảnh bị chặn
        thr = thresholds[args.score]
        keep = torch.from_numpy(~is_ood & (scores[args.score] <= thr))
        if irrelevant_idx is not None:
            plant_cols = [i for i in range(logits.shape[1]) if i != irrelevant_idx]
            preds = logits[:, plant_cols].argmax(1)
            preds = torch.tensor([plant_cols[p] for p in preds])
        else:
            preds = logits.argmax(1)
        acc_kept = float((preds[keep] == labels[keep]).float().mean()) if keep.any() \
            else float("nan")
        results[split] = {
            "n_benh": int((~is_ood).sum()),
            "n_ood": int(is_ood.sum()),
            "scores": split_res,
            "accuracy_25class_sau_khi_chan": acc_kept,
        }

        print(f"\n=== {split} (n_benh={int((~is_ood).sum())}, n_ood={int(is_ood.sum())}) ===")
        print(f"{'score':10s} {'thr':>9s} {'AUROC':>7s} {'OOD recall':>11s} "
              f"{'chặn oan':>9s} {'FPR@95':>7s}")
        for name, m in split_res.items():
            print(f"{name:10s} {m['threshold']:9.3f} {m['auroc']:7.4f} "
                  f"{m['ood_recall']:11.4f} {m['false_reject_rate']:9.4f} "
                  f"{m['fpr_at_95_tpr']:7.4f}")
        print(f"acc 25-class trên ảnh bệnh được giữ lại ({args.score}): {acc_kept:.4f}")

    # OOD ngoài phân phối negative đã train (test khó nhất)
    if args.extra_ood_dir:
        extra_dir = Path(args.extra_ood_dir)
        from datamodule import list_images

        files = list_images(extra_dir)
        if files:
            ds = PlantDataset([(p, 0) for p in files],
                              build_transforms(img_size, train=False), classes)
            loader = DataLoader(ds, batch_size=args.batch_size, shuffle=False,
                                num_workers=args.num_workers)
            logits, _ = collect_logits(model, loader, device, amp_dtype)
            scores = ood_scores(logits, irrelevant_idx)
            extra = {n: float((s > thresholds[n]).mean()) for n, s in scores.items()}
            results["extra_ood_dir"] = {"n": len(files), "detect_rate": extra}
            print(f"\n=== extra OOD ({len(files)} ảnh từ {extra_dir}) ===")
            for n, r in extra.items():
                print(f"{n:10s} phát hiện {r:.4f}")

    out_path = resolve(args.out) if args.out else ckpt_path.parent / "ood_threshold.json"
    payload = {
        "ckpt": str(ckpt_path),
        "classes": classes,
        "irrelevant_index": irrelevant_idx,
        "img_size": img_size,
        "score": args.score,
        "target_keep": args.target_keep,
        "thresholds": thresholds,
        "metrics": results,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[ood] ngưỡng đã lưu: {out_path}")
    print(f"[ood] dùng: python predict.py --ckpt {ckpt_path} --threshold-file {out_path} "
          "--input <ảnh|thư_mục>")


if __name__ == "__main__":
    main()
