import threading
from io import BytesIO

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from app.core.config import settings


class ResNet50Classifier(nn.Module):
    def __init__(self, num_classes: int, dropout: float = 0.3) -> None:
        super().__init__()
        self.backbone = models.resnet50(weights=None)
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.BatchNorm1d(in_features),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


_preprocess = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model: ResNet50Classifier | None = None
_class_names: list[str] | None = None
_lock = threading.Lock()


def _load() -> None:
    global _model, _class_names

    checkpoint = torch.load(settings.disease_classifier_path, map_location=_device, weights_only=False)

    model = ResNet50Classifier(num_classes=checkpoint["num_classes"])
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(_device)
    model.eval()

    _model = model
    _class_names = checkpoint["class_names"]


def _get_model() -> tuple[ResNet50Classifier, list[str]]:
    if _model is None:
        with _lock:
            if _model is None:
                _load()
    assert _model is not None
    assert _class_names is not None
    return _model, _class_names


@torch.no_grad()
def predict_disease(image_bytes: bytes) -> tuple[str, float]:
    model, class_names = _get_model()

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = _preprocess(image).unsqueeze(0).to(_device)

    logits = model(tensor)
    probabilities = torch.softmax(logits, dim=1)[0]
    confidence, index = torch.max(probabilities, dim=0)

    return class_names[index.item()], confidence.item()
