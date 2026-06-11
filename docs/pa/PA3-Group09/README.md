# KaiKo – Working Software README (PA3)

> **CSC10011 – Software Engineering for AI-enabled Systems**  
> **Group 09 | Submission: PA3**

---

## 📌 Tổng quan

**KaiKo** là ứng dụng tranh biện AI thời gian thực, cho phép người dùng tranh luận 1v1 (video hoặc text) với sự hỗ trợ của mô hình học máy phát hiện ngụy biện logic và đánh giá lập luận. Hệ thống sử dụng XLM-RoBERTa (fine-tuned) kết hợp Gemini 2.5 Flash để cung cấp phản hồi thông minh và chấm điểm cuối trận.

---

## ✅ Các tính năng đã hoàn thành

### Use Case 1 – Tranh biện Video 1v1 (Real-time)
- **Matchmaking tự động**: Người dùng nhấn "Tìm trận" → hệ thống ghép cặp theo cấp độ (tier-based matching, chênh lệch ≤ 10 level)
- **WebRTC Video Call**: Kết nối video/audio ngang hàng giữa 2 người chơi qua WebSocket signaling
- **Speech-to-Text real-time**: Chuyển giọng nói → transcript bằng Web Speech API (Chrome/Edge)
- **Phát hiện ngụy biện**: Mỗi câu nói được gửi đến backend → XLM-RoBERTa phân loại 13 loại ngụy biện → hiện thông báo pop-up FallacyAlert
- **Chấm điểm cuối trận**: Gemini 2.5 Flash phân tích toàn bộ transcript → cho điểm logic, dẫn chứng, cách diễn đạt → hiển thị Scoreboard chi tiết
- **Lưu lịch sử**: Kết quả tự động lưu vào PostgreSQL (Neon cloud) sau mỗi trận

### Use Case 2 – Tranh biện Text 1v1 (Chat-based)
- **Matchmaking text mode**: Ghép cặp riêng cho chế độ `text_1v1`
- **Giao diện chat luân phiên**: Player A và B gõ lập luận xen kẽ, giới hạn số lượt
- **AI phân tích inline**: Mỗi lượt gõ xong → backend phân tích ngụy biện + ArgKP matching
- **Solo vs AI (text)**: Người chơi tranh biện với Gemini AI (không cần đối thủ)
- **Kết quả và nhận xét**: Scoreboard sau trận với nhận xét chi tiết từ AI

### Tính năng bổ sung đã hoạt động
| Tính năng | Mô tả |
|---|---|
| 🔐 Đăng nhập | Clerk OAuth (Google) + username/password local |
| 📊 Dashboard | Stats cá nhân, lịch sử trận, bảng xếp hạng, cửa hàng |
| 👥 Kết bạn | Gửi/chấp nhận lời mời, xem profile bạn bè |
| 💬 Chat | Chat riêng với bạn bè + chat cộng đồng toàn server |
| 🎪 Sự kiện | Tham gia, nộp bài viết, bình chọn sự kiện |
| 👁️ Spectate | Xem phòng tranh biện đang diễn ra (public rooms) |
| 🏠 Tạo phòng | Tạo phòng code và mời bạn vào trực tiếp |
| 🏆 Thành tích | Hệ thống achievement tự động mở khóa |
| 🎵 Nhạc nền | Music player floating, điều chỉnh âm lượng |
| 🦀 Mascot | Interactive mascot với animation và thoại ngẫu nhiên |
| 📅 Điểm danh | Điểm danh hàng ngày nhận Điểm Tích Lũy |
| 🛒 Cửa hàng | Mua khung avatar, huy hiệu, thẻ đổi nickname |

---

## 🚀 Hướng dẫn chạy ứng dụng

### Yêu cầu hệ thống
- Python 3.10+
- Node.js 18+
- Google Chrome hoặc Microsoft Edge (để dùng Web Speech API)
- GEMINI_API_KEY (lấy tại https://aistudio.google.com/apikey)

### Bước 1: Cài đặt Backend

```powershell
# Di chuyển vào thư mục backend
cd backend

# Kích hoạt virtual environment (Windows)
..\venv\Scripts\activate
# Hoặc tạo mới nếu chưa có:
python -m venv venv
..\venv\Scripts\activate

# Cài thư viện
pip install -r requirements.txt
```

Tạo file `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://neondb_owner:...@ep-cool-dust-...neon.tech/neondb?sslmode=require
```

Chạy server:
```powershell
uvicorn main:app --reload --port 8000
```

### Bước 2: Cài đặt Frontend

```powershell
# Mở terminal mới, từ thư mục gốc kaiko/
cd frontend
npm install
npm run dev
```

### Bước 3: Truy cập
Mở trình duyệt tại: **http://localhost:5173**

### Bước 4 (Optional): Cài đặt ML Model local
Nếu muốn chạy inference hoàn toàn local (không fallback Gemini):
1. Download model từ Kaggle notebook output
2. Giải nén vào `backend/fallacy_model/kaiko_fallacy_model_final/`
3. Giải nén vào `backend/fallacy_model/kaiko_argkp_model_final/`
4. Restart uvicorn

---

## ⚠️ Giới hạn và Lỗi đã biết

### Giới hạn hiện tại
| Vấn đề | Mô tả |
|---|---|
| Speech API | Chỉ hoạt động trên Chrome/Edge; Firefox không hỗ trợ Web Speech API |
| WebRTC NAT | Trong mạng doanh nghiệp/trường học có strict NAT, WebRTC P2P có thể không kết nối được; cần TURN server |
| Gemini quota | Free tier giới hạn 15 req/phút; nhiều người chơi đồng thời có thể bị rate limit |
| Model local | Model XLM-RoBERTa (~400MB) chưa được commit lên Git; cần download riêng từ Kaggle |
| Camera | Nếu không cấp quyền camera/mic, chế độ Video 1v1 không hoạt động |
| Database | Neon PostgreSQL free tier có giới hạn connection pool; quá tải có thể bị timeout |

### Lỗi đã biết
| Lỗi | Nguyên nhân | Giải pháp tạm |
|---|---|---|
| Video không hiển thị khi vào phòng | WebRTC stream chưa attach vào `<video>` element kịp thời | Reload trang, thử lại |
| `model_loaded: false` trong `/` response | Model folder chưa có | Fallback Gemini API hoạt động bình thường |
| CORS error khi gọi API | Backend chưa chạy hoặc sai port | Kiểm tra backend port 8000 |
| Speech recognition không nhận tiếng Việt | Browser locale | Thay đổi ngôn ngữ browser sang `vi-VN` |
| Mất kết nối WebSocket khi mạng yếu | Timeout không được handle đầy đủ | Tải lại trang, tìm trận lại |

---

## 🗂️ Cấu trúc code chính

```
kaiko/
├── backend/
│   ├── main.py              # 2253 dòng – tất cả API routes + WebSocket + DB
│   ├── utils_preprocess.py  # Nén transcript cho Gemini
│   ├── utils_cache.py       # Semantic cache
│   └── fallacy_model/       # Models đã train (cần download)
├── frontend/src/
│   ├── App.jsx              # State machine điều hướng các trang
│   ├── components/
│   │   ├── Dashboard.jsx    # 2784 dòng – hub chính toàn bộ tính năng
│   │   ├── DebateRoom.jsx   # Phòng video debate
│   │   ├── TextDebateRoom.jsx
│   │   └── Scoreboard.jsx
│   └── hooks/
│       ├── useSignaling.js  # WebSocket matchmaking
│       └── useWebRTC.js     # WebRTC P2P
└── ai_model/
    ├── data/                # Dataset training
    └── *.ipynb / *.py       # Training scripts
```

---

## 🤖 Chi tiết AI Features

### Fallacy Detection (XLM-RoBERTa)
- **Input**: Câu nói của người tranh biện (text)
- **Output**: Nhãn ngụy biện (13 loại) + confidence score
- **Trigger**: Mỗi lần người chơi dừng nói (speech recognition `onend`)
- **Endpoint**: `POST /analyze` → `{"text": "...", "speaker": "..."}`

### Argument-Key Point Matching (XLM-RoBERTa)
- **Input**: (argument, key_point/topic) cặp câu
- **Output**: Nhị phân – lập luận có relevant với chủ đề không (0/1)
- **Endpoint**: `POST /check-argument`

### Scoring (Gemini 2.5 Flash)
- **Input**: Toàn bộ transcript + danh sách ngụy biện của 2 người
- **Output**: Điểm (0–100) + nhận xét cho từng tiêu chí + tuyên bố người thắng
- **Endpoint**: `POST /score`
- **Optimization**: Transcript được nén bằng `utils_preprocess.py` để tiết kiệm token

---

## 📹 Video Demo

**File video:** `PA3_KaiKo_Demo.mp4`  
**Thời lượng:** 2–3 phút  

**Nội dung video:**
1. (0:00–0:30) Đăng nhập → Dashboard overview
2. (0:30–1:00) Chọn chế độ → Tìm trận Video 1v1 → ghép cặp
3. (1:00–1:45) Tranh biện video: demo speech-to-text + fallacy alert pop-up
4. (1:45–2:15) Kết thúc trận → Scoreboard với điểm AI và nhận xét
5. (2:15–2:30) Demo Text 1v1 hoặc Solo vs AI (quick run)
6. (2:30–2:50) Dashboard: xem lịch sử, leaderboard, tính năng social
7. (2:50–3:00) Kết

---

## 👥 Thông tin nhóm

**Group 09**  
*CSC10011 – Software Engineering for AI-enabled Systems*  
*Semester 2, 2025–2026*
