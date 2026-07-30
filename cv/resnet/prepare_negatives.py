"""Tải + build tập ảnh NEGATIVE (ảnh không liên quan tới bệnh cây trồng).

Nguồn (đều tải trực tiếp, không cần đăng nhập):
  imagenette  ~325MB / 13k ảnh  - 10 class ImageNet (cá, chó, nhà thờ, kèn, xe rác...)
  coco        ~780MB / 5k  ảnh  - ảnh đời thường: người, phòng, đồ vật, đường phố
  dtd         ~600MB / 5.6k ảnh - texture thuần (negative KHÓ, dễ nhầm với ảnh lá zoom)

Kết quả:  <out>/{train,val,test}/*.jpg

Dùng:
    python prepare_negatives.py --out ../../data/negatives --sources imagenette coco
    python prepare_negatives.py --out ../../data/negatives --sources imagenette coco dtd \
        --extra-dir /path/anh_rac_tu_thu_cong
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

# Console Windows mặc định cp1258 -> log tiếng Việt vỡ
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

SOURCES = {
    "imagenette": {
        "url": "https://s3.amazonaws.com/fast-ai-imageclas/imagenette2-320.tgz",
        "archive": "imagenette2-320.tgz",
    },
    "coco": {
        "url": "http://images.cocodataset.org/zips/val2017.zip",
        "archive": "coco_val2017.zip",
    },
    "dtd": {
        "url": "https://www.robots.ox.ac.uk/~vgg/data/dtd/download/dtd-r1.0.1.tar.gz",
        "archive": "dtd-r1.0.1.tar.gz",
    },
}

# DTD có texture rất giống thực vật -> loại để negative không "đá" vào in-distribution
DTD_PLANTLIKE = {"lacelike", "veined", "grooved", "fibrous", "meshed", "honeycombed"}


def _download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[negatives] đã có {dest.name}, bỏ qua tải")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"[negatives] tải {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")

    def hook(block, block_size, total):
        if total > 0 and block % 200 == 0:
            done = block * block_size / total * 100
            print(f"\r  {min(done, 100):5.1f}%", end="", flush=True)

    urllib.request.urlretrieve(url, tmp, reporthook=hook)
    print()
    tmp.rename(dest)
    return dest


def _extract(archive: Path, into: Path) -> Path:
    marker = into / ".extracted"
    if marker.exists():
        print(f"[negatives] đã giải nén {archive.name}")
        return into
    into.mkdir(parents=True, exist_ok=True)
    print(f"[negatives] giải nén {archive.name}")
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as z:
            z.extractall(into)
    else:
        with tarfile.open(archive) as t:
            t.extractall(into)
    marker.touch()
    return into


def collect_source(name: str, cache: Path) -> list[Path]:
    spec = SOURCES[name]
    archive = _download(spec["url"], cache / spec["archive"])
    root = _extract(archive, cache / name)
    files = [p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTS]
    if name == "dtd":
        files = [p for p in files if p.parent.name not in DTD_PLANTLIKE]
    print(f"[negatives] {name}: {len(files)} ảnh")
    return files


def is_usable(path: Path, min_side: int) -> bool:
    try:
        with Image.open(path) as im:
            w, h = im.size
            if min(w, h) < min_side:
                return False
            im.convert("RGB")
        return True
    except Exception:
        return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../../data/negatives", help="thư mục output")
    ap.add_argument("--cache", default="../../data/_negatives_cache", help="nơi lưu file tải về")
    ap.add_argument(
        "--sources", nargs="+", default=["imagenette", "coco"], choices=list(SOURCES)
    )
    ap.add_argument("--extra-dir", nargs="*", default=[], help="thư mục ảnh negative tự thu thập")
    ap.add_argument("--total", type=int, default=6000, help="tổng số ảnh negative giữ lại")
    ap.add_argument("--split", nargs=3, type=float, default=[0.7, 0.2, 0.1],
                    help="tỉ lệ train val test")
    ap.add_argument("--min-side", type=int, default=64)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--keep-cache", action="store_true", help="không xoá file nén sau khi xong")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    out = (here / args.out).resolve() if not Path(args.out).is_absolute() else Path(args.out)
    cache = (here / args.cache).resolve() if not Path(args.cache).is_absolute() else Path(args.cache)
    rng = random.Random(args.seed)

    pool: list[Path] = []
    for name in args.sources:
        pool += collect_source(name, cache)
    for d in args.extra_dir:
        extra = [p for p in Path(d).rglob("*") if p.suffix.lower() in IMG_EXTS]
        print(f"[negatives] extra {d}: {len(extra)} ảnh")
        pool += extra

    rng.shuffle(pool)

    # lọc ảnh hỏng / quá nhỏ, dừng khi đủ số lượng
    kept: list[Path] = []
    for p in pool:
        if len(kept) >= args.total:
            break
        if is_usable(p, args.min_side):
            kept.append(p)
    print(f"[negatives] giữ {len(kept)}/{args.total} ảnh sau khi lọc")

    r_tr, r_va, _ = args.split
    n_tr = int(len(kept) * r_tr)
    n_va = int(len(kept) * r_va)
    parts = {"train": kept[:n_tr], "val": kept[n_tr : n_tr + n_va], "test": kept[n_tr + n_va :]}

    for split, files in parts.items():
        dst_dir = out / split
        if dst_dir.exists():
            shutil.rmtree(dst_dir)
        dst_dir.mkdir(parents=True, exist_ok=True)
        for i, src in enumerate(files):
            shutil.copy2(src, dst_dir / f"{split}_{i:06d}{src.suffix.lower()}")
        print(f"[negatives] {split}: {len(files)} ảnh -> {dst_dir}")

    if not args.keep_cache:
        for spec in SOURCES.values():
            f = cache / spec["archive"]
            if f.exists():
                f.unlink()
        print("[negatives] đã xoá file nén (dùng --keep-cache để giữ)")

    print(f"[negatives] xong. Truyền --negatives-root {out} cho train.py")


if __name__ == "__main__":
    main()
