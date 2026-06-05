import pandas as pd
import re

df = pd.read_csv(
    "data/processed/combined_dataset.csv"
)

print(df.columns)

print(df.head())

df["Label"] = df["Label"].str.strip().str.lower()

print(df["Label"].value_counts())

df["text"] = (
    df["title"].fillna("")
    + " "
    + df["selftext"].fillna("")
)

def clean_text(text):

    text = str(text).lower()

    text = re.sub(
        r"http\S+",
        "",
        text
    )

    text = re.sub(
        r"[^a-zA-Z\s]",
        " ",
        text
    )

    return text

df["text"] = df["text"].apply(
    clean_text
)



print(df["text"].head())

print(df["Label"].unique())

print(df["Label"].value_counts())


labels = sorted(
    df["Label"].dropna().unique()
)

label_map = {
    label: idx
    for idx, label in enumerate(labels)
}

print(label_map)

df["label_id"] = (
    df["Label"]
    .map(label_map)
)

print(df["Label"].isna().sum())
print(df[["Label", "label_id"]].head())

df.to_csv(
    "data/processed/training_dataset.csv",
    index=False
)

print("Saved training dataset")