#!/usr/bin/env bash
# Chạy full pipeline trên 1 instance vast.ai (đã ssh vào, đang ở /workspace).
# Dùng: bash cv/resnet/run_vast.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT/cv/resnet"

ARCH="${ARCH:-resnet50}"
EPOCHS="${EPOCHS:-30}"
BATCH="${BATCH:-64}"
IMG="${IMG:-224}"
WORKERS="${WORKERS:-$(nproc)}"
OUT="${OUT:-runs/${ARCH}_ood}"

echo "== 0. deps =="
# KHÔNG cài torch/torchvision ở đây. Template vast đã có build đúng CUDA của GPU
# (vd Blackwell/RTX 50xx cần cu128); pip có thể kéo về build khác rồi hỏng cả môi trường.
python -c "import torch, torchvision" || {
  echo "thiếu torch/torchvision — cài đúng index CUDA của máy rồi chạy lại"; exit 1; }
pip install -q numpy pillow scikit-learn

echo "== 1. tải + build ảnh negative =="
if [ ! -d "$REPO_ROOT/data/negatives/train" ]; then
  python prepare_negatives.py --out "$REPO_ROOT/data/negatives" \
    --sources imagenette coco --total 6000
else
  echo "đã có data/negatives, bỏ qua"
fi

echo "== 2. lọc ảnh xấu (dry-run, đọc CSV rồi tự quyết định --apply) =="
python clean_data.py --root "$REPO_ROOT/data/dataset"

echo "== 3. smoke test 20 batch =="
python train.py --data-root "$REPO_ROOT/data/dataset" \
  --negatives-root "$REPO_ROOT/data/negatives" \
  --arch resnet18 --epochs 1 --freeze-epochs 0 --limit-batches 20 \
  --num-workers "$WORKERS" --out runs/smoke

echo "== 4. train thật =="
python train.py --data-root "$REPO_ROOT/data/dataset" \
  --negatives-root "$REPO_ROOT/data/negatives" \
  --arch "$ARCH" --img-size "$IMG" --batch-size "$BATCH" \
  --epochs "$EPOCHS" --freeze-epochs 2 --num-workers "$WORKERS" \
  --sampler sqrt_inverse --out "$OUT"

echo "== 5. calibrate ngưỡng OOD =="
python eval_ood.py --ckpt "$OUT/best.pt" \
  --data-root "$REPO_ROOT/data/dataset" \
  --negatives-root "$REPO_ROOT/data/negatives" \
  --num-workers "$WORKERS"

echo "== 6. đóng gói kết quả =="
tar czf "$REPO_ROOT/resnet_artifacts.tar.gz" \
  "$OUT/best.pt" "$OUT/labels.json" "$OUT/history.csv" \
  "$OUT/test_report.json" "$OUT/confusion_matrix.csv" "$OUT/ood_threshold.json"
echo "xong -> $REPO_ROOT/resnet_artifacts.tar.gz"
