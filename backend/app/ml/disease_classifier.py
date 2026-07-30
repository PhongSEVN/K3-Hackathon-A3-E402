import sys
import threading
from io import BytesIO
from pathlib import Path

from PIL import Image

from app.core.config import settings

# `cv/resnet/predict.py` lives outside this package, and its own imports
# (`from datamodule import ...`, `from train import build_model`) are
# unqualified — it expects `cv/resnet/` itself on sys.path, not just the
# project root. Add both so `from predict import PlantClassifier` resolves
# the same way the module resolves its own internal imports.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
CV_RESNET_DIR = PROJECT_ROOT / "cv" / "resnet"
for _path in (PROJECT_ROOT, CV_RESNET_DIR):
    if str(_path) not in sys.path:
        sys.path.insert(0, str(_path))

from predict import PlantClassifier  # noqa: E402
from ultralytics import YOLO  # noqa: E402

IRRELEVANT_LABEL = "_khong_lien_quan"

# r50/r101 test_macro_f1 from cv/resnet/runs/{r50,r101}/test_report.json (0.9763,
# 0.9812) — measured on this project's own held-out test set. YOLO has no such
# figure available locally (evaluating it needs the training dataset, which only
# ever existed on the vast.ai training box), so it gets an equal vote rather than
# a fabricated weight. Once `cv/results/yolo` gets a real test_macro_f1, swap this
# for weighted-by-macro-f1 like the other two.
_ENSEMBLE_WEIGHTS = {"resnet50": 1.0, "resnet101": 1.0, "yolo": 1.0}

_lock = threading.Lock()
_r50: PlantClassifier | None = None
_r101: PlantClassifier | None = None
_yolo: YOLO | None = None


def _load() -> None:
    global _r50, _r101, _yolo
    _r50 = PlantClassifier(settings.resnet50_ckpt_path, settings.resnet50_threshold_path)
    _r101 = PlantClassifier(settings.resnet101_ckpt_path, settings.resnet101_threshold_path)
    _yolo = YOLO(settings.yolo_ckpt_path)


def _get_models() -> tuple[PlantClassifier, PlantClassifier, YOLO]:
    if _r50 is None:
        with _lock:
            if _r50 is None:
                _load()
    assert _r50 is not None and _r101 is not None and _yolo is not None
    return _r50, _r101, _yolo


def _yolo_plant_probs(yolo: YOLO, image: Image.Image) -> tuple[dict[str, float], str, float]:
    result = yolo.predict(image, verbose=False)[0]
    probs = result.probs
    names = result.names
    plant_probs = {names[i]: float(probs.data[i]) for i in range(len(names))}
    top1_label = names[int(probs.top1)]
    return plant_probs, top1_label, float(probs.top1conf)


def predict_disease(image_bytes: bytes) -> dict:
    """Ensemble of 3 classifiers (ResNet50, ResNet101, YOLOv8-cls), each
    trained on the same 25 disease classes.

    Two of the three (the ResNets) were also trained with an explicit
    "_khong_lien_quan" negative class and each has its own calibrated OOD
    score threshold (see cv/resnet/README.md). An image is accepted only when
    BOTH ResNets consider it relevant — matching the "AND-to-accept" rule the
    CV engineer already documented for combining ResNet with a second model
    (higher reject recall, at the cost of more false rejects). YOLO has no
    negative-class training and no calibrated threshold, so it only
    contributes a vote to the disease label, not to the accept/reject gate.
    """
    r50, r101, yolo = _get_models()
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    res50 = r50.predict_batch([image])[0]
    res101 = r101.predict_batch([image])[0]
    yolo_probs, yolo_label, _ = _yolo_plant_probs(yolo, image)

    is_relevant = res50["is_relevant"] and res101["is_relevant"]
    reject_reason = None if is_relevant else (res50["reject_reason"] or res101["reject_reason"])

    per_model_probs = {
        "resnet50": res50["plant_probs"],
        "resnet101": res101["plant_probs"],
        "yolo": yolo_probs,
    }
    classes = per_model_probs["resnet50"].keys()
    total_weight = sum(_ENSEMBLE_WEIGHTS.values())
    ensemble_probs = {
        label: sum(per_model_probs[model][label] * weight for model, weight in _ENSEMBLE_WEIGHTS.items())
        / total_weight
        for label in classes
    }
    final_label = max(ensemble_probs, key=ensemble_probs.get)
    final_confidence = ensemble_probs[final_label]

    per_model_top1 = {"resnet50": res50["label"], "resnet101": res101["label"], "yolo": yolo_label}
    agreement = sum(1 for label in per_model_top1.values() if label == final_label) / len(per_model_top1)

    return {
        "is_relevant": is_relevant,
        "reject_reason": reject_reason,
        "label": IRRELEVANT_LABEL if not is_relevant else final_label,
        "confidence": final_confidence,
        "agreement": agreement,
        "per_model": per_model_top1,
    }
