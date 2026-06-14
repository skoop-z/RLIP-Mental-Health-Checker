"""Mental health classifier service — integrates slang + translation + classification."""

from __future__ import annotations

from pathlib import Path
import torch
import re
import pandas as pd
from langdetect import detect
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

# =========================
# PATHS
# =========================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "models" / "mental_health_classifier"

SLANG_PATH = PROJECT_ROOT / "data/raw/Labelled Data/slang.csv"

# =========================
# LOAD SLANG DATA
# =========================

slang_df = pd.read_csv(SLANG_PATH)
slang_df["word"] = slang_df["word"].str.lower()

slang_map = dict(zip(slang_df["word"], slang_df["meaning"]))
slang_set = set(slang_map.keys())

# =========================
# TRANSLATION MODEL (NLLB)
# =========================

model_name = "facebook/nllb-200-distilled-600M"

tokenizer = AutoTokenizer.from_pretrained(model_name)
translator_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

tokenizer.src_lang = "tgl_Latn"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
translator_model.to(device)
translator_model.eval()

# =========================
# CLASSIFIER
# =========================

_classifier = None


def _load_classifier():
    global _classifier

    if _classifier is not None:
        return _classifier

    if not MODEL_DIR.is_dir():
        raise FileNotFoundError(f"Model directory not found: {MODEL_DIR}")

    _classifier = pipeline(
        "text-classification",
        model=str(MODEL_DIR),
        tokenizer=str(MODEL_DIR),
        top_k=None,
    )

    return _classifier


# =========================
# NLP HELPERS
# =========================

def detect_language(text: str) -> str:
    try:
        return detect(text)
    except:
        return "unknown"


def detect_slang(text: str):
    words = re.findall(r"\b\w+\b", text.lower())
    return [w for w in words if w in slang_set]


def normalize_text(text: str) -> str:
    words = text.lower().split()
    return " ".join([slang_map.get(w, w) for w in words])


def translate_tl_to_en(text: str) -> str:
    inputs = tokenizer(text, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = translator_model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids("eng_Latn")
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


# =========================
# CLASSIFICATION CORE
# =========================

def classify_text(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        raise ValueError("Text input is required.")

    classifier = _load_classifier()
    tokenizer_ = classifier.tokenizer
    model = classifier.model

    inputs = tokenizer_(text, return_tensors="pt", truncation=True)
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)[0]
    id2label = model.config.id2label

    scores = []

    for idx in range(len(id2label)):
        label = id2label.get(idx, f"LABEL_{idx}")
        scores.append({
            "label": label,
            "confidence": round(probs[idx].item() * 100, 1),
        })

    scores.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "primary": scores[0]["label"],
        "confidence": scores[0]["confidence"],
        "scores": scores,
    }


# =========================
# FULL PIPELINE (THIS FIXES YOUR ERROR)
# =========================

def predict_pipeline(text: str) -> dict:
    """
    Full pipeline:
    input → slang → normalize → translate → classify
    """

    print("\n================ PIPELINE START ================")
    print("RAW INPUT:", text)

    lang = detect_language(text)
    slang = detect_slang(text)

    print("DETECTED LANGUAGE:", lang)
    print("SLANG FOUND:", slang)

    processed = normalize_text(text)
    print("NORMALIZED TEXT:", processed)

    if lang == "tl":
        print("TRANSLATION: Triggered (Tagalog → English)")
        processed = translate_tl_to_en(processed)
        print("TRANSLATED TEXT:", processed)
    else:
        print("TRANSLATION: Skipped (not Tagalog)")
        print("FINAL INPUT:", processed)

    result = classify_text(processed)

    print("PREDICTION:", result["primary"], result["confidence"])
    print("================ PIPELINE END ================\n")

    return {
        "primary": result["primary"],
        "confidence": result["confidence"],
        "scores": result["scores"],
        "language": lang,
        "slang": slang,
        "input_used": processed
    }


# =========================
# MODEL CHECK
# =========================

def model_available() -> bool:
    return MODEL_DIR.is_dir()