"""Dataset / transform / dataloader cho bài toán:

    25 class bệnh cây trồng  +  1 class "_khong_lien_quan" (ảnh không liên quan)

Ảnh bệnh nằm ở  data/dataset/{train,val,test}/<ten_class>/*.jpg
Ảnh negative nằm ở data/negatives/{train,val,test}/*.jpg  (xem prepare_negatives.py)

Class negative luôn được gán index CUỐI CÙNG để index của 25 class bệnh
không đổi khi bật/tắt negative.
"""

from __future__ import annotations

import json
import random
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image, ImageFile
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms

# Ảnh trong dataset gốc có file bị cắt dở -> cho PIL đọc tiếp thay vì raise
ImageFile.LOAD_TRUNCATED_IMAGES = True

# Console Windows mặc định cp1258 -> log tiếng Việt vỡ. Mọi script đều import module này.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

IRRELEVANT_CLASS = "_khong_lien_quan"
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


# --------------------------------------------------------------------------- #
# Liệt kê file
# --------------------------------------------------------------------------- #
def list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() in IMG_EXTS)


def list_plant_classes(data_root: Path, split: str = "train") -> list[str]:
    """Tên 25 class bệnh, lấy từ tên thư mục con của split."""
    split_dir = Path(data_root) / split
    if not split_dir.is_dir():
        raise FileNotFoundError(f"Không thấy {split_dir}")
    return sorted(d.name for d in split_dir.iterdir() if d.is_dir() and not d.name.startswith("_"))


def build_samples(
    data_root: Path,
    split: str,
    classes: list[str],
    negatives_root: Path | None = None,
    max_negatives: int | None = None,
    seed: int = 42,
) -> list[tuple[Path, int]]:
    """Trả về list (đường_dẫn_ảnh, label_index)."""
    data_root = Path(data_root)
    samples: list[tuple[Path, int]] = []

    for idx, name in enumerate(classes):
        if name == IRRELEVANT_CLASS:
            continue
        for p in list_images(data_root / split / name):
            samples.append((p, idx))

    if negatives_root is not None and IRRELEVANT_CLASS in classes:
        neg_idx = classes.index(IRRELEVANT_CLASS)
        negs = list_images(Path(negatives_root) / split)
        if max_negatives is not None and len(negs) > max_negatives:
            rng = random.Random(seed)
            negs = rng.sample(negs, max_negatives)
        samples.extend((p, neg_idx) for p in negs)

    return samples


# --------------------------------------------------------------------------- #
# Dataset
# --------------------------------------------------------------------------- #
class PlantDataset(Dataset):
    """Đọc từ list (path, label). Ảnh lỗi decode -> thay bằng sample khác, log 1 lần."""

    def __init__(self, samples: list[tuple[Path, int]], transform, classes: list[str]):
        self.samples = samples
        self.transform = transform
        self.classes = classes
        self._bad: set[str] = set()

    def __len__(self) -> int:
        return len(self.samples)

    def class_counts(self) -> Counter:
        return Counter(label for _, label in self.samples)

    def __getitem__(self, idx: int):
        for offset in range(len(self.samples)):
            path, label = self.samples[(idx + offset) % len(self.samples)]
            try:
                with Image.open(path) as im:
                    img = im.convert("RGB")
                return self.transform(img), label
            except Exception as exc:  # file hỏng / không decode được
                key = str(path)
                if key not in self._bad:
                    self._bad.add(key)
                    print(f"[datamodule] bỏ qua ảnh lỗi: {path} ({exc})")
        raise RuntimeError("Không đọc được bất kỳ ảnh nào trong dataset")


# --------------------------------------------------------------------------- #
# Transform
# --------------------------------------------------------------------------- #
def build_transforms(img_size: int = 224, train: bool = True, randaug: bool = True):
    if not train:
        resize = int(img_size / 0.875)  # 224 -> 256
        return transforms.Compose(
            [
                transforms.Resize(resize),
                transforms.CenterCrop(img_size),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            ]
        )

    ops = [
        transforms.RandomResizedCrop(img_size, scale=(0.55, 1.0), ratio=(0.75, 1.33)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.2),  # ảnh lá không có chiều "đúng"
    ]
    if randaug:
        ops.append(transforms.RandAugment(num_ops=2, magnitude=7))
    ops += [
        transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25, hue=0.03),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),
    ]
    return transforms.Compose(ops)


# --------------------------------------------------------------------------- #
# Loader
# --------------------------------------------------------------------------- #
@dataclass
class DataBundle:
    classes: list[str]
    train_loader: DataLoader
    val_loader: DataLoader
    test_loader: DataLoader
    train_counts: Counter


def _sampler(dataset: PlantDataset, mode: str) -> WeightedRandomSampler | None:
    """mode: none | inverse | sqrt_inverse (chống mất cân bằng 150 vs 1542)."""
    if mode == "none":
        return None
    counts = dataset.class_counts()
    if mode == "inverse":
        per_class = {c: 1.0 / n for c, n in counts.items()}
    elif mode == "sqrt_inverse":
        per_class = {c: 1.0 / (n**0.5) for c, n in counts.items()}
    else:
        raise ValueError(f"sampler không hợp lệ: {mode}")
    weights = [per_class[label] for _, label in dataset.samples]
    return WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)


def make_dataloaders(
    data_root: str | Path,
    negatives_root: str | Path | None = None,
    img_size: int = 224,
    batch_size: int = 64,
    num_workers: int = 8,
    sampler: str = "sqrt_inverse",
    max_negatives_train: int | None = 3000,
    randaug: bool = True,
    seed: int = 42,
) -> DataBundle:
    data_root = Path(data_root)
    classes = list_plant_classes(data_root)
    use_neg = negatives_root is not None and Path(negatives_root).is_dir()
    if use_neg:
        classes = classes + [IRRELEVANT_CLASS]
    else:
        negatives_root = None

    tf_train = build_transforms(img_size, train=True, randaug=randaug)
    tf_eval = build_transforms(img_size, train=False)

    ds = {}
    for split, tf, cap in (
        ("train", tf_train, max_negatives_train),
        ("val", tf_eval, None),
        ("test", tf_eval, None),
    ):
        samples = build_samples(
            data_root, split, classes, negatives_root, max_negatives=cap, seed=seed
        )
        ds[split] = PlantDataset(samples, tf, classes)
        print(f"[datamodule] {split}: {len(samples)} ảnh / {len(classes)} class")

    common = dict(
        num_workers=num_workers,
        pin_memory=True,
        persistent_workers=num_workers > 0,
        prefetch_factor=4 if num_workers > 0 else None,
    )
    train_sampler = _sampler(ds["train"], sampler)
    return DataBundle(
        classes=classes,
        train_loader=DataLoader(
            ds["train"],
            batch_size=batch_size,
            shuffle=train_sampler is None,
            sampler=train_sampler,
            drop_last=True,
            **common,
        ),
        val_loader=DataLoader(ds["val"], batch_size=batch_size * 2, shuffle=False, **common),
        test_loader=DataLoader(ds["test"], batch_size=batch_size * 2, shuffle=False, **common),
        train_counts=ds["train"].class_counts(),
    )


def save_labels(classes: list[str], out_path: str | Path) -> None:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "classes": classes,
                "irrelevant_class": IRRELEVANT_CLASS,
                "irrelevant_index": classes.index(IRRELEVANT_CLASS)
                if IRRELEVANT_CLASS in classes
                else None,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
