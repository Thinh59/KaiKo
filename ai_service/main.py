from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch
import os

load_dotenv()

app = FastAPI(title="KaiKo AI Inference Service")

DEFAULT_MODEL_ROOT = Path(__file__).resolve().parent.parent / "ai_model"
FALLACY_MODEL_PATH = os.getenv(
    "FALLACY_MODEL_PATH",
    str(DEFAULT_MODEL_ROOT / "kaiko_fallacy_model_final"),
)
ARGKP_MODEL_PATH = os.getenv(
    "ARGKP_MODEL_PATH",
    str(DEFAULT_MODEL_ROOT / "kaiko_argkp_model_final"),
)

LABEL_NAMES = [
    "ad hominem", "ad populum", "appeal to emotion",
    "circular reasoning", "equivocation", "fallacy of credibility",
    "fallacy of extension", "fallacy of logic", "fallacy of relevance",
    "false causality", "false dilemma", "faulty generalization", "intentional"
]

LABEL_VI = {
    "ad hominem": "Công kích cá nhân",
    "ad populum": "Dựa vào số đông",
    "appeal to emotion": "Khai thác cảm xúc",
    "circular reasoning": "Lập luận vòng tròn",
    "equivocation": "Ngụy biện từ ngữ",
    "fallacy of credibility": "Ngụy biện uy tín",
    "fallacy of extension": "Bóp méo lập luận",
    "fallacy of logic": "Lập luận hợp lệ",
    "fallacy of relevance": "Lập luận lạc đề",
    "false causality": "Nhân quả giả",
    "false dilemma": "Lưỡng nan giả",
    "faulty generalization": "Khái quát hóa sai",
    "intentional": "Ngụy biện cố ý",
}

fallacy_tokenizer = None
fallacy_model = None
argkp_tokenizer = None
argkp_model = None


class FallacyInput(BaseModel):
    text: str


class ArgKPInput(BaseModel):
    argument: str
    key_point: Optional[str] = None
    topic: Optional[str] = None


@app.on_event("startup")
def load_models():
    global fallacy_tokenizer, fallacy_model, argkp_tokenizer, argkp_model

    if not os.path.exists(FALLACY_MODEL_PATH):
        raise RuntimeError(f"Fallacy model not found: {FALLACY_MODEL_PATH}")
    if not os.path.exists(ARGKP_MODEL_PATH):
        raise RuntimeError(f"ArgKP model not found: {ARGKP_MODEL_PATH}")

    print("Loading Fallacy model...")
    fallacy_tokenizer = AutoTokenizer.from_pretrained(FALLACY_MODEL_PATH)
    fallacy_model = AutoModelForSequenceClassification.from_pretrained(FALLACY_MODEL_PATH)
    fallacy_model.eval()

    print("Loading ArgKP model...")
    argkp_tokenizer = AutoTokenizer.from_pretrained(ARGKP_MODEL_PATH)
    argkp_model = AutoModelForSequenceClassification.from_pretrained(ARGKP_MODEL_PATH)
    argkp_model.eval()
    print("AI models loaded.")


@app.get("/")
def root():
    return {
        "status": "ok",
        "fallacy_model_loaded": fallacy_model is not None,
        "argkp_model_loaded": argkp_model is not None,
    }


@app.post("/predict/fallacy")
def predict_fallacy(input_data: FallacyInput):
    if fallacy_model is None or fallacy_tokenizer is None:
        raise HTTPException(status_code=503, detail="Fallacy model is not loaded")

    tokens = fallacy_tokenizer(
        input_data.text,
        return_tensors="pt",
        truncation=True,
        max_length=256,
    )
    with torch.no_grad():
        logits = fallacy_model(**tokens).logits

    probs = torch.softmax(logits, dim=-1)[0]
    top_idx = probs.argmax().item()
    confidence = round(probs[top_idx].item() * 100, 1)
    label = LABEL_NAMES[top_idx]
    is_fallacy = label != "fallacy of logic" and confidence >= 70

    return {
        "label": label,
        "label_vi": LABEL_VI.get(label, label),
        "confidence": confidence,
        "is_fallacy": is_fallacy,
        "scores": {
            name: round(probs[idx].item(), 6)
            for idx, name in enumerate(LABEL_NAMES)
        },
    }


@app.post("/predict/argkp")
def predict_argkp(input_data: ArgKPInput):
    if argkp_model is None or argkp_tokenizer is None:
        raise HTTPException(status_code=503, detail="ArgKP model is not loaded")

    key_point = input_data.key_point or input_data.topic
    if not key_point:
        raise HTTPException(status_code=422, detail="key_point or topic is required")

    tokens = argkp_tokenizer(
        input_data.argument,
        key_point,
        return_tensors="pt",
        padding="max_length",
        truncation=True,
        max_length=256,
    )
    with torch.no_grad():
        logits = argkp_model(**tokens).logits

    probs = torch.softmax(logits, dim=-1)[0]
    score = round(probs[1].item() * 100, 1)
    is_match = probs.argmax().item() == 1

    return {
        "match": is_match,
        "score": score,
        "label": int(probs.argmax().item()),
        "scores": {
            "not_match": round(probs[0].item(), 6),
            "match": round(probs[1].item(), 6),
        },
    }
