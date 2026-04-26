# KaiKo — Hướng Dẫn Xây Dựng App Tranh Biện AI

> **Dành cho nhóm phát triển KaiKo** — Video Debate + AI Fallacy Detection  
> Stack: React (Frontend) · Python FastAPI (Backend) · Kaggle GPU T4 (Train model)

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cài đặt môi trường](#2-cài-đặt-môi-trường)
3. [Backend — FastAPI](#3-backend--fastapi)
4. [Fine-tune model phát hiện ngụy biện](#4-fine-tune-model-phát-hiện-ngụy-biện)
5. [Frontend — React](#5-frontend--react)
6. [Video Call với WebRTC](#6-video-call-với-webrtc)
7. [Speech-to-Text với Web Speech API](#7-speech-to-text-với-web-speech-api)
8. [Tích hợp model vào app](#8-tích-hợp-model-vào-app)
9. [Chấm điểm bằng LLM API](#9-chấm-điểm-bằng-llm-api)
10. [Phân tích Video — MediaPipe (Eye contact, Cử chỉ, Cảm xúc)](#10-phân-tích-video--mediapipe)
11. [Phân tích Audio — Âm lượng & Giọng run](#11-phân-tích-audio--âm-lượng--giọng-run)
12. [Scoreboard nâng cao — Phân tích lỗi & Gợi ý](#12-scoreboard-nâng-cao--phân-tích-lỗi--gợi-ý)
13. [Chạy toàn bộ app](#13-chạy-toàn-bộ-app)
14. [Xử lý lỗi thường gặp](#14-xử-lý-lỗi-thường-gặp)
15. [Tối ưu hóa API Quota — 5 lớp giải pháp](#15-tối-ưu-hóa-api-quota--5-lớp-giải-pháp)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                      TRÌNH DUYỆT (React)                        │
│                                                                 │
│  [Camera] ──► WebRTC ──────────────────► Video Call P2P         │
│     │                                                           │
│     └──► MediaPipe (JS) ──► Eye contact score                   │
│               │          ──► Hand gesture score                 │
│               │          ──► Facial emotion score               │
│                                                                 │
│  [Mic] ──► Web Speech API ──► Text transcript (STT)             │
│     │                                                           │
│     └──► Web Audio API ──► Volume (âm lượng)                    │
│                         ──► Pitch variance (giọng run)          │
│                                                                 │
│  Tất cả dữ liệu ──► Gửi lên Backend theo từng lượt             │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                    BACKEND (FastAPI - Python)                    │
│                                                                 │
│  /analyze  ──► XLM-RoBERTa (model tự fine-tune) — ngụy biện   │
│  /score    ──► Gemini API — chấm điểm + phân tích lỗi + gợi ý │
└─────────────────────────────────────────────────────────────────┘
```

**Luồng hoạt động một lượt tranh biện (90 giây):**

1. Camera → MediaPipe chạy nền: đo eye contact, cử chỉ tay, cảm xúc mặt
2. Mic → Web Audio API: theo dõi âm lượng và độ run giọng liên tục
3. Mic → Web Speech API: chuyển giọng nói thành text realtime
4. Text → `/analyze`: phát hiện ngụy biện, cảnh báo ngay
5. Hết lượt → tổng hợp điểm video + audio + text cho lượt đó
6. Cuối trận → gửi toàn bộ lên `/score` → Gemini trả về phân tích lỗi chi tiết + gợi ý cải thiện

---

## 2. Cài đặt môi trường

### 2.1 Yêu cầu máy tính

- Python 3.10 trở lên
- Node.js 18 trở lên
- Git

Kiểm tra đã cài chưa:

```bash
python --version    # Cần >= 3.10
node --version      # Cần >= 18
git --version
```

### 2.2 Tạo cấu trúc project

```bash
mkdir kaiko && cd kaiko
mkdir backend frontend
```

Cấu trúc cuối cùng sẽ như sau:

```
kaiko/
├── backend/
│   ├── main.py              # FastAPI app chính
│   ├── fallacy_model/       # Thư mục chứa model sau khi train
│   ├── requirements.txt
│   └── .env                 # API keys (không commit lên Git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── VideoCall.jsx
│   │   │   ├── DebateRoom.jsx
│   │   │   ├── Scoreboard.jsx
│   │   │   └── FallacyAlert.jsx
│   │   └── hooks/
│   │       ├── useSpeechToText.js
│   │       └── useWebRTC.js
│   └── package.json
└── README.md
```

### 2.3 Cài backend Python

```bash
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Kích hoạt (Mac/Linux)
source venv/bin/activate

# Cài thư viện
pip install fastapi uvicorn python-dotenv
pip install transformers torch sentencepiece
pip install google-generativeai          # Nếu dùng Gemini
pip install openai                        # Nếu dùng OpenAI
pip install python-multipart httpx
```

Tạo file `requirements.txt`:

```bash
pip freeze > requirements.txt
```

### 2.4 Cài frontend React

```bash
cd ../frontend

# Tạo project React bằng Vite (nhanh hơn Create React App)
npm create vite@latest . -- --template react

# Cài dependencies
npm install

# Cài thêm thư viện cần dùng
npm install axios socket.io-client
```

---

## 3. Backend — FastAPI

### 3.1 Tạo file `backend/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="KaiKo API")

# Cho phép frontend gọi API (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Địa chỉ React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models dữ liệu ---

class TextInput(BaseModel):
    text: str
    speaker: str = "unknown"   # Tên người nói

class DebateResult(BaseModel):
    topic: str
    player_a: str
    player_b: str
    transcript_a: str
    transcript_b: str

# --- Routes ---

@app.get("/")
def root():
    return {"status": "KaiKo API đang chạy"}

@app.post("/analyze")
def analyze_fallacy(input: TextInput):
    """Phân tích ngụy biện trong một đoạn text"""
    # Sẽ tích hợp model ở Phần 8
    return {"fallacy": None, "confidence": 0}

@app.post("/score")
def score_debate(result: DebateResult):
    """Chấm điểm toàn bộ trận tranh biện"""
    # Sẽ tích hợp LLM API ở Phần 9
    return {"scores": {}}
```

### 3.2 Tạo file `backend/.env`

```
GEMINI_API_KEY=your_key_here
# hoặc
OPENAI_API_KEY=your_key_here
```

> ⚠️ **Không commit file `.env` lên GitHub.** Thêm `.env` vào `.gitignore`.

### 3.3 Chạy thử backend

```bash
cd backend
source venv/bin/activate   # hoặc venv\Scripts\activate trên Windows
uvicorn main:app --reload --port 8000
```

Mở trình duyệt vào `http://localhost:8000` — nếu thấy `{"status": "KaiKo API đang chạy"}` là thành công.

Xem docs API tự động tại: `http://localhost:8000/docs`

---

## 4. Fine-tune model phát hiện ngụy biện

> Phần này chạy trên **Kaggle Notebook** (miễn phí, GPU T4).

### 4.1 Chuẩn bị Kaggle

1. Đăng ký tại https://www.kaggle.com
2. Vào **Settings → Phone Verification** (bắt buộc để dùng GPU)
3. Tạo notebook mới: **Code → New Notebook**
4. Chọn **Accelerator → GPU T4 x2**
5. Bật **Settings → Internet → On**

### 4.2 Cell 1 — Cài thư viện

```python
!pip install transformers datasets torch scikit-learn
!pip install sentencepiece accelerate deep-translator
```

### 4.3 Cell 2 — Tải và dịch dataset

```python
from datasets import load_dataset
from deep_translator import GoogleTranslator
import time, json

# Tải dataset gốc tiếng Anh
dataset = load_dataset('tasksource/logical-fallacy')
print(dataset)

# Danh sách 13 loại ngụy biện
LABEL_NAMES = dataset['train'].features['label'].names
print("Các nhãn:", LABEL_NAMES)

# Hàm dịch sang tiếng Việt
translator = GoogleTranslator(source='en', target='vi')

def translate_batch(texts, batch_size=10):
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        try:
            translated = [translator.translate(t) for t in batch]
            results.extend(translated)
        except Exception as e:
            print(f"Lỗi batch {i}: {e}")
            results.extend(batch)  # Giữ tiếng Anh nếu lỗi
        time.sleep(0.8)
        if i % 200 == 0:
            print(f"Đã dịch {i}/{len(texts)} câu...")
    return results

# Dịch từng split (mất ~45 phút)
print("Dịch train set...")
train_vi = translate_batch(dataset['train']['text'])
print("Dịch test set...")
test_vi  = translate_batch(dataset['test']['text'])
print("Dịch dev set...")
dev_vi   = translate_batch(dataset['dev']['text'])

# Lưu lại để không dịch lại lần sau
with open('/kaggle/working/data_vi.json', 'w', encoding='utf-8') as f:
    json.dump({
        'train': {'text': train_vi,  'label': dataset['train']['label']},
        'test':  {'text': test_vi,   'label': dataset['test']['label']},
        'dev':   {'text': dev_vi,    'label': dataset['dev']['label']},
        'label_names': LABEL_NAMES
    }, f, ensure_ascii=False, indent=2)

print("Lưu xong!")
```

> 💡 Từ lần thứ 2 trở đi, bỏ qua cell này và dùng cell load JSON bên dưới.

### 4.4 Cell 3 — Load dữ liệu đã dịch (lần 2 trở đi)

```python
import json

with open('/kaggle/working/data_vi.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

train_texts  = data['train']['text']
train_labels = data['train']['label']
test_texts   = data['test']['text']
test_labels  = data['test']['label']
dev_texts    = data['dev']['text']
dev_labels   = data['dev']['label']
LABEL_NAMES  = data['label_names']

print(f"Train: {len(train_texts)} mẫu")
print(f"Test:  {len(test_texts)} mẫu")
```

### 4.5 Cell 4 — Tokenize và tạo Dataset

```python
from transformers import AutoTokenizer
from torch.utils.data import Dataset
import torch

MODEL_NAME = 'xlm-roberta-base'
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

class FallacyDataset(Dataset):
    def __init__(self, texts, labels, max_len=256):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding='max_length',
            max_length=max_len,
            return_tensors='pt'
        )
        self.labels = torch.tensor(labels)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            'input_ids':      self.encodings['input_ids'][idx],
            'attention_mask': self.encodings['attention_mask'][idx],
            'labels':         self.labels[idx]
        }

train_dataset = FallacyDataset(train_texts, train_labels)
test_dataset  = FallacyDataset(test_texts,  test_labels)
dev_dataset   = FallacyDataset(dev_texts,   dev_labels)
print("Tokenize xong!")
```

### 4.6 Cell 5 — Fine-tune

```python
from transformers import (
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
from sklearn.metrics import f1_score
import numpy as np

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(LABEL_NAMES)
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        'f1_macro':    f1_score(labels, preds, average='macro'),
        'f1_weighted': f1_score(labels, preds, average='weighted')
    }

training_args = TrainingArguments(
    output_dir='/kaggle/working/output',
    num_train_epochs=3,
    per_device_train_batch_size=16,   # Giảm xuống 8 nếu bị lỗi OOM
    per_device_eval_batch_size=32,
    learning_rate=2e-5,
    weight_decay=0.01,
    evaluation_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    metric_for_best_model='f1_macro',
    fp16=True,
    logging_steps=50,
    report_to='none'
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=dev_dataset,
    compute_metrics=compute_metrics,
)

print("Bắt đầu train...")
trainer.train()
print("Train xong!")
```

> ⚠️ Không tắt tab trình duyệt trong lúc train. Kaggle sẽ dừng nếu mất kết nối.

### 4.7 Cell 6 — Đánh giá và lưu model

```python
from sklearn.metrics import classification_report

# Đánh giá trên test set
predictions = trainer.predict(test_dataset)
preds = np.argmax(predictions.predictions, axis=-1)

print(classification_report(
    test_labels, preds,
    target_names=LABEL_NAMES,
    digits=3
))

# Lưu model
model.save_pretrained('/kaggle/working/fallacy_model_vi')
tokenizer.save_pretrained('/kaggle/working/fallacy_model_vi')

# Nén để tải về máy
import shutil
shutil.make_archive('/kaggle/working/fallacy_model_vi', 'zip',
                    '/kaggle/working/fallacy_model_vi')
print("Xong! Tải file fallacy_model_vi.zip từ tab Output bên phải.")
```

### 4.8 Tải model về máy

Sau khi train xong:

1. Nhìn sang thanh bên phải Kaggle → tab **Output**
2. Tìm file `fallacy_model_vi.zip` → nhấn tải về
3. Giải nén vào thư mục `backend/fallacy_model/`

---

## 5. Frontend — React

### 5.1 Cấu trúc component

```
App.jsx
├── HomePage         — Trang chủ, tạo/join phòng
├── DebateRoom       — Phòng tranh biện chính
│   ├── VideoCall    — Hiển thị 2 video
│   ├── Timer        — Đếm giờ từng lượt
│   ├── FallacyAlert — Cảnh báo ngụy biện realtime
│   └── Transcript   — Phụ đề live
└── Scoreboard       — Bảng điểm cuối trận
```

### 5.2 Tạo `frontend/src/App.jsx`

```jsx
import { useState } from 'react'
import HomePage from './components/HomePage'
import DebateRoom from './components/DebateRoom'
import Scoreboard from './components/Scoreboard'

function App() {
  const [page, setPage] = useState('home')         // 'home' | 'debate' | 'score'
  const [roomData, setRoomData] = useState(null)
  const [debateResult, setDebateResult] = useState(null)

  if (page === 'home') {
    return <HomePage onStart={(data) => { setRoomData(data); setPage('debate') }} />
  }

  if (page === 'debate') {
    return (
      <DebateRoom
        roomData={roomData}
        onFinish={(result) => { setDebateResult(result); setPage('score') }}
      />
    )
  }

  return <Scoreboard result={debateResult} onRestart={() => setPage('home')} />
}

export default App
```

### 5.3 Tạo `frontend/src/components/HomePage.jsx`

```jsx
import { useState } from 'react'

export default function HomePage({ onStart }) {
  const [topic, setTopic] = useState('')
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')

  const handleStart = () => {
    if (!topic || !playerA || !playerB) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }
    onStart({ topic, playerA, playerB })
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24 }}>
      <h1>🎤 KaiKo — Tranh Biện AI</h1>

      <label>Chủ đề tranh biện</label>
      <input
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="VD: Học đại học có còn cần thiết không?"
        style={{ width: '100%', padding: 8, marginBottom: 16 }}
      />

      <label>Người chơi A (ủng hộ)</label>
      <input
        value={playerA}
        onChange={e => setPlayerA(e.target.value)}
        placeholder="Tên người chơi A"
        style={{ width: '100%', padding: 8, marginBottom: 16 }}
      />

      <label>Người chơi B (phản đối)</label>
      <input
        value={playerB}
        onChange={e => setPlayerB(e.target.value)}
        placeholder="Tên người chơi B"
        style={{ width: '100%', padding: 8, marginBottom: 24 }}
      />

      <button
        onClick={handleStart}
        style={{ width: '100%', padding: 12, background: '#4472C4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
      >
        Bắt đầu tranh biện
      </button>
    </div>
  )
}
```

---

## 6. Video Call với WebRTC

WebRTC cho phép 2 trình duyệt kết nối video trực tiếp (P2P) mà không cần server xử lý video. Firebase chỉ làm nhiệm vụ "chắp nối" kết nối ban đầu (signaling).

### 6.1 Cài Firebase

```bash
cd frontend
npm install firebase
```

### 6.2 Tạo project Firebase

1. Vào https://console.firebase.google.com → **Add project**
2. Tên project: `kaiko-debate`
3. Tắt Google Analytics (không cần)
4. Vào **Firestore Database → Create database → Start in test mode**
5. Vào **Project Settings → Your apps → Web app** → copy config

### 6.3 Tạo `frontend/src/firebase.js`

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "...",           // Dán config từ Firebase vào đây
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
```

### 6.4 Tạo `frontend/src/hooks/useWebRTC.js`

```javascript
import { useRef, useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, doc, setDoc, getDoc,
  onSnapshot, addDoc, getDocs
} from 'firebase/firestore'

const ICE_SERVERS = {
  iceServers: [{ urls: ['stun:stun1.l.google.com:19302'] }]
}

export function useWebRTC() {
  const localVideoRef  = useRef(null)   // Ref gắn vào <video> của mình
  const remoteVideoRef = useRef(null)   // Ref gắn vào <video> của đối phương
  const pcRef          = useRef(null)   // RTCPeerConnection
  const [roomId, setRoomId] = useState(null)
  const [connected, setConnected] = useState(false)

  // Lấy camera/mic và hiển thị lên video của mình
  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    localVideoRef.current.srcObject = stream
    return stream
  }

  // Người A: Tạo phòng mới
  const createRoom = async () => {
    const stream = await startLocalStream()
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    // Gửi video lên kết nối
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Nhận video từ đối phương
    pc.ontrack = event => {
      remoteVideoRef.current.srcObject = event.streams[0]
      setConnected(true)
    }

    const roomRef = doc(collection(db, 'rooms'))
    const callerCandidates = collection(roomRef, 'callerCandidates')

    // Gửi ICE candidates lên Firebase
    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(callerCandidates, event.candidate.toJSON())
      }
    }

    // Tạo offer và lưu lên Firebase
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } })
    setRoomId(roomRef.id)

    // Chờ người B gửi answer
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data()
      if (!pc.currentRemoteDescription && data?.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    })

    // Nhận ICE candidates từ người B
    onSnapshot(collection(roomRef, 'calleeCandidates'), snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
        }
      })
    })

    return roomRef.id
  }

  // Người B: Tham gia phòng có sẵn
  const joinRoom = async (id) => {
    const stream = await startLocalStream()
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = event => {
      remoteVideoRef.current.srcObject = event.streams[0]
      setConnected(true)
    }

    const roomRef = doc(db, 'rooms', id)
    const calleeCandidates = collection(roomRef, 'calleeCandidates')

    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(calleeCandidates, event.candidate.toJSON())
      }
    }

    const roomData = (await getDoc(roomRef)).data()
    await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await setDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true })

    onSnapshot(collection(roomRef, 'callerCandidates'), snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
        }
      })
    })

    setRoomId(id)
  }

  return { localVideoRef, remoteVideoRef, roomId, connected, createRoom, joinRoom }
}
```

### 6.5 Tạo `frontend/src/components/VideoCall.jsx`

```jsx
import { useState } from 'react'
import { useWebRTC } from '../hooks/useWebRTC'

export default function VideoCall({ onReady }) {
  const { localVideoRef, remoteVideoRef, roomId, connected, createRoom, joinRoom } = useWebRTC()
  const [joinId, setJoinId] = useState('')
  const [mode, setMode] = useState(null)  // 'create' | 'join'

  const handleCreate = async () => {
    setMode('create')
    const id = await createRoom()
    alert(`Phòng đã tạo! Chia sẻ mã này cho đối phương: ${id}`)
  }

  const handleJoin = async () => {
    setMode('join')
    await joinRoom(joinId)
  }

  // Khi kết nối thành công thì báo component cha
  if (connected && onReady) onReady()

  return (
    <div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p>Bạn</p>
          <video ref={localVideoRef} autoPlay muted playsInline
            style={{ width: 320, borderRadius: 8 }} />
        </div>
        <div>
          <p>Đối phương</p>
          <video ref={remoteVideoRef} autoPlay playsInline
            style={{ width: 320, borderRadius: 8 }} />
        </div>
      </div>

      {!connected && (
        <div style={{ marginTop: 16 }}>
          <button onClick={handleCreate} style={{ marginRight: 8 }}>
            Tạo phòng mới
          </button>
          <input
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            placeholder="Nhập mã phòng..."
            style={{ marginRight: 8, padding: 6 }}
          />
          <button onClick={handleJoin}>Tham gia phòng</button>
        </div>
      )}

      {connected && <p style={{ color: 'green' }}>✅ Đã kết nối!</p>}
    </div>
  )
}
```

---

## 7. Speech-to-Text với Web Speech API

Web Speech API là API có sẵn trong Chrome/Edge — hoàn toàn miễn phí, không cần key.

### 7.1 Tạo `frontend/src/hooks/useSpeechToText.js`

```javascript
import { useState, useRef, useCallback } from 'react'

export function useSpeechToText({ onTranscript, onFinalTranscript }) {
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText] = useState('')

  const start = useCallback(() => {
    // Kiểm tra trình duyệt có hỗ trợ không
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ Speech Recognition. Dùng Chrome hoặc Edge.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = 'vi-VN'           // Tiếng Việt
    recognition.continuous = true         // Tiếp tục nghe liên tục
    recognition.interimResults = true     // Hiển thị kết quả tạm thời

    let fullTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
          fullTranscript += text + ' '
        } else {
          interim += text
        }
      }

      // Cập nhật text đang hiển thị realtime
      setLiveText(fullTranscript + interim)

      // Gọi callback để phân tích từng câu hoàn chỉnh
      if (final && onTranscript) {
        onTranscript(final.trim())
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error)
      if (event.error === 'not-allowed') {
        alert('Cần cấp quyền microphone!')
      }
    }

    recognition.onend = () => {
      // Khi hết lượt, gọi callback với toàn bộ transcript
      if (onFinalTranscript && fullTranscript) {
        onFinalTranscript(fullTranscript.trim())
      }
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
    setLiveText('')
  }, [onTranscript, onFinalTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, liveText, start, stop }
}
```

---

## 8. Tích hợp model vào app

### 8.1 Cập nhật `backend/main.py` — thêm model

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="KaiKo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load model khi khởi động server ---

MODEL_PATH = "./fallacy_model"   # Thư mục chứa model đã tải về từ Kaggle

LABEL_NAMES = [
    'ad hominem', 'ad populum', 'appeal to emotion',
    'circular reasoning', 'equivocation', 'fallacy of credibility',
    'fallacy of extension', 'fallacy of logic', 'fallacy of relevance',
    'false causality', 'false dilemma', 'faulty generalization', 'intentional'
]

# Tên tiếng Việt để hiển thị cho người dùng
LABEL_VI = {
    'ad hominem':           'Công kích cá nhân',
    'ad populum':           'Dựa vào số đông',
    'appeal to emotion':    'Khai thác cảm xúc',
    'circular reasoning':   'Lập luận vòng tròn',
    'equivocation':         'Ngụy biện từ ngữ',
    'fallacy of credibility': 'Ngụy biện uy tín',
    'fallacy of extension': 'Bóp méo lập luận',
    'fallacy of logic':     'Lập luận hợp lệ',   # Không phải ngụy biện
    'fallacy of relevance': 'Lập luận lạc đề',
    'false causality':      'Nhân quả giả',
    'false dilemma':        'Lưỡng nan giả',
    'faulty generalization':'Khái quát hóa sai',
    'intentional':          'Ngụy biện cố ý'
}

tokenizer = None
model = None

@app.on_event("startup")
def load_model():
    global tokenizer, model
    if os.path.exists(MODEL_PATH):
        print("Đang load model...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        model.eval()
        print("Load model xong!")
    else:
        print("⚠️  Chưa có model. Chạy Kaggle notebook trước rồi copy model vào ./fallacy_model/")

# --- Routes ---

class TextInput(BaseModel):
    text: str
    speaker: str = "unknown"

@app.get("/")
def root():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/analyze")
def analyze_fallacy(input: TextInput):
    """Phân tích ngụy biện trong một câu/đoạn text"""
    if model is None:
        return {"error": "Model chưa được load"}

    if len(input.text.strip()) < 10:
        return {"fallacy": None, "confidence": 0}

    tokens = tokenizer(
        input.text,
        return_tensors='pt',
        truncation=True,
        max_length=256
    )

    with torch.no_grad():
        logits = model(**tokens).logits

    probs     = torch.softmax(logits, dim=-1)[0]
    top_idx   = probs.argmax().item()
    confidence = round(probs[top_idx].item() * 100, 1)
    label     = LABEL_NAMES[top_idx]

    # Chỉ báo ngụy biện nếu confidence >= 70% và không phải nhãn "hợp lệ"
    is_fallacy = label != 'fallacy of logic' and confidence >= 70

    return {
        "fallacy":      LABEL_VI.get(label, label) if is_fallacy else None,
        "fallacy_en":   label,
        "confidence":   confidence,
        "is_fallacy":   is_fallacy,
        "speaker":      input.speaker
    }
```

### 8.2 Tạo `frontend/src/components/FallacyAlert.jsx`

```jsx
import { useState, useEffect } from 'react'

export default function FallacyAlert({ fallacy, speaker }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (fallacy) {
      setVisible(true)
      // Tự ẩn sau 5 giây
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [fallacy])

  if (!visible || !fallacy) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: '#C00000', color: 'white',
      padding: '12px 20px', borderRadius: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      maxWidth: 320, zIndex: 1000
    }}>
      <strong>⚠️ Phát hiện ngụy biện!</strong>
      <p style={{ margin: '4px 0 0' }}>
        {speaker}: <em>{fallacy}</em>
      </p>
    </div>
  )
}
```

### 8.3 Kết nối Speech-to-Text → Model trong DebateRoom

```jsx
// Trong DebateRoom.jsx — gọi /analyze mỗi khi có câu hoàn chỉnh
import axios from 'axios'

const handleTranscript = async (text) => {
  try {
    const res = await axios.post('http://localhost:8000/analyze', {
      text,
      speaker: currentSpeaker   // Tên người đang nói
    })
    if (res.data.is_fallacy) {
      setCurrentFallacy(res.data.fallacy)
      setFallacySpeaker(res.data.speaker)
      // Trừ điểm
      deductPoints(currentSpeaker, res.data.fallacy_en)
    }
  } catch (err) {
    console.error('Lỗi phân tích:', err)
  }
}
```

---

## 9. Chấm điểm bằng LLM API

Sau khi trận đấu kết thúc, gửi toàn bộ transcript lên LLM để chấm điểm tổng.

### 9.1 Cài Gemini API (miễn phí)

Lấy API key miễn phí tại: https://aistudio.google.com/apikey

Thêm vào `backend/.env`:

```
GEMINI_API_KEY=your_key_here
```

### 9.2 Thêm route `/score` vào `backend/main.py`

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini = genai.GenerativeModel("gemini-1.5-flash")

class DebateResult(BaseModel):
    topic: str
    player_a: str
    player_b: str
    transcript_a: str
    transcript_b: str
    fallacies_a: list = []   # Danh sách ngụy biện của A
    fallacies_b: list = []   # Danh sách ngụy biện của B

@app.post("/score")
def score_debate(result: DebateResult):
    """Chấm điểm toàn bộ trận tranh biện bằng LLM"""

    prompt = f"""Bạn là trọng tài tranh biện chuyên nghiệp. Hãy chấm điểm trận tranh biện sau:

CHỦ ĐỀ: {result.topic}

{result.player_a} (ủng hộ):
{result.transcript_a}

{result.player_b} (phản đối):
{result.transcript_b}

Ngụy biện của {result.player_a}: {', '.join(result.fallacies_a) if result.fallacies_a else 'Không có'}
Ngụy biện của {result.player_b}: {', '.join(result.fallacies_b) if result.fallacies_b else 'Không có'}

Hãy chấm điểm theo thang 100 cho từng người với 3 tiêu chí:
- Tính logic & bằng chứng (40 điểm)
- Sự rõ ràng & mạch lạc (30 điểm)  
- Phản biện đối phương (30 điểm)
Trừ 5 điểm cho mỗi ngụy biện bị phát hiện.

Trả về JSON với format sau (chỉ JSON, không giải thích thêm):
{{
  "player_a": {{
    "logic_score": 0,
    "clarity_score": 0,
    "rebuttal_score": 0,
    "fallacy_deduction": 0,
    "total": 0,
    "feedback": "Nhận xét ngắn gọn"
  }},
  "player_b": {{
    "logic_score": 0,
    "clarity_score": 0,
    "rebuttal_score": 0,
    "fallacy_deduction": 0,
    "total": 0,
    "feedback": "Nhận xét ngắn gọn"
  }},
  "winner": "{result.player_a} hoặc {result.player_b}",
  "overall_comment": "Nhận xét tổng quan về trận đấu"
}}"""

    try:
        response = gemini.generate_content(prompt)
        import json, re
        # Lấy phần JSON từ response
        text = response.text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            scores = json.loads(match.group())
            return {"success": True, "scores": scores}
        return {"success": False, "error": "Không parse được JSON"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 9.3 Tạo `frontend/src/components/Scoreboard.jsx`

```jsx
export default function Scoreboard({ result, onRestart }) {
  if (!result) return null

  const { scores, playerA, playerB } = result
  const a = scores?.player_a
  const b = scores?.player_b

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h2>🏆 Kết quả trận đấu</h2>
      <p><strong>Người chiến thắng: {scores?.winner}</strong></p>
      <p>{scores?.overall_comment}</p>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        {[{ name: playerA, data: a }, { name: playerB, data: b }].map(({ name, data }) => (
          <div key={name} style={{ flex: 1, border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
            <h3>{name}</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr><td>Logic & Bằng chứng</td><td>{data?.logic_score}/40</td></tr>
                <tr><td>Rõ ràng & Mạch lạc</td><td>{data?.clarity_score}/30</td></tr>
                <tr><td>Phản biện</td><td>{data?.rebuttal_score}/30</td></tr>
                <tr><td>Trừ ngụy biện</td><td style={{ color: 'red' }}>-{data?.fallacy_deduction}</td></tr>
                <tr><td><strong>Tổng</strong></td><td><strong>{data?.total}</strong></td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 8, color: '#555' }}>{data?.feedback}</p>
          </div>
        ))}
      </div>

      <button onClick={onRestart} style={{ marginTop: 24, padding: '10px 24px' }}>
        Chơi lại
      </button>
    </div>
  )
}
```

---

## 10. Phân tích Video — MediaPipe

MediaPipe là thư viện AI của Google chạy hoàn toàn trên trình duyệt (JavaScript), không cần server. Nhóm dùng 3 module: **FaceMesh** (eye contact + cảm xúc), **Hands** (cử chỉ tay).

### 10.1 Cài MediaPipe

```bash
cd frontend
npm install @mediapipe/face_mesh @mediapipe/hands @mediapipe/camera_utils
```

### 10.2 Tạo `frontend/src/hooks/useMediaPipe.js`

```javascript
import { useRef, useEffect, useCallback, useState } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

// Chỉ số landmark mắt trong FaceMesh (468 điểm)
const LEFT_EYE_INDICES  = [33, 160, 158, 133, 153, 144]
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
const LEFT_IRIS  = [468, 469, 470, 471, 472]
const RIGHT_IRIS = [473, 474, 475, 476, 477]

export function useMediaPipe({ videoRef, isActive }) {
  const [scores, setScores] = useState({
    eyeContact: 0,       // 0–100: tỉ lệ % frame nhìn thẳng
    gesture: 0,          // 0–100: tỉ lệ % lượt có cử chỉ tay nhấn mạnh
    emotion: 'neutral',  // 'calm' | 'tense' | 'aggressive'
    emotionScore: 100,   // điểm cảm xúc: bình tĩnh = cao
  })

  const frameDataRef  = useRef({ eyeFrames: 0, totalFrames: 0, gestureFrames: 0, tenseFrames: 0 })
  const cameraRef     = useRef(null)
  const faceMeshRef   = useRef(null)
  const handsRef      = useRef(null)

  // ── Tính eye contact dựa trên vị trí iris so với eye box ──────────
  function calcEyeContact(landmarks) {
    if (!landmarks || landmarks.length < 478) return false
    // Lấy tọa độ x của iris trái
    const irisX = landmarks[468].x
    // Lấy giới hạn x của eye box
    const eyeLeft  = landmarks[33].x
    const eyeRight = landmarks[133].x
    const eyeWidth = eyeRight - eyeLeft
    // Nếu iris nằm gần giữa eye box → đang nhìn thẳng
    const relPos = (irisX - eyeLeft) / eyeWidth
    return relPos > 0.35 && relPos < 0.65
  }

  // ── Phát hiện cảm xúc đơn giản qua khoảng cách lông mày ──────────
  function detectEmotion(landmarks) {
    if (!landmarks || landmarks.length < 10) return 'neutral'
    // Điểm giữa lông mày trái (landmark 21) và mắt trái (landmark 159)
    const browY = landmarks[21].y
    const eyeY  = landmarks[159].y
    const gap   = eyeY - browY
    // Lông mày nhíu lại (gap nhỏ) → căng thẳng/tức giận
    if (gap < 0.025) return 'aggressive'
    if (gap < 0.04)  return 'tense'
    return 'calm'
  }

  useEffect(() => {
    if (!isActive || !videoRef.current) return

    // Khởi tạo FaceMesh
    const faceMesh = new FaceMesh({ locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` })
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,   // Bật để có iris landmarks
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    faceMesh.onResults(results => {
      const fd = frameDataRef.current
      fd.totalFrames++
      if (results.multiFaceLandmarks?.[0]) {
        const lm = results.multiFaceLandmarks[0]
        if (calcEyeContact(lm)) fd.eyeFrames++
        const emo = detectEmotion(lm)
        if (emo !== 'calm') fd.tenseFrames++
      }
      // Cập nhật scores mỗi 30 frame (~1 giây)
      if (fd.totalFrames % 30 === 0) {
        const eyePct     = Math.round((fd.eyeFrames / fd.totalFrames) * 100)
        const tensePct   = Math.round((fd.tenseFrames / fd.totalFrames) * 100)
        const emoLabel   = tensePct > 60 ? 'aggressive' : tensePct > 30 ? 'tense' : 'calm'
        const emoScore   = Math.max(0, 100 - tensePct)
        setScores(s => ({ ...s, eyeContact: eyePct, emotion: emoLabel, emotionScore: emoScore }))
      }
    })
    faceMeshRef.current = faceMesh

    // Khởi tạo Hands
    const hands = new Hands({ locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` })
    hands.setOptions({ maxNumHands: 2, minDetectionConfidence: 0.6 })
    hands.onResults(results => {
      const fd = frameDataRef.current
      // Có bàn tay hiện trong frame = đang dùng cử chỉ
      if (results.multiHandLandmarks?.length > 0) {
        fd.gestureFrames++
        const gesturePct = Math.round((fd.gestureFrames / Math.max(fd.totalFrames, 1)) * 100)
        setScores(s => ({ ...s, gesture: gesturePct }))
      }
    })
    handsRef.current = hands

    // Chạy camera loop
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current })
        await hands.send({ image: videoRef.current })
      },
      width: 320, height: 240,  // Độ phân giải thấp để tiết kiệm CPU
    })
    camera.start()
    cameraRef.current = camera

    return () => {
      camera.stop()
      faceMesh.close()
      hands.close()
    }
  }, [isActive, videoRef])

  // Reset frame data khi bắt đầu lượt mới
  const resetFrame = useCallback(() => {
    frameDataRef.current = { eyeFrames: 0, totalFrames: 0, gestureFrames: 0, tenseFrames: 0 }
  }, [])

  return { scores, resetFrame }
}
```

### 10.3 Bảng điểm Video (tính cuối mỗi lượt)

```javascript
// Hàm tính điểm Video sau mỗi lượt 90 giây
function calcVideoScore(scores) {
  let points = 0
  const feedback = []

  // Eye contact
  if (scores.eyeContact >= 70) {
    points += 10
    feedback.push({ type: 'good', msg: 'Giao tiếp bằng mắt tốt (+10đ)' })
  } else if (scores.eyeContact < 30) {
    points -= 5
    feedback.push({ type: 'warn', msg: 'Ít nhìn vào camera, có thể đang đọc bài (-5đ)' })
  }

  // Cử chỉ tay
  if (scores.gesture >= 20) {
    points += 5
    feedback.push({ type: 'good', msg: 'Ngôn ngữ cơ thể tốt, dùng tay nhấn mạnh (+5đ)' })
  }

  // Cảm xúc
  if (scores.emotion === 'calm') {
    points += 5
    feedback.push({ type: 'good', msg: 'Thái độ bình tĩnh, chuyên nghiệp (+5đ)' })
  } else if (scores.emotion === 'aggressive') {
    points -= 10
    feedback.push({ type: 'bad', msg: '⚠️ Biểu hiện tức giận, thiếu kiểm soát cảm xúc (-10đ)' })
  }

  return { points, feedback }
}
```

---

## 11. Phân tích Audio — Âm lượng & Giọng run

Dùng **Web Audio API** — có sẵn trong mọi trình duyệt, không cần cài thêm.

### 11.1 Tạo `frontend/src/hooks/useAudioAnalysis.js`

```javascript
import { useRef, useState, useCallback } from 'react'

export function useAudioAnalysis() {
  const [audioMetrics, setAudioMetrics] = useState({
    volume: 0,          // 0–100: âm lượng hiện tại
    avgVolume: 0,       // Âm lượng trung bình cả lượt
    pitchVariance: 0,   // Độ dao động pitch: cao = giọng run/hồi hộp
    isLoud: false,      // Đang la hét (> ngưỡng)
    isShaky: false,     // Giọng run (pitch variance cao)
  })

  const audioCtxRef    = useRef(null)
  const analyserRef    = useRef(null)
  const intervalRef    = useRef(null)
  const volumeHistRef  = useRef([])   // Lịch sử âm lượng để tính trung bình
  const pitchHistRef   = useRef([])   // Lịch sử pitch để tính variance

  const LOUD_THRESHOLD = 80    // Trên 80/100 = la hét
  const SHAKY_THRESHOLD = 15   // Variance > 15 = giọng run

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    audioCtxRef.current   = audioCtx
    analyserRef.current   = analyser
    volumeHistRef.current = []
    pitchHistRef.current  = []

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)

      // Tính âm lượng (RMS của tần số)
      const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length)
      const volume = Math.min(100, Math.round((rms / 128) * 100))

      // Tính pitch đơn giản (tần số dominant)
      const maxIdx = dataArray.indexOf(Math.max(...dataArray))
      const pitch  = maxIdx * (audioCtx.sampleRate / analyser.fftSize)

      volumeHistRef.current.push(volume)
      pitchHistRef.current.push(pitch)

      // Giữ lịch sử 50 sample (~2.5 giây)
      if (volumeHistRef.current.length > 50) volumeHistRef.current.shift()
      if (pitchHistRef.current.length > 50) pitchHistRef.current.shift()

      // Tính pitch variance (độ run giọng)
      const pitchArr = pitchHistRef.current
      const avgPitch = pitchArr.reduce((a, b) => a + b, 0) / pitchArr.length
      const variance = Math.sqrt(
        pitchArr.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / pitchArr.length
      )
      const normalizedVariance = Math.min(100, Math.round(variance / 10))

      const avgVol = Math.round(
        volumeHistRef.current.reduce((a, b) => a + b, 0) / volumeHistRef.current.length
      )

      setAudioMetrics({
        volume,
        avgVolume:    avgVol,
        pitchVariance: normalizedVariance,
        isLoud:   volume > LOUD_THRESHOLD,
        isShaky:  normalizedVariance > SHAKY_THRESHOLD,
      })
    }, 50)  // Cập nhật 20 lần/giây
  }, [])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    audioCtxRef.current?.close()
  }, [])

  // Lấy kết quả tổng kết sau lượt
  const getSummary = useCallback(() => {
    const vols  = volumeHistRef.current
    const loud  = vols.filter(v => v > LOUD_THRESHOLD).length
    const pcts  = pitchHistRef.current

    const avgPitch = pcts.reduce((a,b) => a+b, 0) / Math.max(pcts.length, 1)
    const shaky    = pcts.filter(p => Math.abs(p - avgPitch) > avgPitch * 0.15).length

    return {
      loudPct:  Math.round((loud / Math.max(vols.length, 1)) * 100),
      shakyPct: Math.round((shaky / Math.max(pcts.length, 1)) * 100),
      avgVolume: Math.round(vols.reduce((a,b)=>a+b,0) / Math.max(vols.length, 1)),
    }
  }, [])

  return { audioMetrics, start, stop, getSummary }
}
```

### 11.2 Hiển thị cảnh báo realtime trong DebateRoom

```jsx
// Trong DebateRoom.jsx — thêm cảnh báo audio realtime
import { useAudioAnalysis } from '../hooks/useAudioAnalysis'

const { audioMetrics, start, stop, getSummary } = useAudioAnalysis()

// Cảnh báo khi la hét
useEffect(() => {
  if (audioMetrics.isLoud) {
    showWarning('⚠️ Giọng quá lớn! Hãy giữ bình tĩnh')
    // Trừ điểm ngay lập tức nếu la hét liên tục > 3 giây
  }
}, [audioMetrics.isLoud])

// Cảnh báo giọng run (chỉ hiển thị, không trừ điểm — để tránh oan)
useEffect(() => {
  if (audioMetrics.isShaky) {
    showHint('💡 Hít thở sâu — giọng đang hơi run')
  }
}, [audioMetrics.isShaky])
```

### 11.3 Bảng điểm Audio (tính cuối mỗi lượt)

```javascript
function calcAudioScore(summary) {
  let points = 0
  const feedback = []

  // Âm lượng
  if (summary.loudPct > 30) {
    points -= 8
    feedback.push({ type: 'bad', msg: `La hét ${summary.loudPct}% thời gian nói (-8đ)` })
  } else if (summary.avgVolume > 20 && summary.avgVolume < 70) {
    points += 3
    feedback.push({ type: 'good', msg: 'Âm lượng vừa phải, dễ nghe (+3đ)' })
  }

  // Giọng run — chỉ trừ điểm nhẹ, kèm gợi ý
  if (summary.shakyPct > 50) {
    points -= 3
    feedback.push({ type: 'warn', msg: 'Giọng có vẻ hồi hộp — luyện thêm để tự tin hơn (-3đ)' })
  }

  return { points, feedback }
}
```

---

## 12. Scoreboard nâng cao — Phân tích lỗi & Gợi ý

### 12.1 Cập nhật `/score` endpoint — Gemini prompt nâng cao

```python
# Trong backend/main.py — cập nhật route /score

class DebateResult(BaseModel):
    topic: str
    player_a: str
    player_b: str
    transcript_a: str
    transcript_b: str
    fallacies_a: list = []
    fallacies_b: list = []
    # Dữ liệu mới — từ MediaPipe + Audio
    video_scores_a: dict = {}   # { eyeContact, gesture, emotion, emotionScore }
    audio_scores_a: dict = {}   # { loudPct, shakyPct, avgVolume }
    video_scores_b: dict = {}
    audio_scores_b: dict = {}

@app.post("/score")
def score_debate(result: DebateResult):
    prompt = f"""Bạn là chuyên gia huấn luyện kỹ năng tranh biện chuyên nghiệp.
Hãy chấm điểm và phân tích chi tiết trận tranh biện sau:

CHỦ ĐỀ: {result.topic}

=== {result.player_a} (ủng hộ) ===
Lời phát biểu: {result.transcript_a}
Ngụy biện mắc phải: {', '.join(result.fallacies_a) if result.fallacies_a else 'Không có'}
Dữ liệu video: Eye contact {result.video_scores_a.get('eyeContact', 0)}%, Cử chỉ tay {result.video_scores_a.get('gesture', 0)}%, Cảm xúc: {result.video_scores_a.get('emotion', 'unknown')}
Dữ liệu giọng nói: La hét {result.audio_scores_a.get('loudPct', 0)}% thời gian, Giọng run {result.audio_scores_a.get('shakyPct', 0)}% thời gian

=== {result.player_b} (phản đối) ===
Lời phát biểu: {result.transcript_b}
Ngụy biện mắc phải: {', '.join(result.fallacies_b) if result.fallacies_b else 'Không có'}
Dữ liệu video: Eye contact {result.video_scores_b.get('eyeContact', 0)}%, Cử chỉ tay {result.video_scores_b.get('gesture', 0)}%, Cảm xúc: {result.video_scores_b.get('emotion', 'unknown')}
Dữ liệu giọng nói: La hét {result.audio_scores_b.get('loudPct', 0)}% thời gian, Giọng run {result.audio_scores_b.get('shakyPct', 0)}% thời gian

Hãy chấm điểm và phân tích theo thang điểm sau:
- Logic & Lập luận: 40 điểm
- Phong thái & Ngôn ngữ cơ thể: 20 điểm (eye contact, cử chỉ, cảm xúc)
- Giọng nói & Ngữ điệu: 20 điểm (âm lượng, sự tự tin)
- Phản biện đối phương: 20 điểm
- Trừ 5 điểm mỗi ngụy biện, trừ 8 điểm nếu la hét > 30% thời gian

Trả về JSON (chỉ JSON, không giải thích thêm):
{{
  "player_a": {{
    "logic_score": 0,
    "delivery_score": 0,
    "voice_score": 0,
    "rebuttal_score": 0,
    "deductions": 0,
    "total": 0,
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
    "fallacy_analysis": "Phân tích chi tiết các ngụy biện đã dùng (nếu có)",
    "improvement_tips": ["Gợi ý cải thiện 1", "Gợi ý cải thiện 2", "Gợi ý cải thiện 3"]
  }},
  "player_b": {{
    "logic_score": 0,
    "delivery_score": 0,
    "voice_score": 0,
    "rebuttal_score": 0,
    "deductions": 0,
    "total": 0,
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
    "fallacy_analysis": "Phân tích chi tiết các ngụy biện đã dùng (nếu có)",
    "improvement_tips": ["Gợi ý cải thiện 1", "Gợi ý cải thiện 2", "Gợi ý cải thiện 3"]
  }},
  "winner": "Tên người chiến thắng",
  "winning_reason": "Lý do cụ thể tại sao người này thắng",
  "overall_comment": "Nhận xét tổng quan về chất lượng trận đấu",
  "debate_quality": "Xuất sắc | Tốt | Trung bình | Cần cải thiện"
}}"""

    try:
        response = gemini.generate_content(prompt)
        import json, re
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            return {"success": True, "scores": json.loads(match.group())}
        return {"success": False, "error": "Không parse được JSON"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 12.2 Tạo `frontend/src/components/Scoreboard.jsx` — Phiên bản nâng cao

```jsx
import { useState } from 'react'

const COLOR = { good: '#107C10', warn: '#FF8C00', bad: '#C00000', info: '#0070C0' }

function Badge({ type, text }) {
  return (
    <span style={{
      background: COLOR[type] + '20', color: COLOR[type],
      border: `1px solid ${COLOR[type]}`,
      borderRadius: 12, padding: '2px 10px', fontSize: 13, marginRight: 6, marginBottom: 4,
      display: 'inline-block'
    }}>{text}</span>
  )
}

function PlayerCard({ name, data, videoScores, audioScores }) {
  const [tab, setTab] = useState('score')  // 'score' | 'analysis' | 'tips'

  return (
    <div style={{ flex: 1, border: '2px solid #E0E0E0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#4472C4', color: 'white', padding: '12px 16px' }}>
        <h3 style={{ margin: 0 }}>{name}</h3>
        <div style={{ fontSize: 32, fontWeight: 'bold', marginTop: 4 }}>{data?.total ?? '--'} <span style={{ fontSize: 14 }}>/ 100</span></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0' }}>
        {['score', 'analysis', 'tips'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
            background: tab === t ? '#EEF3FA' : 'white',
            borderBottom: tab === t ? '2px solid #4472C4' : 'none',
            fontWeight: tab === t ? 'bold' : 'normal', fontSize: 13
          }}>
            {{ score: '📊 Điểm', analysis: '🔍 Phân tích', tips: '💡 Gợi ý' }[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* Tab Điểm */}
        {tab === 'score' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['Logic & Lập luận', data?.logic_score, 40],
                ['Phong thái & Body language', data?.delivery_score, 20],
                ['Giọng nói & Ngữ điệu', data?.voice_score, 20],
                ['Phản biện đối phương', data?.rebuttal_score, 20],
              ].map(([label, score, max]) => (
                <tr key={label}>
                  <td style={{ padding: '6px 0', color: '#555' }}>{label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{score ?? '--'}<span style={{ color: '#999', fontWeight: 'normal' }}>/{max}</span></td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #E0E0E0', color: '#C00000' }}>
                <td style={{ padding: '6px 0' }}>Trừ điểm</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>-{data?.deductions ?? 0}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #4472C4' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold', fontSize: 16 }}>Tổng</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 20, color: '#4472C4' }}>{data?.total ?? '--'}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Tab Phân tích */}
        {tab === 'analysis' && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: 8 }}>✅ Điểm mạnh</p>
            {data?.strengths?.map((s, i) => <Badge key={i} type="good" text={s} />)}

            <p style={{ fontWeight: 'bold', margin: '12px 0 8px' }}>⚠️ Điểm yếu</p>
            {data?.weaknesses?.map((w, i) => <Badge key={i} type="warn" text={w} />)}

            {data?.fallacy_analysis && (
              <>
                <p style={{ fontWeight: 'bold', margin: '12px 0 8px' }}>🚨 Phân tích ngụy biện</p>
                <p style={{ fontSize: 14, color: '#555', background: '#FFF3F3', padding: 10, borderRadius: 8 }}>
                  {data.fallacy_analysis}
                </p>
              </>
            )}

            {/* Chỉ số Video/Audio */}
            <p style={{ fontWeight: 'bold', margin: '12px 0 8px' }}>📹 Chỉ số hành vi</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['👁 Eye contact', `${videoScores?.eyeContact ?? 0}%`, videoScores?.eyeContact > 60 ? 'good' : 'warn'],
                ['🤚 Cử chỉ tay', `${videoScores?.gesture ?? 0}%`, videoScores?.gesture > 20 ? 'good' : 'info'],
                ['😐 Cảm xúc', videoScores?.emotion ?? 'N/A', videoScores?.emotion === 'calm' ? 'good' : 'bad'],
                ['🔊 La hét', `${audioScores?.loudPct ?? 0}%`, audioScores?.loudPct < 10 ? 'good' : 'bad'],
                ['🎤 Giọng run', `${audioScores?.shakyPct ?? 0}%`, audioScores?.shakyPct < 20 ? 'good' : 'warn'],
              ].map(([label, val, type]) => (
                <div key={label} style={{ background: '#F5F5F5', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, color: '#777' }}>{label}</div>
                  <div style={{ fontWeight: 'bold', color: COLOR[type] }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Gợi ý */}
        {tab === 'tips' && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: 12 }}>💡 Gợi ý để cải thiện</p>
            {data?.improvement_tips?.map((tip, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 12,
                background: '#EEF3FA', borderRadius: 8, padding: 12
              }}>
                <span style={{ color: '#4472C4', fontWeight: 'bold', fontSize: 18 }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: 14, color: '#333' }}>{tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Scoreboard({ result, onRestart }) {
  if (!result) return null
  const { scores, playerA, playerB, videoA, audioA, videoB, audioB } = result

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: 24 }}>
      <h2 style={{ textAlign: 'center' }}>🏆 Kết quả trận đấu</h2>

      <div style={{ background: '#EEF3FA', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#4472C4' }}>
          🥇 Người chiến thắng: {scores?.winner}
        </div>
        <p style={{ margin: '8px 0 0', color: '#555' }}>{scores?.winning_reason}</p>
        <p style={{ margin: '4px 0 0', color: '#777', fontSize: 13 }}>
          Chất lượng trận: <strong>{scores?.debate_quality}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <PlayerCard name={playerA} data={scores?.player_a} videoScores={videoA} audioScores={audioA} />
        <PlayerCard name={playerB} data={scores?.player_b} videoScores={videoB} audioScores={audioB} />
      </div>

      {scores?.overall_comment && (
        <div style={{ background: '#F9F9F9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <strong>📝 Nhận xét tổng quan:</strong>
          <p style={{ margin: '8px 0 0', color: '#444' }}>{scores.overall_comment}</p>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button onClick={onRestart} style={{
          padding: '12px 32px', background: '#4472C4', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16
        }}>
          🔄 Chơi lại
        </button>
      </div>
    </div>
  )
}
```

---

## 13. Chạy toàn bộ app

### 10.1 Chạy backend

```bash
cd backend
source venv/bin/activate        # Mac/Linux
# hoặc: venv\Scripts\activate   # Windows

uvicorn main:app --reload --port 8000
```

### 10.2 Chạy frontend

```bash
cd frontend
npm run dev
```

Mở trình duyệt:
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

### 10.3 Test thử từng tính năng

```bash
# Test model ngụy biện
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Mày chỉ nói vậy vì mày dốt thôi!", "speaker": "Player A"}'

# Kết quả mong đợi:
# {"fallacy": "Công kích cá nhân", "confidence": 87.3, "is_fallacy": true, ...}
```

### 10.4 Kiểm tra nhanh từng phần

| Phần | Cách kiểm tra |
|------|---------------|
| Backend chạy | Vào http://localhost:8000 thấy `{"status": "ok"}` |
| Model load | Thấy `"model_loaded": true` trong response |
| Camera hoạt động | Vào trang Debate Room, cho phép camera |
| WebRTC kết nối | Tạo phòng ở tab 1, join ở tab 2 cùng máy |
| Speech-to-Text | Nói vào mic, thấy phụ đề xuất hiện |
| Phát hiện ngụy biện | Nói câu công kích cá nhân, thấy cảnh báo đỏ |
| Chấm điểm | Nhấn kết thúc trận, thấy bảng điểm |

---

## 14. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `CORS error` ở frontend | Backend chưa cấu hình CORS đúng địa chỉ | Kiểm tra `allow_origins` trong `main.py` |
| Camera không bật | Trình duyệt chưa được cấp quyền | Nhấn vào icon camera trên thanh địa chỉ → Allow |
| Speech không nhận | Dùng Firefox | Chuyển sang Chrome hoặc Edge |
| `model_loaded: false` | Chưa copy model vào `backend/fallacy_model/` | Tải từ Kaggle về và giải nén vào đúng thư mục |
| WebRTC không kết nối | Firestore chưa bật | Vào Firebase Console → Firestore → Create database |
| Gemini lỗi 403 | API key sai hoặc chưa bật | Kiểm tra key tại aistudio.google.com |
| `CUDA out of memory` (Kaggle) | Batch size quá lớn | Giảm `per_device_train_batch_size` từ 16 xuống 8 |
| MediaPipe không load | CDN bị chặn hoặc mạng chậm | Dùng VPN hoặc host file MediaPipe local |
| CPU quá tải khi chạy MediaPipe | Chạy cả FaceMesh + Hands cùng lúc | Giảm resolution camera xuống 160x120 hoặc tắt Hands |
| Âm lượng luôn = 0 | AudioContext bị block trước user interaction | Gọi `audioCtx.resume()` sau khi user click bắt đầu |
| Pitch variance không ổn định | Tiếng ồn môi trường | Thêm noise gate: bỏ qua frame khi volume < 10 |

---

> **Thứ tự nên làm:** Backend cơ bản (Phần 3) → Fine-tune model (Phần 4) → Tích hợp model (Phần 8) → Frontend + Video (Phần 5, 6, 7) → Speech-to-Text (Phần 7) → **MediaPipe (Phần 10) → Audio Analysis (Phần 11)** → Chấm điểm LLM nâng cao (Phần 9, 12)

---

## 15. Tối ưu hóa API Quota — 5 lớp giải pháp

> **Vấn đề cốt lõi:** Gemini Free tier giới hạn 5 RPM · 250k TPM · 500 RPD.  
> Với 50 người chơi × 10 trận/ngày = 500 request → **hết quota ngay ngày đầu public**.  
> Giải pháp không phải chỉ "tiết kiệm token" mà phải **giảm số lần gọi API xuống tối đa**.

---

### Lớp 1 — Tiền xử lý transcript (Input Token Compression)

Loại bỏ nội dung vô nghĩa trước khi gửi lên Gemini, giảm 30–50% input token.

```python
# backend/utils/preprocess.py
import re
from collections import Counter
import math

# Danh sách filler words tiếng Việt
FILLER_WORDS = {
    'à', 'ừm', 'ờ', 'ơ', 'thì', 'là', 'mà', 'cũng', 'thôi',
    'kiểu như là', 'bạn biết đấy', 'thực ra thì', 'ý mình là',
    'nói chung là', 'tức là', 'như thế này', 'bạn hiểu không',
}

def remove_filler_words(text: str) -> str:
    """Xóa từ đệm không mang nghĩa trong transcript"""
    # Xóa filler phrases trước (multi-word)
    for phrase in sorted(FILLER_WORDS, key=len, reverse=True):
        text = re.sub(rf'\b{re.escape(phrase)}\b', '', text, flags=re.IGNORECASE)
    # Xóa khoảng trắng thừa
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extractive_summarize(text: str, max_sentences: int = 10) -> str:
    """
    Tóm tắt trích xuất (Extractive Summarization) bằng TF-IDF đơn giản.
    Chỉ dùng khi transcript > 500 từ.
    Không cần model AI — chạy hoàn toàn bằng Python thuần.
    """
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 10]
    if len(sentences) <= max_sentences:
        return text

    # Tính TF-IDF đơn giản
    word_freq: dict = Counter()
    for sent in sentences:
        words = re.findall(r'\w+', sent.lower())
        word_freq.update(words)

    # Số văn bản (coi mỗi câu là 1 document)
    N = len(sentences)
    idf = {}
    for word in word_freq:
        doc_count = sum(1 for s in sentences if word in s.lower())
        idf[word] = math.log(N / (1 + doc_count))

    # Tính điểm mỗi câu = tổng TF-IDF các từ
    def score_sentence(sent):
        words = re.findall(r'\w+', sent.lower())
        if not words:
            return 0
        return sum(word_freq[w] * idf.get(w, 0) for w in words) / len(words)

    scored = sorted(enumerate(sentences), key=lambda x: score_sentence(x[1]), reverse=True)
    top_indices = sorted([i for i, _ in scored[:max_sentences]])
    return '. '.join(sentences[i] for i in top_indices)

def compress_transcript(text: str, max_words: int = 500) -> str:
    """Pipeline đầy đủ: xóa filler → tóm tắt nếu cần"""
    text = remove_filler_words(text)
    word_count = len(text.split())
    if word_count > max_words:
        text = extractive_summarize(text, max_sentences=10)
    return text
```

**Dùng trong route `/score`:**

```python
from utils.preprocess import compress_transcript

@app.post("/score")
def score_debate(result: DebateResult):
    # Nén transcript trước khi gửi Gemini
    compressed_a = compress_transcript(result.transcript_a)
    compressed_b = compress_transcript(result.transcript_b)
    # ... dùng compressed_a, compressed_b trong prompt thay vì bản gốc
```

---

### Lớp 2 — Tối ưu Prompt (Output Token Minimization)

Siết chặt độ dài output — output token đắt hơn input token 2–4 lần.

```python
SCORE_PROMPT = """Chấm điểm trận tranh biện. Trả về JSON thuần, không giải thích.

CHỦ ĐỀ: {topic}

{player_a} (ủng hộ): {transcript_a}
Ngụy biện: {fallacies_a} | Eye: {eye_a}% | Cảm xúc: {emotion_a} | La hét: {loud_a}%

{player_b} (phản đối): {transcript_b}
Ngụy biện: {fallacies_b} | Eye: {eye_b}% | Cảm xúc: {emotion_b} | La hét: {loud_b}%

Thang điểm: Logic 40đ · Phong thái 20đ · Giọng nói 20đ · Phản biện 20đ
Trừ: 5đ/ngụy biện · 8đ nếu la hét >30%

RÀNG BUỘC ĐỘ DÀI (bắt buộc tuân thủ):
- strengths, weaknesses: tối đa 3 items, mỗi item ≤ 15 từ
- improvement_tips: tối đa 3 items, mỗi item ≤ 20 từ  
- winning_reason, overall_comment: ≤ 30 từ mỗi trường
- fallacy_analysis: ≤ 25 từ, hoặc "none" nếu không có ngụy biện

JSON schema:
{{"a":{{"lg":0,"del":0,"vo":0,"rb":0,"ded":0,"tot":0,"str":[],"wk":[],"fa":"","tips":[]}},"b":{{"lg":0,"del":0,"vo":0,"rb":0,"ded":0,"tot":0,"str":[],"wk":[],"fa":"","tips":[]}},"win":"","why":"","cmt":"","qual":""}}"""
```

> **Lưu ý key ngắn:** `lg`=logic, `del`=delivery, `vo`=voice, `rb`=rebuttal, `ded`=deduction, `tot`=total, `str`=strengths, `wk`=weaknesses, `fa`=fallacy_analysis, `tips`=improvement_tips, `win`=winner, `why`=winning_reason, `cmt`=overall_comment, `qual`=debate_quality.  
> Nhân với 500 RPD/ngày → tiết kiệm ~15–20% token output mỗi request.

---

### Lớp 3 — Ép kiểu JSON nghiêm ngặt (Structured Output)

Dùng `response_mime_type` của Gemini SDK để loại bỏ 100% token "yapping".

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

gemini = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",  # ← Ép chỉ trả JSON
        max_output_tokens=600,                  # ← Hard cap output token
        temperature=0.1,                        # ← Giảm sáng tạo, tăng nhất quán
    )
)

@app.post("/score")
def score_debate(result: DebateResult):
    # ...
    response = gemini.generate_content(prompt)
    # Không cần regex nữa — guaranteed JSON
    scores = json.loads(response.text)
    return {"success": True, "scores": scores}
```

---

### Lớp 4 — Semantic Caching (Bộ đệm ngữ nghĩa)

Nếu 2 trận tranh biện cùng chủ đề với nội dung tương tự → dùng lại kết quả cũ, tốn **0 token**.

```python
# backend/utils/semantic_cache.py
import re, math
from collections import Counter

# Cache lưu trong memory (thay bằng Redis khi deploy production)
_cache: dict = {}   # key = hash ngữ nghĩa, value = kết quả score

def _tfidf_vector(text: str) -> dict:
    """Tạo vector TF-IDF đơn giản cho 1 đoạn text"""
    words = re.findall(r'\w+', text.lower())
    freq = Counter(words)
    total = sum(freq.values())
    return {w: c / total for w, c in freq.items()}

def _cosine_similarity(v1: dict, v2: dict) -> float:
    """Tính cosine similarity giữa 2 vector TF-IDF"""
    common = set(v1) & set(v2)
    if not common:
        return 0.0
    dot   = sum(v1[w] * v2[w] for w in common)
    norm1 = math.sqrt(sum(x**2 for x in v1.values()))
    norm2 = math.sqrt(sum(x**2 for x in v2.values()))
    return dot / (norm1 * norm2 + 1e-9)

def get_cached_score(topic: str, transcript_a: str, transcript_b: str,
                     threshold: float = 0.90):
    """
    Tra cache: nếu similarity > 90% → trả kết quả cũ (Cache Hit).
    Trả None nếu không tìm thấy (Cache Miss).
    """
    query_text = f"{topic} {transcript_a} {transcript_b}"
    query_vec  = _tfidf_vector(query_text)

    for cached_key, cached_data in _cache.items():
        sim = _cosine_similarity(query_vec, cached_data["vector"])
        if sim >= threshold:
            print(f"[Cache HIT] similarity={sim:.3f} — tiết kiệm 1 Gemini call")
            return cached_data["result"]
    return None

def save_to_cache(topic: str, transcript_a: str, transcript_b: str, result: dict):
    """Lưu kết quả vào cache sau Cache Miss"""
    key_text = f"{topic} {transcript_a} {transcript_b}"
    import hashlib
    cache_key = hashlib.md5(key_text.encode()).hexdigest()
    _cache[cache_key] = {
        "vector": _tfidf_vector(key_text),
        "result": result
    }
    # Giới hạn cache size tránh tràn RAM
    if len(_cache) > 500:
        oldest = next(iter(_cache))
        del _cache[oldest]
```

**Tích hợp vào `/score`:**

```python
from utils.semantic_cache import get_cached_score, save_to_cache

@app.post("/score")
def score_debate(result: DebateResult):
    compressed_a = compress_transcript(result.transcript_a)
    compressed_b = compress_transcript(result.transcript_b)

    # 1. Kiểm tra cache trước
    cached = get_cached_score(result.topic, compressed_a, compressed_b)
    if cached:
        return {"success": True, "scores": cached, "from_cache": True}

    # 2. Cache Miss → gọi Gemini
    prompt = SCORE_PROMPT.format(
        topic=result.topic,
        player_a=result.player_a, transcript_a=compressed_a,
        player_b=result.player_b, transcript_b=compressed_b,
        fallacies_a=', '.join(result.fallacies_a) or 'none',
        fallacies_b=', '.join(result.fallacies_b) or 'none',
        eye_a=result.video_scores_a.get('eyeContact', 0),
        emotion_a=result.video_scores_a.get('emotion', 'unknown'),
        loud_a=result.audio_scores_a.get('loudPct', 0),
        eye_b=result.video_scores_b.get('eyeContact', 0),
        emotion_b=result.video_scores_b.get('emotion', 'unknown'),
        loud_b=result.audio_scores_b.get('loudPct', 0),
    )

    response = gemini.generate_content(prompt)
    scores = json.loads(response.text)

    # 3. Lưu vào cache
    save_to_cache(result.topic, compressed_a, compressed_b, scores)

    return {"success": True, "scores": scores, "from_cache": False}
```

---

### Lớp 5 — Chiến lược Quota thực tế khi public

Đây là giải pháp **quan trọng nhất** mà 4 lớp trên không giải quyết được: dù tối ưu đến đâu, 500 RPD vẫn là giới hạn cứng nếu chỉ có 1 API key.

**Giải pháp: API Key Pool + Rate Limiter**

```python
# backend/utils/api_pool.py
import os, time
from itertools import cycle

# Mỗi thành viên đăng ký 1 Google account → 1 API key miễn phí
# 4 thành viên = 4 key = 2,000 RPD tổng
API_KEYS = [
    os.getenv("GEMINI_KEY_1"),
    os.getenv("GEMINI_KEY_2"),
    os.getenv("GEMINI_KEY_3"),
    os.getenv("GEMINI_KEY_4"),
]

_key_cycle  = cycle([k for k in API_KEYS if k])
_key_usage: dict = {}   # key → số lần dùng hôm nay
_last_reset = time.strftime("%Y-%m-%d")

DAILY_LIMIT_PER_KEY = 480   # Đặt dưới 500 để có buffer
RPM_LIMIT = 4               # Đặt dưới 5 RPM để an toàn

def get_available_key() -> str | None:
    """Lấy API key còn quota, xoay vòng qua các key"""
    global _last_reset

    # Reset đếm lúc nửa đêm
    today = time.strftime("%Y-%m-%d")
    if today != _last_reset:
        _key_usage.clear()
        _last_reset = today

    for _ in range(len(API_KEYS)):
        key = next(_key_cycle)
        if not key:
            continue
        used = _key_usage.get(key, 0)
        if used < DAILY_LIMIT_PER_KEY:
            _key_usage[key] = used + 1
            return key

    return None   # Tất cả key đều hết quota hôm nay

# Rate limiter đơn giản (in-memory)
_last_call_time = 0.0

def rate_limited_call(prompt: str) -> str:
    """Gọi Gemini với rate limit 4 RPM"""
    global _last_call_time

    key = get_available_key()
    if key is None:
        raise Exception("Hết API quota cho hôm nay. Vui lòng thử lại ngày mai.")

    # Đảm bảo tối thiểu 15 giây giữa 2 request (= 4 RPM)
    elapsed = time.time() - _last_call_time
    if elapsed < 15:
        time.sleep(15 - elapsed)

    genai.configure(api_key=key)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            max_output_tokens=600,
            temperature=0.1,
        )
    )
    response = model.generate_content(prompt)
    _last_call_time = time.time()
    return response.text
```

**Thêm graceful degradation — khi hết quota không crash app:**

```python
@app.post("/score")
def score_debate(result: DebateResult):
    # ... compression + cache check ...

    try:
        raw = rate_limited_call(prompt)
        scores = json.loads(raw)
        save_to_cache(result.topic, compressed_a, compressed_b, scores)
        return {"success": True, "scores": scores}

    except Exception as e:
        # Fallback: trả kết quả tính từ dữ liệu local (không cần AI)
        # Điểm được tính thủ công từ video/audio/fallacy data đã có
        fallback_scores = compute_local_scores(result)
        return {
            "success": True,
            "scores": fallback_scores,
            "notice": "Kết quả ước tính — hệ thống AI tạm thời quá tải",
            "from_cache": False
        }

def compute_local_scores(result: DebateResult) -> dict:
    """
    Tính điểm hoàn toàn local khi Gemini không khả dụng.
    Dùng dữ liệu video + audio + fallacy đã thu thập được.
    Không cần gọi bất kỳ API nào.
    """
    def player_score(transcript, fallacies, video, audio):
        logic     = max(0, 35 - len(fallacies) * 5)   # Trừ điểm ngụy biện
        delivery  = min(20, int(video.get('eyeContact', 50) / 5))
        voice     = max(0, 20 - int(audio.get('loudPct', 0) / 5))
        rebuttal  = 15  # Điểm mặc định, không có AI để chấm
        deduction = len(fallacies) * 5
        total     = max(0, logic + delivery + voice + rebuttal - deduction)
        return {
            "lg": logic, "del": delivery, "vo": voice,
            "rb": rebuttal, "ded": deduction, "tot": total,
            "str": ["Đã hoàn thành trận đấu"],
            "wk":  [f"Mắc {len(fallacies)} ngụy biện"] if fallacies else [],
            "fa":  "none",
            "tips": ["Xem lại transcript để tự đánh giá"]
        }

    score_a = player_score(result.transcript_a, result.fallacies_a,
                           result.video_scores_a, result.audio_scores_a)
    score_b = player_score(result.transcript_b, result.fallacies_b,
                           result.video_scores_b, result.audio_scores_b)
    winner  = result.player_a if score_a["tot"] >= score_b["tot"] else result.player_b

    return {
        "a": score_a, "b": score_b,
        "win": winner,
        "why": "Điểm tổng cao hơn",
        "cmt": "Kết quả tính tự động (AI tạm thời không khả dụng)",
        "qual": "Trung bình"
    }
```

---

### Tổng kết: Hiệu quả từng lớp

| Lớp | Giải pháp | Giảm API call | Giảm token |
|-----|-----------|--------------|------------|
| 1 | Xóa filler + Extractive Summarization | 0% | 30–50% input |
| 2 | Prompt ngắn + key ngắn + giới hạn output | 0% | 20–30% output |
| 3 | `response_mime_type=json` + `max_output_tokens` | 0% | 10–15% output |
| 4 | Semantic Cache (TF-IDF cosine similarity) | **40–60%** | 40–60% tất cả |
| 5 | API Key Pool × 4 + Rate Limiter + Local Fallback | N/A | **×4 quota** |

> **Kết quả kỳ vọng:** Từ giới hạn 500 RPD → hiệu quả ~2,000 RPD thực tế (nhờ key pool) với ~40% request được phục vụ từ cache (không tốn quota). Khi hết quota vẫn có `compute_local_scores()` đảm bảo app không crash.

