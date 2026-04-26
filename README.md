# 🎤 KaiKo — Tranh Biện AI

Ứng dụng tranh biện AI với phát hiện ngụy biện, phân tích video/audio, và chấm điểm thông minh bằng LLM.

**Stack:** React · FastAPI · Transformers (XLM-RoBERTa) · Gemini API

## 🚀 Hướng dẫn cài đặt chi tiết cho Team

### 1. Cài đặt Backend (Python & FastAPI)

Thư mục `backend` chứa logic xử lý AI, phân tích ngụy biện và kết nối WebSocket.

**Các bước thực hiện:**

1.  **Mở terminal** và di chuyển vào thư mục backend:
    ```bash
    cd backend
    ```

2.  **Tạo môi trường ảo (Virtual Environment):**
    Việc này giúp tránh xung đột thư viện giữa các project.
    - **Windows:**
      ```powershell
      python -m venv venv
      ```
    - **Mac/Linux:**
      ```bash
      python3 -m venv venv
      ```

3.  **Kích hoạt môi trường ảo:**
    - **Windows:**
      ```powershell
      .\venv\Scripts\activate
      ```
    - **Mac/Linux:**
      ```bash
      source venv/bin/activate
      ```
    *(Sau khi kích hoạt, bạn sẽ thấy chữ `(venv)` hiện ở đầu dòng lệnh)*

4.  **Cài đặt các thư viện cần thiết:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Cấu hình biến môi trường:**
    Tạo file `.env` trong thư mục `backend/` và thêm key Gemini của bạn (lấy tại [AI Studio](https://aistudio.google.com/apikey)):
    ```env
    GEMINI_API_KEY=AIzaSy... (key của bạn)
    ```

6.  **Chạy server:**
    ```bash
    uvicorn main:app --reload --port 8000
    ```

### 2. Cài đặt Frontend (React & Vite)

Mở một terminal mới (vẫn ở thư mục gốc `kaiko`):

1.  **Di chuyển vào frontend:**
    ```bash
    cd frontend
    ```

2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```

3.  **Chạy ứng dụng:**
    ```bash
    npm run dev
    ```

4.  **Truy cập:** Mở trình duyệt vào [http://localhost:5173](http://localhost:5173)

---


## 📁 Cấu trúc

```
kaiko/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   ├── .env                 # API keys
│   ├── utils_preprocess.py  # Nén transcript
│   ├── utils_cache.py       # Semantic cache
│   └── fallacy_model/       # Model đã train
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── HomePage.jsx
│   │   │   ├── DebateRoom.jsx
│   │   │   ├── Scoreboard.jsx
│   │   │   └── FallacyAlert.jsx
│   │   ├── hooks/
│   │   │   ├── useSpeechToText.js
│   │   │   └── useAudioAnalysis.js
│   │   ├── firebase.js
│   │   └── main.jsx
│   └── package.json
├── .gitignore
└── README.md
```

## 🔧 API Endpoints

### `GET /`
Kiểm tra status server

```bash
curl http://localhost:8000
# {"status": "ok", "model_loaded": true}
```

### `POST /analyze`
Phân tích ngụy biện

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Mày dốt nên mới nói vậy!", "speaker": "Player A"}'
```

Response:
```json
{
  "fallacy": "Công kích cá nhân",
  "confidence": 87.3,
  "is_fallacy": true
}
```

### `POST /score`
Chấm điểm trận tranh biện

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "...",
    "player_a": "...",
    "transcript_a": "...",
    ...
  }'
```

## 🎯 Tính năng

- ✅ Phát hiện 13 loại ngụy biện (XLM-RoBERTa)
- ✅ Chuyển giọng → text (Web Speech API)
- ✅ Phân tích âm lượng & giọng run (Web Audio API)
- ✅ Chấm điểm thông minh (Gemini API)
- 🔄 Phân tích video (cần MediaPipe — optional)
- 🔄 WebRTC video call (cần Firebase — optional)

## 📌 Config quan trọng

### Gemini API Key

1. Vào https://aistudio.google.com/apikey
2. Tạo API key miễn phí
3. Thêm vào `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

### Model tự fine-tune

1. Chạy Kaggle notebook (Phần 4 trong guide)
2. Download `fallacy_model.zip`
3. Giải nén vào `backend/fallacy_model/`

### Firebase (Optional - dùng khi cần WebRTC)

1. Tạo project trên https://console.firebase.google.com
2. Bật Firestore Database
3. Copy config vào `frontend/src/firebase.js`
4. Cài `npm install firebase`

## 🧪 Test

```bash
# Test backend API
curl http://localhost:8000/docs

# Test frontend
Mở http://localhost:5173
Nhập chủ đề, tên người chơi
Nhấn "Bắt đầu tranh biện"
```

## ⚠️ Lỗi thường gặp

| Lỗi | Giải pháp |
|-----|----------|
| `CORS error` | Kiểm tra `allow_origins` trong `backend/main.py` |
| `Speech không hoạt động` | Dùng Chrome/Edge, cấp quyền mic |
| `model_loaded: false` | Copy model từ Kaggle vào `backend/fallacy_model/` |
| `Gemini 403` | Kiểm tra API key tại aistudio.google.com |

## 📚 Tài liệu đầy đủ

Xem `KaiKo_App_Guide (1).md` để biết chi tiết:
- Fine-tune model trên Kaggle
- Tích hợp MediaPipe
- Tối ưu API quota (5 lớp)
- Xử lý lỗi nâng cao

## 📝 License

MIT — Tự do sử dụng, sửa, phân phối

---

**Hỗ trợ:** Tham khảo hướng dẫn chi tiết trong `KaiKo_App_Guide (1).md`
