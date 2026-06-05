from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from langdetect import detect
import pandas as pd
import re
import torch


slang_df = pd.read_csv(
    "/home/skupz/Desktop/RLIP 2026/Mental Health AI/data/raw/Labelled Data/slang.csv"
)

slang_df["word"] = slang_df["word"].str.lower()
slang_map = dict(zip(slang_df["word"], slang_df["meaning"]))
slang_set = set(slang_map.keys())


model_name = "facebook/nllb-200-distilled-600M"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

tokenizer.src_lang = "tgl_Latn"


classifier = pipeline(
    "text-classification",
    model="/home/skupz/Desktop/RLIP 2026/Mental Health AI/models/mental_health_classifier",
    tokenizer="/home/skupz/Desktop/RLIP 2026/Mental Health AI/models/mental_health_classifier"
)


def detect_language(text):
    try:
        return detect(text)
    except:
        return "unknown"


def detect_slang(text):
    words = re.findall(r"\b\w+\b", text.lower())
    return [w for w in words if w in slang_set]


def normalize_text(text):
    words = text.lower().split()
    return " ".join([slang_map.get(w, w) for w in words])


def translate_tl_to_en(text):
    inputs = tokenizer(text, return_tensors="pt")

    outputs = model.generate(
        **inputs,
        forced_bos_token_id=tokenizer.convert_tokens_to_ids("eng_Latn")
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def classify_text(text):
    inputs = classifier.tokenizer(
        text,
        return_tensors="pt",
        truncation=True
    )

    # FIX for DistilBERT issue
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = classifier.model(**inputs)

    logits = outputs.logits
    pred_id = logits.argmax(dim=1).item()

    label = classifier.model.config.id2label.get(pred_id, f"LABEL_{pred_id}")

    confidence = torch.softmax(logits, dim=1).max().item()

    return label, confidence




text = input("Enter text: ")

lang = detect_language(text)
slang_check = detect_slang(text)

normalized = normalize_text(text)

translated = None


if lang == "tl":
    translated = translate_tl_to_en(normalized)
    print("\ntranslated:", translated)
    model_input = translated
else:
    model_input = text


label, confidence = classify_text(model_input)



print("\n--- OUTPUT ---")
print("Language:", lang)
print("Slang words found:", slang_check)
print("Final input to classifier:", model_input)
print("Predicted label:", label)
print("Confidence:", round(confidence, 4))