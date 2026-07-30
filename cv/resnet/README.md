# ResNet — phân loại bệnh cây + chặn ảnh không liên quan

## Bài toán

Ảnh nông dân gửi lên có thể là bất cứ thứ gì (selfie, hoá đơn, ảnh mờ, ảnh mèo).
Model 25-class thuần **luôn** trả về 1 nhãn bệnh với confidence cao cho những ảnh đó.
Nên ở đây dùng **2 cửa chặn**:

| Cửa | Cách làm | Bắt được gì |
|---|---|---|
| 1. Class `_khong_lien_quan` | thêm class thứ 26, train bằng ảnh negative thật (COCO/Imagenette/DTD) | ảnh đời thường: người, phòng, đồ vật, texture |
| 2. Score OOD (`energy`) | `-logsumexp` trên 25 logit bệnh, ngưỡng calibrate trên val | ảnh lạ **chưa từng có** trong tập negative |

Cửa 1 chính xác nhưng chỉ bắt được thứ giống dữ liệu đã train. Cửa 2 bắt phần còn lại.
Không có cửa 2 thì hệ thống rất dễ "tự tin sai" — đây là lỗi tệ nhất với người dùng cuối.

## File

| File | Việc |
|---|---|
| `datamodule.py` | dataset, transform, sampler chống mất cân bằng (150 vs 1542 ảnh/class) |
| `prepare_negatives.py` | tải + build tập ảnh negative -> `data/negatives/{train,val,test}` |
| `clean_data.py` | lọc ảnh xấu: corrupt, quá nhỏ, ảnh trơn, trùng byte, trùng nội dung (dhash) |
| `train.py` | finetune ResNet pretrained ImageNet, 2 phase (freeze head -> full) |
| `eval_ood.py` | calibrate ngưỡng OOD trên val, báo cáo AUROC / FPR@95 trên test |
| `predict.py` | inference + luật chặn; import được như module cho backend |
| `run_vast.sh` | chạy cả 6 bước trên vast.ai |

---

## Chạy trên vast.ai

### 1. Thuê instance

Yêu cầu tối thiểu — **vCPU quan trọng không kém GPU**, dataloader decode 24k JPEG là
bottleneck thật, GPU mạnh mà 4 vCPU thì GPU chờ CPU:

- GPU: 1× RTX 4090 / 3090 / A5000 (~$0.20–0.40/h). ResNet50 224px không cần hơn.
- **vCPU ≥ 8**, RAM ≥ 32GB
- Disk **≥ 60GB** (dataset 5.5GB + zip 5.5GB + negatives ~1GB + checkpoint)
- Template: `PyTorch 2.x cuDNN` (bất kỳ image pytorch có CUDA 12.1+)
- Chọn **On-demand**, KHÔNG chọn Interruptible (bị kill giữa lúc train)
- Lọc thêm: reliability > 99%, Down speed > 300 Mbps (để tải dataset nhanh)

Trước khi Rent: Account -> thêm SSH public key (`~/.ssh/id_ed25519.pub`, chưa có thì
`ssh-keygen -t ed25519`).

### 2. SSH vào

Instances -> nút **Connect** -> copy dòng lệnh, dạng:

```bash
ssh -p 12345 root@ssh5.vast.ai
```

Vào rồi bật `tmux` ngay — mất mạng là mất luôn job train nếu không có nó:

```bash
tmux new -s train
```

(Rớt ssh thì ssh lại rồi `tmux attach -t train`.)

### 3. Lấy code

```bash
cd /workspace
git clone https://github.com/PhongSEVN/DAY05_2A202601241_NguyenVanPhong.git
cd DAY05_2A202601241_NguyenVanPhong
```

### 4. Lấy data (5.5GB — tải trực tiếp từ Kaggle, đừng upload từ máy Windows)

Lấy API token: kaggle.com -> Settings -> Create New Token -> tải `kaggle.json`.

```bash
pip install -q kaggle unzip
mkdir -p ~/.config/kaggle
```

Dán nội dung `kaggle.json` vào instance (nội dung 1 dòng, copy từ máy mình):

```bash
cat > ~/.config/kaggle/kaggle.json <<'EOF'
{"username":"...","key":"..."}
EOF
chmod 600 ~/.config/kaggle/kaggle.json
```

```bash
cd /workspace/DAY05_2A202601241_NguyenVanPhong/data
kaggle datasets download -d phongnguyen1337/plant-disease-classification
unzip -q plant-disease-classification.zip -d .
ls dataset/train | head    # phải thấy Cafe_benh_dom_rong, Lua_benh_dom_nau, ...
rm plant-disease-classification.zip
```

Nếu unzip ra khác cấu trúc `dataset/{train,val,test}/<class>/*.jpg` thì `mv` lại cho đúng.
Cách khác (không cần Kaggle) — rsync từ máy mình, chậm hơn nhiều vì upload nhà thường 20–50 Mbps:

```bash
rsync -avz -e "ssh -p 12345" "/e/AIinAction/Lab/DAY05_2A202601241_NguyenVanPhong/data/dataset/" root@ssh5.vast.ai:/workspace/DAY05_2A202601241_NguyenVanPhong/data/dataset/
```

### 5. Train

Cách nhanh — 1 script làm hết:

```bash
cd /workspace/DAY05_2A202601241_NguyenVanPhong
bash cv/resnet/run_vast.sh
```

Hoặc từng bước, để kiểm soát:

```bash
cd /workspace/DAY05_2A202601241_NguyenVanPhong/cv/resnet
pip install -r requirements.txt

# a) ảnh negative (~1.1GB tải về, 3-5 phút)
python prepare_negatives.py --out ../../data/negatives --sources imagenette coco --total 6000

# b) lọc ảnh xấu — DRY-RUN, in báo cáo trước
python clean_data.py --root ../../data/dataset
#    xem reports/data_quality.csv rồi mới:
python clean_data.py --root ../../data/dataset --apply

# c) smoke test 20 batch (~1 phút) — phát hiện lỗi path/OOM trước khi đốt tiền
python train.py --arch resnet18 --epochs 1 --limit-batches 20 --out runs/smoke

# d) train thật
python train.py --arch resnet50 --epochs 30 --batch-size 64 \
                --freeze-epochs 2 --num-workers $(nproc) --out runs/resnet50_ood

# e) calibrate ngưỡng OOD
python eval_ood.py --ckpt runs/resnet50_ood/best.pt --num-workers $(nproc)
```

Thời gian ước tính trên 4090 + 16 vCPU: ~30–40s/epoch, 30 epoch ≈ **20–25 phút**,
tốn dưới **$0.50**. Nếu chậm hơn nhiều (>2 phút/epoch) thì CPU đang thiếu — tăng
`--num-workers`, hoặc giảm `--img-size 192`.

OOM (CUDA out of memory): giảm `--batch-size 32`. VRAM 24GB thì batch 64 @ 224px thừa sức.

### 6. Theo dõi

```bash
watch -n 5 nvidia-smi          # GPU util nên > 85%; thấp = CPU bottleneck
tail -f runs/resnet50_ood/history.csv
```

### 7. Lấy kết quả về + XOÁ INSTANCE

Chạy trên **máy mình**:

```bash
scp -P 12345 root@ssh5.vast.ai:/workspace/DAY05_2A202601241_NguyenVanPhong/resnet_artifacts.tar.gz .
```

Xong thì vào vast.ai bấm **DESTROY** instance. Instance đang chạy vẫn tính tiền theo giờ
kể cả khi không train; chỉ Stop thì vẫn bị tính tiền disk.

---

## Output sau khi train

```
runs/resnet50_ood/
  best.pt               # weights + classes + arch + img_size (predict.py tự đọc, không cần truyền thêm)
  last.pt               # để --resume nếu bị ngắt
  labels.json
  history.csv           # loss/acc/macro-F1/reject P-R mỗi epoch
  test_report.json      # precision/recall/F1 từng class trên test
  confusion_matrix.csv
  ood_threshold.json    # ngưỡng OOD đã calibrate
```

Chỉ số cần nhìn:

- `test_macro_f1` — macro, không phải accuracy, vì class ít ảnh nhất chỉ 150 ảnh
- `reject_recall` — bắt được bao nhiêu % ảnh không liên quan
- `false_reject_rate` — chặn oan bao nhiêu % ảnh bệnh thật. **Đây là chỉ số đau nhất**:
  chặn oan ảnh của nông dân tệ hơn là để lọt 1 ảnh rác
- `auroc` trong `ood_threshold.json` — chất lượng score OOD, < 0.85 là yếu

Muốn chặn gắt hơn: `eval_ood.py --target-keep 0.90` (giữ 90% ảnh bệnh, chặn oan 10%,
bắt OOD nhiều hơn). Muốn nhẹ tay: `--target-keep 0.99`.

## Dùng trong backend

```python
from cv.resnet.predict import PlantClassifier

clf = PlantClassifier("cv/resnet/runs/resnet50_ood/best.pt",
                      "cv/resnet/runs/resnet50_ood/ood_threshold.json")
res = clf.predict_path("upload.jpg")
# {'is_relevant': False, 'reject_reason': 'ood_score', 'label': '_khong_lien_quan', ...}
if not res["is_relevant"]:
    return {"error": "Ảnh không phải ảnh lá cây bệnh, gửi lại giúp mình nhé"}
```

## Ghép với YOLO

`is_relevant` của ResNet + `có phát hiện được lá/cây nào không` của YOLO-cls ghép lại
bằng luật AND: chỉ nhận ảnh khi **cả hai** đồng ý là ảnh liên quan. Recall của việc chặn
tăng, đổi lại chặn oan tăng — đo cả hai bằng chính `reject_*` metric ở trên rồi chọn.

## Test bằng ảnh lạ thật

Tập negative tải về vẫn là dữ liệu "sạch". Nên thu 30–50 ảnh rác thật (screenshot, ảnh
chụp mờ, ảnh trong nhà, ảnh chó mèo) vào 1 thư mục rồi:

```bash
python eval_ood.py --ckpt runs/resnet50_ood/best.pt --extra-ood-dir /path/anh_rac_thuc_te
```

`detect_rate` ở đây là con số trung thực nhất để đưa vào báo cáo, vì nó đo đúng phân
phối OOD mà model chưa từng thấy.
