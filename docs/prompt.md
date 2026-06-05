# PROMPT: Kế hoạch Deploy + Debug cho project KaiKo

> Đây là file prompt để đưa cho AI agent (Claude Code / tương tự) tự lập kế hoạch và thực thi
> deploy có **chu trình kiểm tra → debug → sửa → kiểm tra lại** cho đến khi xanh.
> Copy nguyên file này làm prompt, hoặc tham chiếu trực tiếp khi làm việc.

---

## 0. Bối cảnh project

KaiKo là ứng dụng tranh biện (debate) realtime. Kiến trúc:

| Thành phần | Stack | Hạ tầng deploy | Thư mục |
|---|---|---|---|
| Frontend | React 19 + Vite 8, Clerk auth, socket.io-client | **Vercel** | `frontend/` |
| Backend API | FastAPI + uvicorn, WebSocket, Postgres (psycopg2) | **Railway** | `backend/` |
| AI Inference | PhoBERT (fallacy + ArgKP), Gemini fallback | **Tách thành service riêng** (xem mục 3) | `ai_model/`, hiện đang nhúng trong `backend/main.py` |

Cấu hình hiện có:
- `frontend/config.js` (`src/config.js`): đọc `VITE_API_BASE`, suy ra `WS_BASE`.
- `frontend/vercel.json`: chỉ có `rewrites` SPA, **chưa khai báo `outputDirectory`**.
- `backend/Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- `backend/runtime.txt`: `python-3.11.9`
- `backend/requirements.txt`: **đang có `transformers`, `torch`, `sentencepiece`** → nặng, là nguyên nhân chính khiến deploy backend chậm/fail.

**Nguyên tắc xuyên suốt:** Mỗi thay đổi phải đi kèm 1 bước verify cụ thể. Không gộp nhiều sửa đổi rồi mới test. Sửa 1 thứ → build/chạy → đọc log → xác nhận → sang bước kế.

---

## 1. FRONTEND — Sửa lỗi build trên Vercel

### Triệu chứng (log thực tế)
```
✓ built in 541ms                      <-- vite build THÀNH CÔNG, output ra dist/
Error: No Output Directory named "build" found after the Build completed.
```

### Chẩn đoán
- Vite build thành công và xuất ra thư mục **`dist/`** (mặc định của Vite).
- Nhưng Vercel đang đi tìm thư mục **`build/`** → tức **Framework Preset của project trên Vercel đang bị đặt sai** (nhiều khả năng là "Create React App", preset này dùng `build/`), hoặc Output Directory bị set thủ công sai.
- => Build ra `dist`, Vercel tìm `build`, không khớp → fail.

### Việc cần làm (chọn 1, ưu tiên cách A vì cố định trong repo)

**Cách A — Khai báo rõ trong `frontend/vercel.json` (khuyến nghị):**
Thêm `outputDirectory` (và nên khai báo luôn framework/buildCommand cho chắc):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Cách B — Sửa trên dashboard Vercel:** Project → Settings → Build & Deployment:
- Framework Preset = **Vite**
- Output Directory = `dist` (hoặc để override off cho Vite tự nhận)
- Root Directory = `frontend` (vì repo là monorepo, frontend nằm trong subfolder — **kiểm tra cái này, rất hay bị sai**).

### Các điểm cần kiểm tra thêm (đừng bỏ qua)
1. **Root Directory trên Vercel phải là `frontend`** — không phải gốc repo. Nếu sai, mọi path đều lệch.
2. **Asset runtime warning**: log có dòng
   `/assets/backgrounds/play_hero_bg.png ... didn't resolve at build time`.
   → Kiểm tra cách reference ảnh: nếu để trong `public/` thì path runtime `/assets/...` là ok;
   nếu import qua JS thì phải `import bg from '...'`. Xác nhận ảnh thật sự load trên production, không chỉ build pass.
3. **Biến môi trường trên Vercel** (Settings → Environment Variables):
   - `VITE_API_BASE` = URL backend Railway (vd `https://kaiko-backend.up.railway.app`) — **không có dấu `/` cuối**.
   - `VITE_CLERK_PUBLISHABLE_KEY` = key Clerk production.
   - Đổi env xong phải **redeploy** mới ăn (Vite inline biến lúc build).
4. **Bundle 597 kB > 500 kB**: chỉ là cảnh báo, không chặn deploy. Có thể để sau; nếu tối ưu thì code-split bằng `React.lazy` cho các route nặng (DebateRoom, TextDebateRoom, Dashboard).

### Chu trình kiểm tra Frontend
```
[1] Build local:   cd frontend && npm ci && npm run build
    → Phải thấy "dist/" được tạo, không có Error.
[2] Preview local: npm run preview  → mở thử, kiểm app render, gọi API/WS không lỗi CORS.
[3] Commit + push → Vercel auto deploy.
[4] Đọc Vercel build log:
      - PASS nếu: không còn "No Output Directory", deploy READY.
      - FAIL  → đọc dòng Error cuối → quay lại [1] sửa đúng nguyên nhân.
[5] Smoke test trên domain Vercel: login Clerk, vào 1 phòng debate, kiểm Network tab:
      request tới VITE_API_BASE trả 200, WebSocket nối được (wss://...).
```

---

## 2. BACKEND — Deploy lên Railway

> Lưu ý: **không deploy backend như hiện tại** cho đến khi hoàn thành mục 3 (tách AI ra API).
> Lý do: `torch` + `transformers` làm image rất nặng, build lâu, dễ vượt RAM/timeout của Railway,
> và load model lúc khởi động sẽ làm chậm cold start + tốn bộ nhớ.

### Việc cần làm
1. **Railway service cho backend**: Root = `backend/`, dùng `Procfile` (`uvicorn main:app --host 0.0.0.0 --port $PORT`) và `runtime.txt` (Python 3.11.9) đã có.
2. **Postgres**: thêm plugin Postgres của Railway, reference `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. Chạy migration nếu cần (`backend/migrate_to_pg.py`, `add_visibility_col.py`).
3. **Biến môi trường Railway**:
   - `DATABASE_URL` (từ plugin Postgres)
   - `GEMINI_API_KEY`
   - `AI_SERVICE_URL` (URL của AI inference service ở mục 3)
   - (sau khi tách AI) **bỏ** `transformers`, `torch`, `sentencepiece` khỏi `requirements.txt`.
4. **CORS**: trong `backend/main.py` đảm bảo cho phép origin của frontend Vercel (domain production + preview).
5. **WebSocket**: Railway hỗ trợ WS qua HTTPS → frontend phải dùng `wss://`. `config.js` đã tự suy `WS_BASE` từ `http→ws`, nên chỉ cần `VITE_API_BASE` là `https://...`.

### Chu trình kiểm tra Backend
```
[1] Chạy local:  cd backend && pip install -r requirements.txt && uvicorn main:app --reload
    → /docs mở được, các endpoint /analyze, /check-argument, /analyze-text phản hồi.
[2] Deploy Railway → đọc Deploy Logs:
      - PASS: "Application startup complete", health OK.
      - FAIL: đọc traceback (thường là thiếu env, lỗi kết nối Postgres, hoặc OOM khi load model).
[3] Test endpoint production bằng curl/Postman:
      curl -X POST $AI_OR_BACKEND_URL/analyze -H 'Content-Type: application/json' -d '{"text":"..."}'
[4] Test tích hợp: từ frontend Vercel gọi xuyên suốt 1 luồng debate thật.
```

---

## 3. TÁCH AI MODEL THÀNH API (làm TRƯỚC khi deploy backend)

### Mục tiêu
Hiện `backend/main.py` import trực tiếp `torch`, `transformers` và `load_model()` lúc khởi động
(`FALLACY_MODEL_PATH`, `ARGKP_MODEL_PATH`, các hàm dùng model tại `/analyze` dòng ~1561,
`/check-argument` dòng ~1638). Cần **tách phần inference ra 1 service riêng**, backend chỉ gọi HTTP,
không nhúng torch/transformers nữa.

### Kiến trúc đích
```
Frontend (Vercel)
      │  HTTPS / WSS
      ▼
Backend API (Railway, FastAPI nhẹ — KHÔNG torch)
      │  HTTP nội bộ
      ▼
AI Inference Service (service riêng: Railway/HF Spaces/Modal/RunPod...)
      ├─ PhoBERT fallacy model
      └─ PhoBERT ArgKP model
```

### Việc cần làm
1. **Tạo service inference riêng** (vd thư mục `ai_service/` hoặc repo riêng):
   - FastAPI nhỏ với 2 endpoint tối thiểu:
     - `POST /predict/fallacy` → input `{ "text": "..." }` → output `{ "label": "...", "label_vi": "...", "scores": {...} }`
     - `POST /predict/argkp`  → input `{ "argument": "...", "key_point": "..." }` (theo đúng schema `ArgInput` hiện tại) → output điểm/nhãn.
   - Bê nguyên logic tokenize + `torch.softmax(logits)` từ `backend/main.py` (đoạn `/analyze`, `/check-argument`) sang đây.
   - `requirements.txt` của service này MỚI chứa `torch`, `transformers`, `sentencepiece`.
   - Model weights: **không commit vào git** (nặng). Tải từ object storage / HuggingFace Hub lúc khởi động, hoặc dùng platform có persistent volume.
2. **Sửa `backend/main.py`**:
   - Bỏ `import torch`, `from transformers import ...`, bỏ `load_model()` và biến model toàn cục.
   - Tại `/analyze` và `/check-argument`: thay phần chạy model bằng `httpx`/`requests` gọi
     `AI_SERVICE_URL` (đọc từ env). Giữ nguyên contract response để frontend không phải đổi.
   - **Giữ Gemini fallback**: nếu AI service lỗi/timeout → fallback sang Gemini (logic fallback đã có sẵn ý tưởng trong code).
3. **Gỡ dependency nặng** khỏi `backend/requirements.txt`: xóa `transformers`, `torch`, `sentencepiece`. Thêm `httpx` (nếu chưa có).
4. **Env mới**: `AI_SERVICE_URL` ở cả local (`.env`) và Railway.

### Chu trình kiểm tra phần tách AI
```
[1] AI service chạy local (port 8001):
      curl -X POST localhost:8001/predict/fallacy -d '{"text":"..."}'
      → output giống hệt kết quả model cũ trả ra (so sánh trực tiếp với main.py bản cũ).
[2] Backend local trỏ AI_SERVICE_URL=localhost:8001 → gọi /analyze của backend
      → kết quả phải KHỚP với bản nhúng model cũ (regression test).
[3] Tắt AI service → gọi /analyze → phải fallback Gemini, KHÔNG crash.
[4] Deploy AI service riêng → lấy URL → set vào Railway backend → test lại [2] trên production.
```

### Kiểm thử hồi quy (bắt buộc)
Trước khi xóa code model cũ, lưu lại vài cặp input→output mẫu (5–10 câu) từ bản hiện tại.
Sau khi chuyển sang API, chạy lại đúng các input đó và **so khớp output**. Lệch nghĩa là port sai.

---

## 4. THỨ TỰ THỰC HIỆN TỔNG (làm tuần tự, mỗi mốc phải xanh mới đi tiếp)

```
B1. Fix Frontend Vercel (mục 1)        → Vercel deploy READY, app mở được.
B2. Tách AI thành service (mục 3)      → regression test khớp, fallback Gemini OK.
B3. Làm nhẹ backend, deploy Railway    → /docs production OK, Postgres kết nối OK.
B4. Nối dây end-to-end                 → set VITE_API_BASE (Vercel) = URL Railway,
                                          set AI_SERVICE_URL (Railway) = URL AI service.
B5. Smoke test toàn luồng              → login → tạo phòng → debate → fallacy detect →
                                          chấm điểm → lưu match. Đọc log cả 3 service.
```

---

## 5. CHECKLIST PHÁT HIỆN & DEBUG NHANH

| Triệu chứng | Nơi xem | Nguyên nhân thường gặp |
|---|---|---|
| Vercel "No Output Directory build" | Vercel build log | Framework preset sai / thiếu `outputDirectory: dist` |
| Frontend gọi API lỗi CORS | Browser DevTools → Console/Network | Backend CORS chưa cho origin Vercel |
| WebSocket không nối | Network → WS tab | Dùng `ws://` thay vì `wss://`, hoặc `VITE_API_BASE` là http |
| Ảnh không hiện | Network 404 | Asset không nằm trong `public/`, path sai |
| Railway build timeout/OOM | Railway deploy log | Vẫn còn `torch`/`transformers` trong requirements |
| `/analyze` trả 500 | Railway log + AI service log | `AI_SERVICE_URL` sai / AI service chưa load model |
| Env không ăn trên Vercel | — | Quên redeploy sau khi đổi biến `VITE_*` |
| Postgres connect fail | Railway log | `DATABASE_URL` chưa reference plugin |

---

## 6. YÊU CẦU ĐẦU RA KHI CHẠY PROMPT NÀY

AI thực thi phải, theo từng bước B1→B5:
1. Nêu rõ **đang làm bước nào**, sửa file gì, vì sao.
2. Sau mỗi sửa đổi: **chạy lệnh verify tương ứng** và **dán log/kết quả thật**.
3. Nếu fail: đọc đúng dòng lỗi, nêu giả thuyết, sửa, verify lại — không đoán mò gộp nhiều thứ.
4. Không chuyển bước khi bước hiện tại chưa xanh.
5. Kết thúc: tóm tắt URL frontend, URL backend, URL AI service và trạng thái smoke test cuối.
```
```
