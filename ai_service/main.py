# -*- coding: utf-8 -*-
"""
KaiKo — AI Inference Service (FastAPI)
Phục vụ 2 model tự train qua HTTP để backend gọi (AI_SERVICE_URL):
  POST /predict/fallacy  {text}                 -> nhãn ngụy biện (6 nhóm) + độ tin cậy
  POST /predict/argkp    {argument, key_point}  -> khớp chủ đề hay không (nhị phân)

Chạy:
  cd ai_service
  pip install -r requirements.txt
  uvicorn main:app --port 8001

Rồi đặt trong backend/.env:  AI_SERVICE_URL=http://localhost:8001
Nếu model chưa tải về (thư mục trống) -> endpoint trả 503 -> backend tự fallback Gemini.
"""
import os
import json

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HERE = os.path.dirname(os.path.abspath(__file__))
# Mặc định trỏ tới thư mục model trong backend/ (nơi README hướng dẫn giải nén).
FALLACY_DIR = os.getenv(
    "FALLACY_MODEL_DIR",
    os.path.join(HERE, "..", "backend", "fallacy_model", "kaiko_fallacy_model_final"),
)
ARGKP_DIR = os.getenv(
    "ARGKP_MODEL_DIR",
    os.path.join(HERE, "..", "backend", "fallacy_model", "kaiko_argkp_model_final"),
)

# Tên tiếng Việt cho 6 nhóm ngụy biện (khớp id2label của model).
LABEL_VI = {
    "cong_kich_cam_xuc": "Công kích & Cảm xúc",
    "so_dong_uy_tin": "Dựa số đông & Uy tín",
    "khai_quat_nhan_qua": "Khái quát hóa & Nhân quả sai",
    "luong_phan_bop_meo": "Lưỡng phân & Bóp méo lập luận",
    "lac_de_co_y": "Lạc đề & Cố ý đánh lạc hướng",
    "mo_ho_vong_vo_logic": "Mơ hồ, Vòng vo & Lỗi logic",
}
FALLACY_CONF_THRESHOLD = 70.0  # % tin cậy tối thiểu để coi là ngụy biện

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="KaiKo AI Inference Service")

# Trạng thái model (nạp ở startup)
STATE = {"fallacy": None, "argkp": None, "argkp_threshold": 0.60}


def _load(path: str):
    path = os.path.abspath(path)
    tokenizer = AutoTokenizer.from_pretrained(path)
    model = AutoModelForSequenceClassification.from_pretrained(path).to(DEVICE).eval()
    return tokenizer, model


@app.on_event("startup")
def load_models():
    # Fallacy
    try:
        STATE["fallacy"] = _load(FALLACY_DIR)
        print(f"✅ Đã nạp model ngụy biện: {FALLACY_DIR}")
    except Exception as e:
        print(f"⚠️  Không nạp được model ngụy biện ({FALLACY_DIR}): {e}")

    # ArgKP + ngưỡng quyết định
    try:
        STATE["argkp"] = _load(ARGKP_DIR)
        thr_path = os.path.join(ARGKP_DIR, "decision_threshold.json")
        if os.path.exists(thr_path):
            with open(thr_path, encoding="utf-8") as f:
                STATE["argkp_threshold"] = float(json.load(f).get("khop_threshold", 0.60))
        print(f"✅ Đã nạp model ArgKP: {ARGKP_DIR} (ngưỡng KHOP={STATE['argkp_threshold']})")
    except Exception as e:
        print(f"⚠️  Không nạp được model ArgKP ({ARGKP_DIR}): {e}")


class TextInput(BaseModel):
    text: str


class ArgInput(BaseModel):
    argument: str
    key_point: str


@torch.no_grad()
def _softmax_probs(tokenizer, model, *texts):
    inputs = tokenizer(
        *texts, return_tensors="pt", truncation=True, max_length=256, padding=True
    ).to(DEVICE)
    logits = model(**inputs).logits[0]
    return torch.softmax(logits, dim=-1).cpu().tolist()


@app.get("/")
def health():
    return {
        "status": "ok",
        "fallacy_loaded": STATE["fallacy"] is not None,
        "argkp_loaded": STATE["argkp"] is not None,
        "argkp_threshold": STATE["argkp_threshold"],
        "device": DEVICE,
    }


@app.post("/predict/fallacy")
def predict_fallacy(inp: TextInput):
    if STATE["fallacy"] is None:
        raise HTTPException(status_code=503, detail="Model ngụy biện chưa nạp")
    tokenizer, model = STATE["fallacy"]
    probs = _softmax_probs(tokenizer, model, inp.text)
    id2label = model.config.id2label
    idx = max(range(len(probs)), key=lambda i: probs[i])
    label = id2label[idx]
    confidence = round(probs[idx] * 100, 1)
    return {
        "label": label,
        "label_vi": LABEL_VI.get(label, label),
        "confidence": confidence,
        "is_fallacy": confidence >= FALLACY_CONF_THRESHOLD,
        "scores": {id2label[i]: round(p, 4) for i, p in enumerate(probs)},
    }


@app.post("/predict/argkp")
def predict_argkp(inp: ArgInput):
    if STATE["argkp"] is None:
        raise HTTPException(status_code=503, detail="Model ArgKP chưa nạp")
    tokenizer, model = STATE["argkp"]
    probs = _softmax_probs(tokenizer, model, inp.argument, inp.key_point)
    khop_idx = model.config.label2id.get("KHOP", 1)
    prob_khop = probs[khop_idx]
    threshold = STATE["argkp_threshold"]
    return {
        "match": bool(prob_khop >= threshold),
        "score": round(prob_khop * 100, 1),
        "prob_khop": round(prob_khop, 4),
        "threshold": threshold,
    }
