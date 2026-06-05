import pandas as pd
import glob

files = glob.glob(
    "/home/skupz/Desktop/RLIP 2026/Mental Health AI/data/raw/Labelled Data/Combined Data.csv",
    recursive=True
)

dfs = [pd.read_csv(file) for file in files]

combined = pd.concat(
    dfs,
    ignore_index=True
)

combined.to_csv(
    "data/processed/combined_dataset.csv",
    index=False
)

print(combined.shape)