"""Mental health classifier service — integrates with models/mental_health_classifier/."""

from __future__ import annotations

from pathlib import Path

import torch

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "models" / "mental_health_classifier"

DISPLAY_LABELS = {
    "normal": "Normal",
    "depression": "Depression",
    "suicidal": "Suicidal",
    "burnout": "Burnout",
    "loneliness": "Loneliness",
    "anxiety": "Anxiety",
    "bipolar": "Bipolar",
    "stress": "Stress",
    "personality disorder": "Personality Disorder",
}

_classifier = None


def _normalize_label(label: str) -> str:
    return label.strip().lower()


def _display_label(label: str) -> str:
    key = _normalize_label(label)
    return DISPLAY_LABELS.get(key, label.strip().title())


def _load_classifier():
    global _classifier
    if _classifier is not None:
        return _classifier

    if not MODEL_DIR.is_dir():
        raise FileNotFoundError(f"Model directory not found: {MODEL_DIR}")

    from transformers import pipeline

    _classifier = pipeline(
        "text-classification",
        model=str(MODEL_DIR),
        tokenizer=str(MODEL_DIR),
        top_k=None,
    )
    return _classifier


def classify_text(text: str) -> dict:
    """Return ranked classification scores for all model labels."""
    text = (text or "").strip()
    if not text:
        raise ValueError("Text input is required.")

    classifier = _load_classifier()
    tokenizer = classifier.tokenizer
    model = classifier.model

    inputs = tokenizer(text, return_tensors="pt", truncation=True)
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)[0]
    id2label = model.config.id2label

    scores = []
    for idx in range(len(id2label)):
        raw_label = id2label.get(idx, f"LABEL_{idx}")
        confidence = probs[idx].item()
        scores.append(
            {
                "label": _display_label(raw_label),
                "label_key": _normalize_label(raw_label),
                "confidence": round(confidence * 100, 1),
            }
        )

    scores.sort(key=lambda item: item["confidence"], reverse=True)
    primary = scores[0]

    return {
        "primary": primary["label"],
        "primary_key": primary["label_key"],
        "confidence": primary["confidence"],
        "scores": scores,
    }


def model_available() -> bool:
    return MODEL_DIR.is_dir()
