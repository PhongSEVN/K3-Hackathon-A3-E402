"""Lọc ảnh xấu trong data/dataset trước khi train.

Phát hiện:
  corrupt   - không decode được / cắt dở
  tiny      - cạnh nhỏ nhất < --min-side
  flat      - độ lệch chuẩn pixel gần 0 (ảnh trắng/đen/trơn)
  exact_dup - trùng byte (md5)
  near_dup  - trùng nội dung (dhash 64 bit, hamming <= --hamming)

Mặc định DRY-RUN: chỉ ghi báo cáo CSV, không xoá gì.
Thêm --apply để MOVE file xấu sang --quarantine (không xoá vĩnh viễn).

    python clean_data.py --root ../../data/dataset
    python clean_data.py --root ../../data/dataset --apply
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Console Windows mặc định cp1258 -> log tiếng Việt vỡ
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def md5(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def dhash(img: Image.Image, size: int = 8) -> int:
    """Difference hash: so sánh pixel kề nhau theo hàng -> 64 bit."""
    g = np.asarray(img.convert("L").resize((size + 1, size), Image.BILINEAR), dtype=np.int16)
    bits = (g[:, 1:] > g[:, :-1]).flatten()
    out = 0
    for b in bits:
        out = (out << 1) | int(b)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="../../data/dataset")
    ap.add_argument("--report", default="./reports/data_quality.csv")
    ap.add_argument("--quarantine", default="../../data/_rejected")
    ap.add_argument("--min-side", type=int, default=48)
    ap.add_argument("--flat-std", type=float, default=3.0)
    ap.add_argument("--hamming", type=int, default=4, help="0 = tắt near-dup")
    ap.add_argument("--apply", action="store_true", help="move file xấu sang quarantine")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    resolve = lambda p: Path(p) if Path(p).is_absolute() else (here / p).resolve()
    root, report, quarantine = resolve(args.root), resolve(args.report), resolve(args.quarantine)

    files = sorted(p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTS)
    print(f"[clean] quét {len(files)} ảnh trong {root}")

    bad: list[tuple[Path, str, str]] = []  # (path, reason, detail)
    seen_md5: dict[str, Path] = {}
    hashes: list[tuple[int, Path]] = []

    for i, p in enumerate(files, 1):
        if i % 2000 == 0:
            print(f"  {i}/{len(files)}")
        try:
            with Image.open(p) as im:
                img = im.convert("RGB")
                w, h = img.size
        except Exception as exc:
            bad.append((p, "corrupt", str(exc)[:120]))
            continue

        if min(w, h) < args.min_side:
            bad.append((p, "tiny", f"{w}x{h}"))
            continue

        arr = np.asarray(img.resize((64, 64)), dtype=np.float32)
        if arr.std() < args.flat_std:
            bad.append((p, "flat", f"std={arr.std():.2f}"))
            continue

        digest = md5(p)
        if digest in seen_md5:
            bad.append((p, "exact_dup", str(seen_md5[digest].relative_to(root))))
            continue
        seen_md5[digest] = p

        if args.hamming > 0:
            hashes.append((dhash(img), p))

    # near-dup: chỉ so trong cùng class để tránh O(n^2) toàn bộ dataset
    if args.hamming > 0:
        by_class: dict[Path, list[tuple[int, Path]]] = defaultdict(list)
        for hv, p in hashes:
            by_class[p.parent].append((hv, p))
        for group in by_class.values():
            keepers: list[tuple[int, Path]] = []
            for hv, p in group:
                dup_of = next(
                    (kp for kh, kp in keepers if bin(kh ^ hv).count("1") <= args.hamming), None
                )
                if dup_of is not None:
                    bad.append((p, "near_dup", str(dup_of.relative_to(root))))
                else:
                    keepers.append((hv, p))

    report.parent.mkdir(parents=True, exist_ok=True)
    with open(report, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["path", "reason", "detail"])
        for p, reason, detail in bad:
            writer.writerow([str(p.relative_to(root)), reason, detail])

    counts: dict[str, int] = defaultdict(int)
    for _, reason, _ in bad:
        counts[reason] += 1
    print(f"[clean] ảnh xấu: {len(bad)}/{len(files)}")
    for reason, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {reason:10s} {n}")
    print(f"[clean] báo cáo: {report}")

    if not args.apply:
        print("[clean] DRY-RUN. Xem CSV rồi chạy lại với --apply để move file xấu.")
        return

    for p, reason, _ in bad:
        dst = quarantine / reason / p.relative_to(root)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(dst))
    print(f"[clean] đã move {len(bad)} ảnh sang {quarantine}")


if __name__ == "__main__":
    main()
