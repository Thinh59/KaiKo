# KaiKo — AI Inference Service

Service FastAPI phục vụ **2 model tự train** (XLM-RoBERTa) để gameplay dùng model thật thay vì Gemini fallback.

| Endpoint | Vào | Ra |
|---|---|---|
| `POST /predict/fallacy` | `{ "text": "..." }` | `{ label, label_vi, confidence, is_fallacy, scores }` (6 nhóm ngụy biện) |
| `POST /predict/argkp` | `{ "argument": "...", "key_point": "..." }` | `{ match, score, prob_khop, threshold }` |
| `GET /` | — | health + trạng thái nạp model |

## 1. Chuẩn bị model

Tải 2 thư mục model từ Drive (xem `ai_model/README.md`) và đặt vào **`backend/fallacy_model/`**:

```
backend/fallacy_model/
├── kaiko_fallacy_model_final/     # model ngụy biện 6 nhóm
└── kaiko_argkp_model_final/       # model ArgKP (+ decision_threshold.json)
```

*(Hoặc trỏ đường dẫn khác qua biến `FALLACY_MODEL_DIR` / `ARGKP_MODEL_DIR`.)*

## 2. Cài & chạy

```bash
cd ai_service
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --port 8001
```

Lần đầu chạy sẽ nạp model (~vài giây). Kiểm tra: mở http://localhost:8001/ → `fallacy_loaded: true, argkp_loaded: true`.

## 3. Nối vào backend

Thêm vào `backend/.env`:

```env
AI_SERVICE_URL=http://localhost:8001
```

Restart backend. Từ giờ `/analyze` (ngụy biện) và `/check-argument` (ArgKP) sẽ dùng **model local**.

> An toàn: nếu service tắt hoặc model chưa tải (endpoint trả **503**), backend **tự fallback sang Gemini** — gameplay không gián đoạn.

## Ghi chú
- Chạy được trên **CPU** (chậm hơn) hoặc GPU nếu có CUDA (tự nhận `torch.cuda`).
- `transformers` được pin `4.46.3` khớp phiên bản lúc train (tránh lỗi nạp trọng số).
