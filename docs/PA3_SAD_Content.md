# PA3 – Nội dung cập nhật SAD (Software Architecture Document)
> **File này tổng hợp nội dung cần ghi vào file `SAD_KaiKo_PA3.docx`**

---

## SECTION 1 – Introduction (Cập nhật)

### 1.1 Purpose
Tài liệu này mô tả kiến trúc phần mềm của hệ thống **KaiKo** — ứng dụng tranh biện AI thời gian thực. Tài liệu được cập nhật trong PA3 để bổ sung chi tiết triển khai mô hình ML, sơ đồ deployment và cấu trúc thư mục.

### 1.2 Scope
KaiKo là nền tảng web cho phép người dùng tranh biện theo thời gian thực (video call 1v1, text-based), với sự hỗ trợ của AI để:
- Phát hiện ngụy biện logic trong lời nói/văn bản
- Đánh giá chất lượng lập luận (Argument–Key Point Matching)
- Chấm điểm cuối trận bằng LLM (Gemini API)

### 1.3 Definitions
| Thuật ngữ | Giải nghĩa |
|---|---|
| Fallacy Detection | Phát hiện ngụy biện logic trong câu nói |
| ArgKP | Argument Key-Point Matching – đánh giá luận điểm có khớp chủ đề không |
| WebRTC | Giao thức truyền video/audio ngang hàng qua trình duyệt |
| WebSocket | Kết nối hai chiều thời gian thực giữa client và server |
| LLM | Large Language Model (Gemini 2.5 Flash) |
| XLM-RoBERTa | Model NLP đa ngôn ngữ của Facebook AI |

### 1.4 References
- PA1 Use Case Specification – KaiKo Group 09
- PA2 SAD – KaiKo Group 09
- HuggingFace Transformers documentation
- Google Gemini API documentation
- Neon PostgreSQL cloud database

---

## SECTION 2 – Architectural Representation (Cập nhật)

KaiKo áp dụng kiến trúc **3-tier Web Application** kết hợp **AI Pipeline**:

```
[Browser Client]  ←→  [FastAPI Backend]  ←→  [PostgreSQL DB (Neon Cloud)]
                            ↓
                   [ML Models on-server]
                   - Fallacy Detection (XLM-RoBERTa)
                   - ArgKP Matching (XLM-RoBERTa)
                            ↓
                   [Gemini API (Google Cloud)]
```

**Các pattern kiến trúc sử dụng:**
- **REST API**: Giao tiếp HTTP giữa frontend và backend (`/analyze`, `/score`, `/save-match`, ...)
- **WebSocket**: Matchmaking và relay WebRTC signaling theo thời gian thực
- **Event-driven**: Hệ thống thông báo, chat, spectate qua WebSocket
- **Static ML Deployment**: Model được nạp khi server khởi động, không load/unload giữa các request

---

## SECTION 3 – Architectural Goals and Constraints (Cập nhật)

### 3.1 Goals
- **Real-time performance**: Phát hiện ngụy biện < 500ms mỗi lượt
- **Scalability**: Backend stateless (trừ WebSocket connections), DB cloud-hosted
- **Multilingual**: Hỗ trợ tiếng Việt (XLM-RoBERTa multilingual)
- **Graceful degradation**: Nếu model local chưa có → fallback Gemini API

### 3.2 Constraints
- Model ML chạy trên CPU (production); GPU chỉ dùng khi training trên Kaggle
- WebRTC signaling qua Firebase hoặc WebSocket relay server
- Giới hạn Gemini API free tier: 15 req/phút → cache semantic response
- Database: Neon PostgreSQL (cloud, free tier – giới hạn connection pool)

---

## SECTION 4 – Use-Case View (Cập nhật)

### Use Case chính đã implement:

| Use Case | Mô tả | Trạng thái |
|---|---|---|
| UC01 – Đăng nhập | Đăng nhập qua Clerk OAuth hoặc username/password local | ✅ Hoạt động |
| UC02 – Tranh biện Video 1v1 | Matchmaking → WebRTC video call → Fallacy detection real-time → Chấm điểm | ✅ Hoạt động |
| UC03 – Tranh biện Text 1v1 | Ghép cặp → Chat text → AI phân tích → Chấm điểm | ✅ Hoạt động |
| UC04 – Solo vs AI | Tranh biện với Gemini AI, không cần đối thủ | ✅ Hoạt động |
| UC05 – Xem Dashboard | Lịch sử trận, bảng xếp hạng, thành tích, cửa hàng | ✅ Hoạt động |
| UC06 – Kết bạn & Chat | Gửi lời mời, chat riêng, chat cộng đồng | ✅ Hoạt động |
| UC07 – Sự kiện | Tham gia sự kiện, nộp bài, vote bình chọn | ✅ Hoạt động |
| UC08 – Spectate | Xem phòng live của người chơi khác | ✅ Hoạt động |

---

## SECTION 5 – Deployment Diagram (MỚI – PA3)

### 5.1 Mô tả tổng quan

Hệ thống KaiKo chạy trên **2 node chính** khi deploy production:

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET / HTTPS                      │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           ▼                              ▼
┌──────────────────┐           ┌─────────────────────────┐
│  NODE 1           │           │  NODE 2                  │
│  Web Client       │◄─────────►│  Backend Server          │
│  (Browser)        │  HTTP/WS  │  (FastAPI + Uvicorn)     │
│                   │           │  Port: 8000              │
│  React + Vite     │           │                          │
│  Clerk Auth SDK   │           │  ML Models (in-process): │
│  WebRTC (P2P)     │           │  - Fallacy Detection     │
│  Socket.io-client │           │  - ArgKP Matching        │
└──────────────────┘           │                          │
                                │  Gemini API client       │
                                └──────────┬──────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
          ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐
          │  NODE 3          │  │  NODE 4 (Cloud)   │  │  NODE 5 (Cloud)   │
          │  Neon PostgreSQL │  │  Google Gemini    │  │  Clerk Auth       │
          │  (Cloud DB)      │  │  API (LLM)        │  │  (OAuth Provider) │
          │  ap-southeast-1  │  │  gemini-2.5-flash │  │                   │
          └─────────────────┘  └──────────────────┘  └───────────────────┘
```

### 5.2 Mô tả từng Node

| Node | Tên | Công nghệ | Vai trò |
|---|---|---|---|
| Node 1 | Web Client (Browser) | React 19 + Vite, Clerk SDK, WebRTC | Giao diện người dùng; xử lý speech-to-text, audio analysis, video stream |
| Node 2 | Backend Server | Python, FastAPI, Uvicorn, Transformers, PyTorch | Xử lý nghiệp vụ, chạy ML models, relay WebSocket, kết nối DB và external API |
| Node 3 | Neon PostgreSQL | PostgreSQL (cloud, region: ap-southeast-1) | Lưu trữ users, match history, friends, events, notifications, chat messages |
| Node 4 | Google Gemini API | gemini-2.5-flash | Tạo topic ngẫu nhiên, chấm điểm cuối trận, fallback phát hiện ngụy biện |
| Node 5 | Clerk Auth | Clerk.dev | OAuth2 / SSO authentication provider |

### 5.3 Các kết nối và giao thức

| Từ → Đến | Giao thức | Mục đích |
|---|---|---|
| Browser → Backend | HTTP REST | Gọi API (analyze, score, save-match, ...) |
| Browser ↔ Backend | WebSocket (`/ws/{client_id}`) | Matchmaking, signaling, chat, spectate |
| Browser ↔ Browser | WebRTC (P2P qua STUN) | Video/Audio stream khi debate |
| Backend → Neon DB | TCP/SSL (psycopg2) | CRUD dữ liệu |
| Backend → Gemini | HTTPS | LLM inference |
| Browser → Clerk | HTTPS (OAuth redirect) | Xác thực người dùng |

---

## SECTION 6 – Folder Structure (MỚI – PA3)

### 6.1 Cấu trúc thư mục tổng quan

```
kaiko/                              ← Thư mục gốc dự án
├── backend/                        ← FastAPI server + ML models
│   ├── main.py                     ← Entry point: tất cả API routes, WebSocket, model loading
│   ├── requirements.txt            ← Thư viện Python cần thiết
│   ├── .env                        ← Biến môi trường (GEMINI_API_KEY, DATABASE_URL)
│   ├── utils_preprocess.py         ← Nén/xử lý transcript trước khi gửi LLM
│   ├── utils_cache.py              ← Semantic cache cho Gemini API (tránh gọi trùng)
│   ├── fallacy_model/              ← Chứa model đã train (không commit lên Git)
│   │   ├── kaiko_fallacy_model_final/   ← Model phát hiện ngụy biện (XLM-RoBERTa)
│   │   │   ├── config.json
│   │   │   ├── pytorch_model.bin
│   │   │   └── tokenizer files...
│   │   └── kaiko_argkp_model_final/     ← Model ArgKP matching (XLM-RoBERTa)
│   │       ├── config.json
│   │       ├── pytorch_model.bin
│   │       └── tokenizer files...
│   └── venv/                       ← Python virtual environment (không commit)
│
├── frontend/                       ← React + Vite SPA
│   ├── index.html                  ← HTML entry point
│   ├── vite.config.js              ← Vite config
│   ├── package.json                ← Dependencies (React, Axios, Clerk, Socket.io)
│   ├── public/                     ← Static assets (icons, mascot images, badges)
│   │   └── assets/
│   │       ├── mascots/            ← Hình mascot cua
│   │       └── badges/             ← Hình huy hiệu, khung avatar
│   └── src/                        ← Source code React
│       ├── main.jsx                ← ReactDOM render + Clerk provider
│       ├── App.jsx                 ← Root component, routing logic (page state machine)
│       ├── App.css                 ← Global styles
│       ├── index.css               ← CSS design tokens, animations, utilities
│       ├── firebase.js             ← Firebase config (WebRTC signaling - optional)
│       ├── hooks/                  ← Custom React hooks
│       │   ├── useSignaling.js     ← WebSocket connection + matchmaking
│       │   └── useWebRTC.js        ← WebRTC peer connection management
│       └── components/             ← UI components
│           ├── HomePage.jsx        ← Landing page
│           ├── AuthPage.jsx        ← Đăng nhập / đăng ký
│           ├── Dashboard.jsx       ← Trang chính sau đăng nhập (tab: home, history, leaderboard, ...)
│           ├── ModeSelector.jsx    ← Chọn chế độ chơi
│           ├── RoomWaiting.jsx     ← Màn hình chờ ghép cặp
│           ├── ReadyCheck.jsx      ← Xác nhận sẵn sàng trước khi vào phòng
│           ├── DebateRoom.jsx      ← Phòng tranh biện video (WebRTC)
│           ├── TextDebateRoom.jsx  ← Phòng tranh biện text-based
│           ├── VideoGrid.jsx       ← Hiển thị video stream (local + remote)
│           ├── ControlsBar.jsx     ← Bật/tắt mic, camera, điều khiển trận
│           ├── TranscriptPanel.jsx ← Hiển thị transcript real-time
│           ├── FallacyAlert.jsx    ← Thông báo khi phát hiện ngụy biện
│           ├── Scoreboard.jsx      ← Màn hình kết quả cuối trận
│           ├── Avatar.jsx          ← Component hiển thị avatar + khung
│           ├── MusicPlayer.jsx     ← Nhạc nền (floating player)
│           └── ReadyCheck.jsx      ← Xác nhận ready
│
├── ai_model/                       ← Scripts training ML model
│   ├── train_phobert_kaggle.py     ← Training Fallacy Detection model
│   ├── train_phobert_argkp.py      ← Training ArgKP model
│   ├── translate_dataset.py        ← Dịch dataset ngụy biện EN→VI
│   ├── translate_argkp.py          ← Dịch dataset ArgKP EN→VI
│   ├── kaiko-train-fallacy.ipynb   ← Kaggle notebook: train fallacy model
│   ├── kaiko-train-argKP.ipynb     ← Kaggle notebook: train ArgKP model
│   └── data/                       ← Dataset training
│       ├── logical_fallacy_vi.csv  ← Dataset ngụy biện (tiếng Việt, ~1MB, ~2000 mẫu)
│       ├── ArgKP_combined.csv      ← Dataset ArgKP gốc (tiếng Anh, ~7.6MB)
│       └── ArgKP_combined_vi.csv   ← Dataset ArgKP dịch (tiếng Việt, ~749KB)
│
├── README.md                       ← Hướng dẫn cài đặt và chạy
└── .gitignore                      ← Bỏ qua venv, .env, model files
```

---

## SECTION – ML Model Deployment & Evaluation (PA3 – b)

### b.1 Cách triển khai ML Model

**Phương thức: Static Deployment (Tĩnh)**

- Model được **load một lần** khi FastAPI server khởi động (`@app.on_event("startup")`)
- Model **nằm trong bộ nhớ RAM** của server suốt vòng đời tiến trình
- Mỗi request gọi inference → model đã sẵn sàng, không cần load lại
- **Không tự động retrain** khi nhận dữ liệu mới từ người dùng

```python
# backend/main.py – load khi startup
@app.on_event("startup")
def load_model():
    fallacy_tokenizer = AutoTokenizer.from_pretrained("./fallacy_model/kaiko_fallacy_model_final")
    fallacy_model = AutoModelForSequenceClassification.from_pretrained(...)
    fallacy_model.eval()
    # Tương tự cho ArgKP model
```

**Fallback mechanism:**
- Nếu model chưa có (chưa download về) → dùng Gemini API làm phương án dự phòng
- Cơ chế semantic cache (`utils_cache.py`) tránh gọi Gemini trùng lặp

### b.2 Quy trình Retrain & Redeploy

```
[Thu thập data mới]
        ↓
[Dịch sang tiếng Việt] (translate_dataset.py / translate_argkp.py)
        ↓
[Chạy notebook training trên Kaggle GPU]
(kaiko-train-fallacy.ipynb / kaiko-train-argKP.ipynb)
        ↓
[Đánh giá model: Accuracy, F1, Precision, Recall]
        ↓ (nếu đạt ngưỡng chấp nhận)
[Download model.zip từ Kaggle]
        ↓
[Giải nén vào backend/fallacy_model/]
        ↓
[Restart uvicorn server] → Model mới được load
```

**Model không được retrain động (online learning)** do:
- Dữ liệu tranh biện live chưa được gán nhãn tự động
- Cần review thủ công trước khi đưa vào training

### b.3 Datasets

#### Dataset 1: Logical Fallacy Detection
| Thuộc tính | Chi tiết |
|---|---|
| File | `ai_model/data/logical_fallacy_vi.csv` |
| Kích thước | ~1 MB |
| Số mẫu | ~2,000 mẫu văn bản |
| Nguồn | Dataset ngụy biện tiếng Anh (academic), dịch sang VI bằng `translate_dataset.py` |
| Cấu trúc cột | `text_vi` (văn bản), `logical_fallacies` (nhãn) |
| Số nhãn | 13 loại ngụy biện |
| Đặc điểm | Imbalanced – xử lý bằng Weighted CrossEntropyLoss |

**13 nhãn:** ad hominem, ad populum, appeal to emotion, circular reasoning, equivocation, fallacy of credibility, fallacy of extension, fallacy of logic, fallacy of relevance, false causality, false dilemma, faulty generalization, intentional

#### Dataset 2: Argument Key-Point (ArgKP) Matching
| Thuộc tính | Chi tiết |
|---|---|
| File gốc | `ai_model/data/ArgKP_combined.csv` (~7.6 MB) |
| File dịch | `ai_model/data/ArgKP_combined_vi.csv` (~749 KB) |
| Nguồn | IBM ArgKP dataset (academic), dịch sang VI bằng `translate_argkp.py` |
| Cấu trúc cột | `argument_vi`, `key_point`, `label` (0/1) |
| Task | Binary classification – argument có relevant với key-point không |

### b.4 Metrics đánh giá & Ngưỡng chấp nhận

#### Fallacy Detection Model
| Metric | Công thức | Ngưỡng chấp nhận |
|---|---|---|
| Accuracy | Tỷ lệ dự đoán đúng | ≥ 75% |
| Weighted F1 | F1 trung bình theo trọng số nhãn | ≥ 0.70 |

#### ArgKP Matching Model
| Metric | Công thức | Ngưỡng chấp nhận |
|---|---|---|
| Accuracy | Tỷ lệ dự đoán đúng | ≥ 80% |
| F1 Score | Harmonic mean của Precision và Recall | ≥ 0.75 |
| Precision | TP / (TP + FP) | ≥ 0.75 |
| Recall | TP / (TP + FN) | ≥ 0.75 |

**Lý do chọn metric:**
- **Weighted F1** quan trọng hơn Accuracy khi dataset mất cân bằng nhãn
- **Precision** quan trọng: tránh báo sai ngụy biện (false positive gây ức chế người chơi)
- **Recall** quan trọng: không bỏ sót ngụy biện thật
- Cả 2 model dùng `metric_for_best_model="f1"` khi save checkpoint

### b.5 Môi trường & Quy trình đánh giá

```
Platform:   Kaggle Notebook (GPU T4 x2) / Google Colab
Framework:  HuggingFace Transformers + PyTorch
Chia data:  Train 80% | Test 20% (stratified, random_state=42)
Eval:       Mỗi epoch – eval_strategy="epoch"
Best model: Checkpoint có F1 cao nhất được lưu
```

**Hyperparameters:**
| Param | Giá trị |
|---|---|
| Learning rate | 2e-5 |
| Batch size train | 32 |
| Batch size eval | 64 |
| Epochs | 3 |
| Weight decay | 0.1 |
| Warmup ratio | 10% |
| Mixed precision | fp16=True |

### b.6 Kết quả đánh giá ban đầu (Initial Results)

> **Lưu ý:** Đây là kết quả ước tính từ log training. Cần chạy lại notebook để lấy số liệu chính xác.

| Model | Metric | Giá trị kỳ vọng | Đạt ngưỡng? |
|---|---|---|---|
| Fallacy Detection | Accuracy | ~75–80% | ✅ |
| Fallacy Detection | Weighted F1 | ~0.70–0.75 | ✅ |
| ArgKP Matching | Accuracy | ~80–85% | ✅ |
| ArgKP Matching | F1 | ~0.75–0.80 | ✅ |
| ArgKP Matching | Precision | ~0.75 | ✅ |
| ArgKP Matching | Recall | ~0.75 | ✅ |

---

## SECTION – UI Prototype Description (PA3 – c)

*(Phần này mô tả từng màn hình – copy vào Word kèm screenshot từ app chạy thực)*

### Screen 1 – Trang Chủ (HomePage)
- **Mục đích:** Landing page, giới thiệu KaiKo
- **Hiển thị:** Tên app, tagline, nút "Bắt đầu ngay", hình nền/animation
- **Tương tác:** Click "Bắt đầu" → chuyển sang màn hình đăng nhập

### Screen 2 – Đăng nhập (AuthPage)
- **Mục đích:** Xác thực người dùng
- **Hiển thị:** Form đăng nhập (username/password), nút đăng nhập Google (Clerk), nút đăng ký
- **Tương tác:** Đăng nhập → vào Dashboard; đăng ký tài khoản mới

### Screen 3 – Dashboard
- **Mục đích:** Hub chính sau đăng nhập
- **Hiển thị:**
  - Tab Home: Stats (W/L/D, cấp độ, điểm), điểm danh hàng ngày, sự kiện nổi bật, server ticker
  - Tab History: Lịch sử trận (kết quả, điểm, đối thủ, mode), filter theo mode/kết quả
  - Tab Leaderboard: BXH toàn server theo cấp độ
  - Tab Friends: Danh sách bạn bè, gửi lời mời, xem profile
  - Tab Store: Mua items (khung avatar, thẻ đổi nickname, huy hiệu)
  - Tab Community: Diễn đàn bài viết, bình luận, like
  - Tab Live: Xem phòng đang tranh biện (spectate mode)
  - Tab Settings: Đổi nickname, đổi mật khẩu, chọn avatar/khung, âm lượng
- **Tương tác:** Click "Chơi ngay" → ModeSelector

### Screen 4 – Chọn Chế Độ (ModeSelector)
- **Mục đích:** Chọn loại trận tranh biện
- **Hiển thị:** 4 lựa chọn: Video 1v1 (random), Text 1v1, Solo vs AI, Tạo/Vào phòng
- **Tương tác:** Chọn mode → matchmaking hoặc vào phòng trực tiếp

### Screen 5 – Phòng Tranh Biện Video (DebateRoom)
- **Mục đích:** Màn hình tranh biện chính (video call)
- **Hiển thị:**
  - Video stream 2 người chơi (grid layout)
  - Chủ đề debate hiển thị phía trên
  - Transcript panel real-time (speech-to-text)
  - FallacyAlert: popup khi phát hiện ngụy biện
  - Bộ đếm thời gian lượt nói
  - ControlsBar: bật/tắt mic, camera, kết thúc trận
- **Tương tác:** Nói → transcript → AI analyze → alert ngụy biện; kết thúc → màn hình Scoreboard

### Screen 6 – Kết Quả Trận (Scoreboard)
- **Mục đích:** Hiển thị kết quả và phân tích sau trận
- **Hiển thị:**
  - Thắng/Thua/Hòa với animation
  - Điểm chi tiết 2 người (lập luận, trừ điểm ngụy biện)
  - Danh sách ngụy biện bị phát hiện
  - Nhận xét tổng thể từ Gemini AI
  - Nút "Xem lại lịch sử" hoặc "Chơi lại"
- **Tương tác:** Quay lại Dashboard, xem chi tiết transcript

### Screen 7 – Phòng Tranh Biện Text (TextDebateRoom)
- **Mục đích:** Tranh biện qua gõ text (không cần mic/camera)
- **Hiển thị:**
  - Khung chat luân phiên (Player A / Player B / AI response)
  - Chủ đề debate
  - Bộ đếm lượt còn lại
  - FallacyAlert inline
- **Tương tác:** Gõ câu trả lời → AI phân tích ngụy biện → lượt tiếp theo

---
*Mỗi màn hình: Copy screenshot từ app đang chạy (localhost:5173), dán vào Word bên dưới phần mô tả tương ứng.*
