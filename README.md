# 🦀 KaiKo — Nền tảng Tranh Biện AI

Ứng dụng tranh biện 1v1 **thời gian thực** (video hoặc chat) tích hợp AI: phát hiện ngụy biện,
đối sánh lập luận với chủ đề, phân tích cử chỉ qua camera, và chấm điểm thông minh bằng LLM.

**Stack:** React (Vite) · FastAPI · WebRTC + WebSocket · Transformers (XLM-RoBERTa) · MediaPipe · Gemini API · PostgreSQL (Neon)

---

## 🚀 Cài đặt cho Team

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate         # Windows  |  source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
```

Tạo file `backend/.env`:
```env
GEMINI_API_KEY=AIzaSy...                         # lấy tại https://aistudio.google.com/apikey
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require   # PostgreSQL (Neon)
# AI_SERVICE_URL=http://localhost:8001           # (tuỳ chọn) dùng model tự train, xem ai_service/
```

Chạy server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Truy cập: **http://localhost:5173** (dùng **Chrome/Edge** để có Web Speech API + camera).

### 3. (Tuỳ chọn) Tài khoản test theo level

```bash
cd backend && python seed_test_accounts.py       # tạo kaiko_lv1..lv101, mật khẩu: Kaiko@123
```

---

## 🧠 Thành phần AI

| Thành phần | Vai trò | Tài liệu |
|---|---|---|
| **Fallacy Detection** | Phân loại ngụy biện **6 nhóm** (XLM-RoBERTa fine-tuned) | [ai_model/README.md](ai_model/README.md) |
| **ArgKP Matching** | Kiểm tra lập luận có bám chủ đề (bám/lạc đề) | [ai_model/README.md](ai_model/README.md) |
| **Gesture Analysis** | Chấm điểm cử chỉ qua camera (MediaPipe FaceLandmarker) | `frontend/src/hooks/useGestureAnalysis.js` |
| **AI Inference Service** | Chạy 2 model tự train qua HTTP để gameplay dùng model thật | [ai_service/README.md](ai_service/README.md) |
| **Gemini** | Chấm điểm/phân tích + **fallback** khi model local chưa sẵn sàng | `gemini-3.1-flash-lite-preview` |

> Nếu không cấu hình `AI_SERVICE_URL`, hệ thống tự **fallback sang Gemini** — vẫn chạy đầy đủ.

---

## 📁 Cấu trúc

```
kaiko/
├── backend/                    # FastAPI: WebSocket signaling, chấm điểm, DB, gọi AI service
│   ├── main.py
│   ├── seed_test_accounts.py   # tạo tài khoản test theo level
│   └── fallacy_model/          # model đã train (tải riêng, xem ai_model/README)
├── frontend/                   # React (Vite)
│   └── src/
│       ├── components/         # DebateRoom, TextDebateRoom, Scoreboard, Dashboard, ControlsBar, VideoGrid...
│       └── hooks/              # useWebRTC, useSignaling, useSpeechToText, useAudioAnalysis, useGestureAnalysis
├── ai_model/                   # notebook train + dataset + hướng dẫn model
├── ai_service/                 # FastAPI inference service cho 2 model tự train
├── tests/e2e/                  # kiểm thử tự động Playwright (PA5)
└── docs/                       # tài liệu môn học (PA1–PA5, báo cáo đánh giá ML)
```

---

## 🔧 API chính (backend)

```bash
curl http://localhost:8000
# {"status": "ok", "ai_service_configured": false}
```

- `POST /analyze` — phát hiện ngụy biện trong 1 câu → `{ fallacy, fallacy_en, confidence, is_fallacy }`
- `POST /check-argument` — kiểm tra bám chủ đề (ArgKP) → `{ match, score }`
- `POST /score` — chấm điểm cả trận (logic, phong thái/cử chỉ, giọng nói, phản biện)
- `GET /leaderboard`, `POST /login`, `POST /register`, `POST /save-match`, ... (xem `main.py`)

Ví dụ `/analyze`:
```json
{ "fallacy": "Công kích & Cảm xúc", "confidence": 87.3, "is_fallacy": true }
```

---

## 🎯 Tính năng

- ✅ Phát hiện ngụy biện **6 nhóm** (XLM-RoBERTa, fallback Gemini)
- ✅ Đối sánh lập luận – chủ đề (ArgKP), cảnh báo lạc đề
- ✅ Video debate 1v1: WebRTC + Speech-to-Text + **chấm điểm cử chỉ (MediaPipe)**
- ✅ Chat debate 1v1 / Solo vs AI (Gemini)
- ✅ Chấm điểm + phân tích + gợi ý (Gemini)
- ✅ Hệ thống Level 1–101, danh hiệu, khung avatar, cửa hàng, bạn bè, sự kiện, bái sư
- ✅ Bảng xếp hạng, lịch sử trận, thả emoji real-time, xem live (spectate)

---

## ⚠️ Lỗi thường gặp

| Lỗi | Giải pháp |
|---|---|
| `CORS error` | Kiểm tra `allow_origins` trong `backend/main.py`; backend chạy đúng port 8000 |
| Speech không hoạt động | Dùng **Chrome/Edge**, cấp quyền mic; đổi ngôn ngữ browser sang `vi-VN` |
| Camera/HUD cử chỉ không chạy | Cấp quyền camera + cần **Internet** (MediaPipe tải model lần đầu) |
| `Gemini 403 / rate limit` | Kiểm tra `GEMINI_API_KEY`; free tier giới hạn 15 req/phút |
| Lỗi kết nối DB | Kiểm tra `DATABASE_URL` (Neon) trong `backend/.env` |

---

## 🧪 Kiểm thử tự động

```bash
cd tests/e2e && pip install -r requirements.txt && python -m playwright install chromium
pytest --headed        # sinh report.html (xem tests/e2e/README.md)
```

## 📚 Tài liệu

- Đánh giá ML: `docs/ml_evaluation_analysis.md` + `docs/pa/PA4/PA4-Group09/KaiKo_ML_Model_Evaluation_Report_PA4.docx`
- Kiểm thử tự động (PA5): `docs/pa/PA5/PA5-Group09/` + `tests/e2e/README.md`
- Model AI: `ai_model/README.md` · Inference service: `ai_service/README.md`

## 📝 License

MIT — Tự do sử dụng, sửa, phân phối.
