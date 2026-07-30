"""Finetune ResNet (pretrained ImageNet) cho 25 class bệnh cây trồng + 1 class ảnh không liên quan.

Sơ đồ train:
  phase 1 (--freeze-epochs): đóng băng backbone, chỉ train head -> head không phá feature ImageNet
  phase 2: mở toàn bộ, backbone lr thấp + head lr cao, cosine decay có warmup

Ví dụ (1 GPU 4090):
  python train.py --data-root ../../data/dataset \
                  --negatives-root ../../data/negatives \
                  --arch resnet50 --img-size 224 --batch-size 64 \
                  --epochs 30 --freeze-epochs 2 --out runs/resnet50_ood

Smoke test 2 phút trước khi chạy thật:
  python train.py --epochs 1 --limit-batches 20 --out runs/smoke
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from torchvision import models

from datamodule import IRRELEVANT_CLASS, make_dataloaders, save_labels, set_seed

ARCHS = {
    "resnet18": (models.resnet18, models.ResNet18_Weights.IMAGENET1K_V1),
    "resnet34": (models.resnet34, models.ResNet34_Weights.IMAGENET1K_V1),
    "resnet50": (models.resnet50, models.ResNet50_Weights.IMAGENET1K_V2),
    "resnet101": (models.resnet101, models.ResNet101_Weights.IMAGENET1K_V2),
}


# --------------------------------------------------------------------------- #
# Model
# --------------------------------------------------------------------------- #
def build_model(arch: str, num_classes: int, pretrained: bool = True, dropout: float = 0.2):
    if arch not in ARCHS:
        raise ValueError(f"arch phải thuộc {list(ARCHS)}")
    ctor, weights = ARCHS[arch]
    model = ctor(weights=weights if pretrained else None)
    in_features = model.fc.in_features
    model.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
    return model


def set_backbone_trainable(model: nn.Module, trainable: bool) -> None:
    for name, param in model.named_parameters():
        if not name.startswith("fc."):
            param.requires_grad = trainable


def param_groups(model: nn.Module, lr: float, head_lr_mult: float, weight_decay: float):
    backbone, head, no_decay = [], [], []
    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        if param.ndim <= 1:  # bias + BN -> không weight decay
            no_decay.append(param)
        elif name.startswith("fc."):
            head.append(param)
        else:
            backbone.append(param)
    return [
        {"params": backbone, "lr": lr, "weight_decay": weight_decay},
        {"params": head, "lr": lr * head_lr_mult, "weight_decay": weight_decay},
        {"params": no_decay, "lr": lr, "weight_decay": 0.0},
    ]


# --------------------------------------------------------------------------- #
# Mixup (tuỳ chọn) — giảm overfit trên class ít ảnh
# --------------------------------------------------------------------------- #
def mixup_batch(x: torch.Tensor, y: torch.Tensor, alpha: float):
    lam = float(np.random.beta(alpha, alpha))
    perm = torch.randperm(x.size(0), device=x.device)
    return lam * x + (1 - lam) * x[perm], y, y[perm], lam


# --------------------------------------------------------------------------- #
# Eval
# --------------------------------------------------------------------------- #
@torch.no_grad()
def evaluate(model, loader, device, amp_dtype, limit_batches: int | None = None):
    model.eval()
    all_logits, all_labels = [], []
    loss_sum, n = 0.0, 0
    for i, (x, y) in enumerate(loader):
        if limit_batches and i >= limit_batches:
            break
        x = x.to(device, non_blocking=True, memory_format=torch.channels_last)
        y = y.to(device, non_blocking=True)
        with torch.autocast(device_type=device.type, dtype=amp_dtype,
                            enabled=amp_dtype is not None):
            logits = model(x)
            loss = F.cross_entropy(logits, y)
        loss_sum += loss.item() * y.size(0)
        n += y.size(0)
        all_logits.append(logits.float().cpu())
        all_labels.append(y.cpu())

    logits = torch.cat(all_logits)
    labels = torch.cat(all_labels)
    preds = logits.argmax(1)
    return {
        "loss": loss_sum / max(n, 1),
        "acc": (preds == labels).float().mean().item(),
        "macro_f1": f1_score(labels, preds, average="macro", zero_division=0),
        "logits": logits,
        "labels": labels,
        "preds": preds,
    }


def reject_metrics(labels, preds, irrelevant_idx: int | None) -> dict:
    """Chất lượng của việc CHẶN ảnh không liên quan (nhìn như bài toán nhị phân)."""
    if irrelevant_idx is None:
        return {}
    y_true = (labels == irrelevant_idx).numpy()
    y_pred = (preds == irrelevant_idx).numpy()
    tp = int((y_true & y_pred).sum())
    fp = int((~y_true & y_pred).sum())
    fn = int((y_true & ~y_pred).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    return {
        "reject_precision": prec,
        "reject_recall": rec,
        "reject_f1": 2 * prec * rec / (prec + rec) if prec + rec else 0.0,
        "false_reject_rate": fp / max(int((~y_true).sum()), 1),  # ảnh bệnh bị chặn oan
    }


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_args():
    ap = argparse.ArgumentParser()
    # data
    ap.add_argument("--data-root", default="../../data/dataset")
    ap.add_argument("--negatives-root", default="../../data/negatives",
                    help='"" để train 25 class thuần, không có class ảnh-không-liên-quan')
    ap.add_argument("--max-negatives-train", type=int, default=3000)
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--num-workers", type=int, default=8)
    ap.add_argument("--sampler", default="sqrt_inverse",
                    choices=["none", "inverse", "sqrt_inverse"])
    ap.add_argument("--no-randaug", action="store_true")
    # model
    ap.add_argument("--arch", default="resnet50", choices=list(ARCHS))
    ap.add_argument("--dropout", type=float, default=0.2)
    ap.add_argument("--no-pretrained", action="store_true")
    # optim
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--freeze-epochs", type=int, default=2)
    ap.add_argument("--lr", type=float, default=3e-4,
                    help="lr backbone (head = lr * head-lr-mult)")
    ap.add_argument("--head-lr-mult", type=float, default=10.0)
    ap.add_argument("--weight-decay", type=float, default=1e-4)
    ap.add_argument("--warmup-epochs", type=float, default=1.0)
    ap.add_argument("--min-lr-ratio", type=float, default=0.01)
    ap.add_argument("--label-smoothing", type=float, default=0.1)
    ap.add_argument("--mixup", type=float, default=0.0, help="alpha, 0 = tắt")
    ap.add_argument("--clip-grad", type=float, default=1.0)
    ap.add_argument("--early-stop", type=int, default=8, help="0 = tắt")
    # runtime
    ap.add_argument("--out", default="runs/resnet50_ood")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--amp", default="auto", choices=["auto", "bf16", "fp16", "off"])
    ap.add_argument("--compile", action="store_true")
    ap.add_argument("--resume", default="", help="đường dẫn last.pt")
    ap.add_argument("--limit-batches", type=int, default=0, help="smoke test")
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    here = Path(__file__).resolve().parent
    resolve = lambda p: Path(p) if Path(p).is_absolute() else (here / p).resolve()

    out_dir = resolve(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    set_seed(args.seed)
    torch.backends.cudnn.benchmark = True
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if args.amp == "auto":
        if device.type != "cuda":
            amp_dtype = None
        elif torch.cuda.is_bf16_supported():
            amp_dtype = torch.bfloat16
        else:
            amp_dtype = torch.float16
    else:
        amp_dtype = {"bf16": torch.bfloat16, "fp16": torch.float16, "off": None}[args.amp]
    print(f"[train] device={device} amp={amp_dtype}")

    data = make_dataloaders(
        data_root=resolve(args.data_root),
        negatives_root=resolve(args.negatives_root) if args.negatives_root else None,
        img_size=args.img_size,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        sampler=args.sampler,
        max_negatives_train=args.max_negatives_train,
        randaug=not args.no_randaug,
        seed=args.seed,
    )
    classes = data.classes
    irrelevant_idx = classes.index(IRRELEVANT_CLASS) if IRRELEVANT_CLASS in classes else None
    save_labels(classes, out_dir / "labels.json")
    print(f"[train] class ít ảnh nhất: {min(data.train_counts.values())} | "
          f"nhiều nhất: {max(data.train_counts.values())}")

    model = build_model(args.arch, len(classes), not args.no_pretrained, args.dropout)
    model = model.to(device, memory_format=torch.channels_last)
    if args.compile:
        model = torch.compile(model)

    def raw(m):
        return m._orig_mod if hasattr(m, "_orig_mod") else m

    criterion = nn.CrossEntropyLoss(label_smoothing=args.label_smoothing)
    scaler = torch.amp.GradScaler(device.type, enabled=amp_dtype is torch.float16)

    steps_per_epoch = args.limit_batches or len(data.train_loader)
    total_steps = steps_per_epoch * args.epochs
    warmup_steps = int(steps_per_epoch * args.warmup_epochs)

    def lr_scale(step: int) -> float:
        if step < warmup_steps:
            return (step + 1) / max(warmup_steps, 1)
        progress = (step - warmup_steps) / max(total_steps - warmup_steps, 1)
        cos = 0.5 * (1 + math.cos(math.pi * min(progress, 1.0)))
        return args.min_lr_ratio + (1 - args.min_lr_ratio) * cos

    start_epoch, best_f1, best_epoch, global_step = 0, -1.0, -1, 0
    optimizer = None

    if args.resume:
        ckpt = torch.load(resolve(args.resume), map_location="cpu", weights_only=False)
        raw(model).load_state_dict(ckpt["model"])
        start_epoch = ckpt["epoch"] + 1
        best_f1 = ckpt.get("best_f1", -1.0)
        best_epoch = ckpt["epoch"]
        global_step = ckpt.get("global_step", 0)
        print(f"[train] resume từ epoch {start_epoch} (best_f1={best_f1:.4f})")

    history_path = out_dir / "history.csv"
    if not history_path.exists():
        with open(history_path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(
                ["epoch", "phase", "lr", "train_loss", "val_loss", "val_acc", "val_macro_f1",
                 "reject_precision", "reject_recall", "epoch_sec"]
            )

    for epoch in range(start_epoch, args.epochs):
        frozen = epoch < args.freeze_epochs
        phase = "frozen" if frozen else "full"

        # (re)build optimizer khi vào phase mới, vì tập param trainable thay đổi
        if optimizer is None or epoch == args.freeze_epochs:
            set_backbone_trainable(raw(model), trainable=not frozen)
            lr = args.lr * (3.0 if frozen else 1.0)  # phase frozen chịu được lr lớn hơn
            optimizer = torch.optim.AdamW(
                param_groups(raw(model), lr, args.head_lr_mult, args.weight_decay)
            )
            n_train = sum(p.numel() for p in model.parameters() if p.requires_grad)
            print(f"[train] epoch {epoch}: phase={phase} trainable={n_train:,} params")

        model.train()
        t0 = time.time()
        run_loss, seen = 0.0, 0
        base_lrs = [g["lr"] for g in optimizer.param_groups]

        for i, (x, y) in enumerate(data.train_loader):
            if args.limit_batches and i >= args.limit_batches:
                break
            scale = lr_scale(global_step)
            for g, base in zip(optimizer.param_groups, base_lrs):
                g["lr"] = base * scale

            x = x.to(device, non_blocking=True, memory_format=torch.channels_last)
            y = y.to(device, non_blocking=True)

            with torch.autocast(device_type=device.type, dtype=amp_dtype,
                                enabled=amp_dtype is not None):
                if args.mixup > 0:
                    xm, ya, yb, lam = mixup_batch(x, y, args.mixup)
                    logits = model(xm)
                    loss = lam * criterion(logits, ya) + (1 - lam) * criterion(logits, yb)
                else:
                    logits = model(x)
                    loss = criterion(logits, y)

            optimizer.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            if args.clip_grad > 0:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), args.clip_grad)
            scaler.step(optimizer)
            scaler.update()

            run_loss += loss.item() * y.size(0)
            seen += y.size(0)
            global_step += 1
            if i % 50 == 0:
                print(f"  e{epoch} [{i}/{steps_per_epoch}] loss={run_loss/max(seen,1):.4f} "
                      f"lr={optimizer.param_groups[0]['lr']:.2e}")

        train_loss = run_loss / max(seen, 1)
        val = evaluate(model, data.val_loader, device, amp_dtype, args.limit_batches or None)
        rej = reject_metrics(val["labels"], val["preds"], irrelevant_idx)
        dt = time.time() - t0
        print(f"[train] epoch {epoch} ({phase}) {dt:.0f}s train_loss={train_loss:.4f} "
              f"val_loss={val['loss']:.4f} val_acc={val['acc']:.4f} "
              f"val_macroF1={val['macro_f1']:.4f}"
              + (f" reject_P={rej['reject_precision']:.3f}/R={rej['reject_recall']:.3f}"
                 if rej else ""))

        with open(history_path, "a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow([
                epoch, phase, f"{optimizer.param_groups[0]['lr']:.3e}",
                f"{train_loss:.5f}", f"{val['loss']:.5f}", f"{val['acc']:.5f}",
                f"{val['macro_f1']:.5f}",
                f"{rej['reject_precision']:.5f}" if rej else "",
                f"{rej['reject_recall']:.5f}" if rej else "",
                f"{dt:.1f}",
            ])

        state = {
            "model": raw(model).state_dict(),
            "epoch": epoch,
            "best_f1": max(best_f1, val["macro_f1"]),
            "global_step": global_step,
            "classes": classes,
            "arch": args.arch,
            "img_size": args.img_size,
            "irrelevant_index": irrelevant_idx,
            "args": vars(args),
        }
        torch.save(state, out_dir / "last.pt")
        if val["macro_f1"] > best_f1:
            best_f1, best_epoch = val["macro_f1"], epoch
            torch.save(state, out_dir / "best.pt")
            print(f"[train] * best mới: macro_f1={best_f1:.4f} (epoch {epoch})")
        elif args.early_stop and epoch - best_epoch >= args.early_stop:
            print(f"[train] early stop: {args.early_stop} epoch không cải thiện")
            break

    # ------------------------------------------------------------------ test #
    print("\n[train] eval tập test với best.pt")
    best = torch.load(out_dir / "best.pt", map_location="cpu", weights_only=False)
    raw(model).load_state_dict(best["model"])
    test = evaluate(model, data.test_loader, device, amp_dtype, args.limit_batches or None)
    rej = reject_metrics(test["labels"], test["preds"], irrelevant_idx)

    all_labels = list(range(len(classes)))
    report = classification_report(
        test["labels"], test["preds"], labels=all_labels, target_names=classes,
        zero_division=0, output_dict=True,
    )
    summary = {
        "best_epoch": best["epoch"],
        "test_acc": test["acc"],
        "test_macro_f1": test["macro_f1"],
        **rej,
        "per_class": report,
    }
    (out_dir / "test_report.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    np.savetxt(
        out_dir / "confusion_matrix.csv",
        confusion_matrix(test["labels"], test["preds"], labels=all_labels),
        fmt="%d",
        delimiter=",",
    )
    print(classification_report(test["labels"], test["preds"], labels=all_labels,
                                target_names=classes, zero_division=0, digits=3))
    print(f"[train] test_acc={test['acc']:.4f} test_macro_f1={test['macro_f1']:.4f}")
    if rej:
        print(f"[train] chặn ảnh không liên quan: P={rej['reject_precision']:.3f} "
              f"R={rej['reject_recall']:.3f} chặn oan={rej['false_reject_rate']:.3f}")
    print(f"[train] xong. Artifacts trong {out_dir}")
    print(f"[train] bước tiếp: python eval_ood.py --ckpt {out_dir / 'best.pt'}")


if __name__ == "__main__":
    main()
