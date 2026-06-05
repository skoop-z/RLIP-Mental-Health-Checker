import pandas as pd

from datasets import Dataset

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)

# Load data
df = pd.read_csv(
    "data/processed/combined_dataset.csv"
)

print(df.columns.tolist())

# Clean text columns
df["title"] = df["title"].fillna("").astype(str)
df["selftext"] = df["selftext"].fillna("").astype(str)

# Combine title + body
df["text"] = df["title"] + " " + df["selftext"]

# Remove rows with missing labels
df = df.dropna(subset=["Label"])

# Normalize labels
df["Label"] = (
    df["Label"]
    .astype(str)
    .str.strip()
    .str.lower()
)

print("\nUnique Labels:")
print(sorted(df["Label"].unique()))

# Create label mapping
labels = sorted(df["Label"].unique())

label_map = {
    label: idx
    for idx, label in enumerate(labels)
}

print("\nLabel Map:")
print(label_map)

# Convert labels to integers
df["labels"] = df["Label"].map(label_map)

# Create Hugging Face dataset
dataset = Dataset.from_pandas(
    df[["text", "labels"]]
)

# Split dataset
dataset = dataset.train_test_split(
    test_size=0.2,
    seed=42
)

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    "distilbert-base-uncased"
)

# Tokenize text
def tokenize(batch):
    return tokenizer(
        batch["text"],
        truncation=True,
        padding="max_length",
        max_length=256
    )

dataset = dataset.map(
    tokenize,
    batched=True
)

# Load DistilBERT model
model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=len(labels)
)

# Training settings
training_args = TrainingArguments(
    output_dir="models/",
    num_train_epochs=3,
    per_device_train_batch_size=8
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"]
)

# Train model
trainer.train()

# Save model
trainer.save_model(
    "models/mental_health_classifier"
)

tokenizer.save_pretrained(
    "models/mental_health_classifier"
)

print("\nModel saved successfully!")
print("Saved to: models/mental_health_classifier")