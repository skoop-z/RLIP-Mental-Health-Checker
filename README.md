# RLIP-Mental-Health-Checker

# Installation

## Clone the Repository

Bash/cmd: git clone https://github.com/skoop-z/RLIP-Mental-Health-Checker.git

Bash/cmd: cd RLIP-Mental-Health-Checker

## Create a Virtual Environment

Bash/cmd: python -m venv venv

Bash/cmd: source venv/bin/activate

## Install Dependencies

Bash/cmd: pip install -r requirements.txt

# Model Setup

The trained model is not included in this repository due to GitHub's file size limitations.

Download the trained model:

Model Files: [https://drive.google.com/drive/u/0/folders/1dhPcTLIHFjaIa75BGJ0U6RRulOPoZj8F]

# After downloading, extract the files into:

models/mental_health_classifier/


Required files:

config.json

model.safetensors

tokenizer.json

tokenizer_config.json

training_args.bin


# Running the Application


Bash/cmd: python3.11 -u src/inference/predict.py


# Project Structure

RLIP-Mental-Health-Checker/

├── data/

├── notebooks/

├── src/

│   ├── data/

│   ├── training/

│   ├── inference/

│   └── app/

├── requirements.txt

└── README.md

