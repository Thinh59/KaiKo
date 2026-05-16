from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import google.generativeai as genai
from dotenv import load_dotenv
import torch
import os
import json
import re
from typing import Optional, List, Dict
import asyncio
import uuid
import random
import sqlite3
import hashlib

load_dotenv()

app = FastAPI(title="KaiKo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Bật CORS cho mọi origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load model khi khởi động server ---
FALLACY_MODEL_PATH = "./fallacy_model/kaiko_fallacy_model_final"
ARGKP_MODEL_PATH = "./fallacy_model/kaiko_argkp_model_final"

LABEL_NAMES = [
    'ad hominem', 'ad populum', 'appeal to emotion',
    'circular reasoning', 'equivocation', 'fallacy of credibility',
    'fallacy of extension', 'fallacy of logic', 'fallacy of relevance',
    'false causality', 'false dilemma', 'faulty generalization', 'intentional'
]

LABEL_VI = {
    'ad hominem':           'Công kích cá nhân',
    'ad populum':           'Dựa vào số đông',
    'appeal to emotion':    'Khai thác cảm xúc',
    'circular reasoning':   'Lập luận vòng tròn',
    'equivocation':         'Ngụy biện từ ngữ',
    'fallacy of credibility': 'Ngụy biện uy tín',
    'fallacy of extension': 'Bóp méo lập luận',
    'fallacy of logic':     'Lập luận hợp lệ',
    'fallacy of relevance': 'Lập luận lạc đề',
    'false causality':      'Nhân quả giả',
    'false dilemma':        'Lưỡng nan giả',
    'faulty generalization':'Khái quát hóa sai',
    'intentional':          'Ngụy biện cố ý'
}

fallacy_tokenizer = None
fallacy_model = None

argkp_tokenizer = None
argkp_model = None

@app.on_event("startup")
def load_model():
    global fallacy_tokenizer, fallacy_model, argkp_tokenizer, argkp_model
    
    # Load Fallacy Model
    if os.path.exists(FALLACY_MODEL_PATH):
        print("Đang load Fallacy Model...")
        try:
            fallacy_tokenizer = AutoTokenizer.from_pretrained(FALLACY_MODEL_PATH)
            fallacy_model = AutoModelForSequenceClassification.from_pretrained(FALLACY_MODEL_PATH)
            fallacy_model.eval()
            print("✅ Load Fallacy Model xong!")
        except Exception as e:
            print(f"❌ Lỗi load Fallacy Model: {e}")
    else:
        print("⚠️  Chưa có Fallacy model. Sẽ sử dụng Gemini API làm phương án dự phòng.")

    # Load ArgKP Model
    if os.path.exists(ARGKP_MODEL_PATH):
        print("Đang load ArgKP Model...")
        try:
            argkp_tokenizer = AutoTokenizer.from_pretrained(ARGKP_MODEL_PATH)
            argkp_model = AutoModelForSequenceClassification.from_pretrained(ARGKP_MODEL_PATH)
            argkp_model.eval()
            print("✅ Load ArgKP Model xong!")
        except Exception as e:
            print(f"❌ Lỗi load ArgKP Model: {e}")
    else:
        print("⚠️  Chưa có ArgKP model.")

    # Config Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        print("✅ Gemini API configured")

    # Init SQLite DB
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            nickname TEXT
        )
    ''')
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN nickname TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            opponent TEXT NOT NULL,
            topic TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT '1v1',
            result TEXT NOT NULL,
            score_self INTEGER DEFAULT 0,
            score_opp INTEGER DEFAULT 0,
            fallacies_self INTEGER DEFAULT 0,
            fallacies_opp INTEGER DEFAULT 0,
            summary TEXT DEFAULT '',
            played_at TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            UNIQUE(sender, receiver)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1 TEXT NOT NULL,
            user2 TEXT NOT NULL,
            UNIQUE(user1, user2)
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ SQLite DB ready")

TRENDING_TOPICS = [
    "TikTok có nên bị cấm cho trẻ em dưới 16 tuổi?",
    "Có nên đánh thuế thu nhập với idol tóp tóp/streamer?",
    "Làm việc từ xa (WFH) có hiệu quả hơn lên văn phòng?",
    "Sự nghiệp hay tình yêu quan trọng hơn ở tuổi 25?",
    "Bằng đại học có còn quan trọng trong thời đại AI?",
    "ChatGPT có đang làm học sinh lười đi?",
    "AI có nên được cấp quyền công dân không?",
    "Giáo dục đại học có nên miễn phí cho tất cả mọi người?",
    "Công nghệ có đang làm con người xa cách nhau hơn?",
    "Mạng xã hội có lợi hay có hại cho dân chủ?",
    "Thế hệ Gen Z có đang chịu quá nhiều áp lực đồng trang lứa?",
    "Có nên ủng hộ văn hóa tẩy chay (Cancel Culture) trên MXH?",
    "E-Sports có nên được công nhận như một môn thể thao Olympic?",
    "Có nên cấm sử dụng điện thoại thông minh trong trường học?",
    "Phẫu thuật thẩm mỹ có làm giảm giá trị thực của con người?"
]

# --- WebSocket Matchmaking & Signaling ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.player_names: Dict[str, str] = {}  # client_id -> playerName
        self.waiting_players = {"1v1": [], "2v2": []}
        self.rooms = {}
        self.topics = TRENDING_TOPICS

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.player_names:
            del self.player_names[client_id]
        for mode in self.waiting_players:
            if client_id in self.waiting_players[mode]:
                self.waiting_players[mode].remove(client_id)

    async def notify_opponent_disconnected(self, client_id: str):
        """Find opponent in any room and notify them that this player disconnected."""
        for room_id, room in self.rooms.items():
            if client_id in room["players"]:
                for pid in room["players"]:
                    if pid != client_id and pid in self.active_connections:
                        await self.send_personal_message(json.dumps({
                            "type": "player_declined",
                            "reason": "disconnect"
                        }), pid)
                break

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def matchmake(self, client_id: str, player_name: str, mode: str):
        self.player_names[client_id] = player_name
        print(f"🔍 Player '{player_name}' ({client_id}) is searching for a {mode} match...")
        queue = self.waiting_players.get(mode)
        if queue is None:
            print(f"❌ Invalid mode: {mode}")
            return

        if len(queue) > 0:
            opponent_id = queue.pop(0)
            opponent_name = self.player_names.get(opponent_id, opponent_id)
            print(f"✅ Match Found! {client_id} vs {opponent_id}")
            room_id = f"room_{uuid.uuid4().hex[:8]}"
            topic = random.choice(self.topics)
            self.rooms[room_id] = {
                "players": [client_id, opponent_id],
                "topic": topic
            }
            # Báo cho client_id (guest - người join)
            await self.send_personal_message(json.dumps({
                "type": "matched",
                "roomId": room_id,
                "isHost": False,
                "opponentId": opponent_id,
                "opponentName": opponent_name,
                "topic": topic
            }), client_id)
            # Báo cho opponent_id (host - người tạo)
            await self.send_personal_message(json.dumps({
                "type": "matched",
                "roomId": room_id,
                "isHost": True,
                "opponentId": client_id,
                "opponentName": player_name,
                "topic": topic
            }), opponent_id)
            print(f"📢 Notification sent to both players in {room_id}")
        else:
            if client_id not in queue:
                queue.append(client_id)
                print(f"⏳ Added {client_id} to {mode} queue. Current queue: {len(queue)}")
            else:
                print(f"ℹ️ {client_id} is already in the queue.")

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "find_match":
                await manager.matchmake(client_id, message.get("playerName"), message.get("mode", "1v1"))
                
            elif msg_type == "create_room":
                room_code = str(random.randint(10000, 99999))
                manager.rooms[room_code] = {
                    "players": [client_id],
                    "topic": random.choice(manager.topics)
                }
                await manager.send_personal_message(json.dumps({
                    "type": "room_created",
                    "roomCode": room_code
                }), client_id)

            elif msg_type == "join_room":
                room_code = message.get("roomCode")
                if room_code in manager.rooms and len(manager.rooms[room_code]["players"]) == 1:
                    opponent_id = manager.rooms[room_code]["players"][0]
                    topic = manager.rooms[room_code]["topic"]
                    manager.rooms[room_code]["players"].append(client_id)
                    
                    # Notify Guest
                    await manager.send_personal_message(json.dumps({
                        "type": "matched",
                        "roomId": room_code,
                        "isHost": False,
                        "opponentId": opponent_id,
                        "topic": topic
                    }), client_id)
                    # Notify Host
                    await manager.send_personal_message(json.dumps({
                        "type": "matched",
                        "roomId": room_code,
                        "isHost": True,
                        "opponentId": client_id,
                        "topic": topic
                    }), opponent_id)
                else:
                    await manager.send_personal_message(json.dumps({
                        "type": "error",
                        "message": "Phòng không tồn tại hoặc đã đầy!"
                    }), client_id)
            elif msg_type in ["offer", "answer", "ice-candidate", "transcript_update", "fallacy_detected", "debate_ended", "emoji_react", "player_ready", "player_declined"]:
                target_id = message.get("target")
                if target_id:
                    # Chuyển tiếp tin nhắn tới đối phương
                    await manager.send_personal_message(json.dumps(message), target_id)
                    
    except WebSocketDisconnect:
        await manager.notify_opponent_disconnected(client_id)
        manager.disconnect(client_id)

# --- Models dữ liệu ---

class TextInput(BaseModel):
    text: str
    speaker: str = "unknown"

class ArgInput(BaseModel):
    argument: str
    topic: str

class DebateResult(BaseModel):
    topic: str
    player_a: str
    player_b: str
    transcript_a: str
    transcript_b: str
    fallacies_a: List[str] = []
    fallacies_b: List[str] = []
    video_scores_a: dict = {}
    audio_scores_a: dict = {}
    video_scores_b: dict = {}
    audio_scores_b: dict = {}

class AuthInput(BaseModel):
    username: str
    password: str

class DebateContext(BaseModel):
    topic: str
    transcript_a: str
    transcript_b: str

class SaveMatch(BaseModel):
    username: str
    opponent: str
    topic: str
    mode: str = "solo_ai"
    result: str        # "win" | "lose" | "draw"
    score_self: int = 0
    score_opp: int = 0
    fallacies_self: int = 0
    fallacies_opp: int = 0
    summary: str = ""

class FriendAction(BaseModel):
    user: str
    target: str

# --- Routes ---

import random

@app.get("/random-topic")
async def get_random_topic():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": True, "topic": random.choice(TRENDING_TOPICS)}

    try:
        gemini = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config=genai.GenerationConfig(
                max_output_tokens=50,
                temperature=0.9,
            )
        )
        prompt = "Hãy liệt kê 1 chủ đề tranh biện đang hot nhất trên mạng xã hội Việt Nam hôm nay. Chỉ trả về đúng 1 câu chủ đề ngắn gọn (dưới 15 chữ), không kèm thêm bất kỳ văn bản nào khác. Ví dụ: 'Có nên cấm học sinh dùng điện thoại trong trường?'"
        response = await asyncio.to_thread(gemini.generate_content, prompt)
        topic = response.text.strip().replace('"', '')
        if len(topic) > 10:
            return {"success": True, "topic": topic}
    except Exception as e:
        print("Lỗi tạo topic bằng Gemini 2.5:", e)
        
    return {"success": True, "topic": random.choice(TRENDING_TOPICS)}

@app.get("/")
def root():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/register")
def register(user: AuthInput):
    if not user.username or not user.password:
        return {"success": False, "error": "Vui lòng nhập đủ tên đăng nhập và mật khẩu"}
    
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT username FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Tài khoản đã tồn tại"}
        
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (user.username, pwd_hash))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Đăng ký thành công"}

@app.post("/login")
def login(user: AuthInput):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    
    cursor.execute("SELECT username FROM users WHERE username = ? AND password_hash = ?", (user.username, pwd_hash))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"success": True, "username": row[0]}
    else:
        return {"success": False, "error": "Sai tài khoản hoặc mật khẩu"}

class NicknameUpdate(BaseModel):
    username: str
    nickname: str

@app.post("/set-nickname")
def set_nickname(data: NicknameUpdate):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = ?", (data.username,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)", (data.username, "clerk_auth", data.nickname))
    else:
        cursor.execute("UPDATE users SET nickname = ? WHERE username = ?", (data.nickname, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/nicknames")
def get_nicknames():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT username, nickname FROM users WHERE nickname IS NOT NULL AND nickname != ''")
    rows = cursor.fetchall()
    conn.close()
    return {"success": True, "nicknames": {row[0]: row[1] for row in rows}}

@app.post("/save-match")
def save_match(data: SaveMatch):
    """Lưu kết quả trận đấu vào lịch sử"""
    from datetime import datetime, timezone
    played_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO match_history
            (username, opponent, topic, mode, result,
             score_self, score_opp, fallacies_self, fallacies_opp, summary, played_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.username, data.opponent, data.topic, data.mode, data.result,
        data.score_self, data.score_opp,
        data.fallacies_self, data.fallacies_opp,
        data.summary, played_at
    ))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/history/{username}")
def get_history(username: str, limit: int = 20):
    """Lấy lịch sử trận đấu của user"""
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, opponent, topic, mode, result,
               score_self, score_opp, fallacies_self, fallacies_opp,
               summary, played_at
        FROM match_history
        WHERE username = ?
        ORDER BY played_at DESC
        LIMIT ?
    """, (username, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"success": True, "history": rows}

@app.get("/leaderboard")
def get_leaderboard(limit: int = 10):
    """Lấy bảng xếp hạng công bằng: Ưu tiên Thắng, sau đó là Hiệu năng trận đấu thực tế"""
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Logic: 
    # 1. Chỉ tính điểm TB (avg_score) cho những trận có phát sinh điểm (score_self > 0)
    # 2. Sắp xếp theo số trận thắng (wins) trước, sau đó là điểm hiệu năng TB
    cursor.execute("""
        SELECT username, 
               COUNT(id) as total_matches,
               SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
               SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses,
               -- Loại bỏ các trận 0 điểm khỏi mẫu số để không làm loãng điểm trung bình
               ROUND(AVG(CASE WHEN score_self > 0 THEN score_self ELSE NULL END), 1) as avg_score
        FROM match_history
        GROUP BY username
        HAVING total_matches > 0
        ORDER BY wins DESC, avg_score DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    # Fix giá trị null nếu user chưa có trận nào có điểm > 0
    for row in rows:
        if row['avg_score'] is None:
            row['avg_score'] = 0
            
    return {"success": True, "leaderboard": rows}

# --- FRIENDS SYSTEM ---
@app.get("/friends/{username}")
def get_friends(username: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # Lấy danh sách bạn bè
    cursor.execute("""
        SELECT user2 FROM friends WHERE user1 = ?
        UNION
        SELECT user1 FROM friends WHERE user2 = ?
    """, (username, username))
    friends = [row[0] for row in cursor.fetchall()]
    
    # Lấy lời mời kết bạn (những người gửi cho username)
    cursor.execute("SELECT sender FROM friend_requests WHERE receiver = ?", (username,))
    requests = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    return {"success": True, "friends": friends, "requests": requests}

@app.post("/friend-request")
def send_friend_request(data: FriendAction):
    if data.user == data.target:
        return {"success": False, "error": "Không thể tự kết bạn"}
        
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # Kiểm tra target có tồn tại không
    cursor.execute("SELECT username FROM users WHERE username = ?", (data.target,))
    if not cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Người chơi không tồn tại"}
        
    # Kiểm tra đã là bạn chưa
    cursor.execute("""
        SELECT id FROM friends 
        WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
    """, (data.user, data.target, data.target, data.user))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Đã là bạn bè"}
        
    try:
        cursor.execute("INSERT INTO friend_requests (sender, receiver) VALUES (?, ?)", (data.user, data.target))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Đã gửi rồi
    conn.close()
    return {"success": True}

@app.post("/accept-friend")
def accept_friend(data: FriendAction):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friend_requests WHERE sender = ? AND receiver = ?", (data.target, data.user))
    try:
        cursor.execute("INSERT INTO friends (user1, user2) VALUES (?, ?)", (data.user, data.target))
        conn.commit()
    except:
        pass
    conn.close()
    return {"success": True}

@app.post("/decline-friend")
def decline_friend(data: FriendAction):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friend_requests WHERE sender = ? AND receiver = ?", (data.target, data.user))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/remove-friend")
def remove_friend(data: FriendAction):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM friends 
        WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
    """, (data.user, data.target, data.target, data.user))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/analyze")
async def analyze_fallacy(input: TextInput):
    """Phân tích ngụy biện trong một câu/đoạn text"""
    if len(input.text.strip()) < 10:
        return {"fallacy": None, "confidence": 0}

    # Sử dụng HuggingFace Model nếu đã load
    if fallacy_model is not None and fallacy_tokenizer is not None:
        try:
            tokens = fallacy_tokenizer(
                input.text,
                return_tensors='pt',
                truncation=True,
                max_length=256
            )

            with torch.no_grad():
                logits = fallacy_model(**tokens).logits

            probs     = torch.softmax(logits, dim=-1)[0]
            top_idx   = probs.argmax().item()
            confidence = round(probs[top_idx].item() * 100, 1)
            label     = LABEL_NAMES[top_idx]

            is_fallacy = label != 'fallacy of logic' and confidence >= 70

            return {
                "fallacy":      LABEL_VI.get(label, label) if is_fallacy else None,
                "fallacy_en":   label,
                "confidence":   confidence,
                "is_fallacy":   is_fallacy,
                "speaker":      input.speaker
            }
        except Exception as e:
            print(f"Lỗi phân tích local model: {e}")
            
    # Fallback sử dụng Gemini nếu chưa có model
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Chưa có Model cục bộ và chưa config GEMINI_API_KEY", "fallacy": None, "confidence": 0}
        
    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                max_output_tokens=200,
                temperature=0.1,
            )
        )
        prompt = f"""Phân tích xem câu sau có chứa ngụy biện logic không.
        Câu nói: "{input.text}"
        Chỉ trả về JSON format sau:
        {{
            "is_fallacy": true/false,
            "fallacy_name_en": "tên tiếng anh (ví dụ: ad hominem)",
            "fallacy_name_vi": "tên tiếng việt (ví dụ: Công kích cá nhân)",
            "confidence": 95
        }}"""
        response = await asyncio.to_thread(gemini.generate_content, prompt)
        text = response.text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            res = json.loads(match.group())
            return {
                "fallacy": res.get("fallacy_name_vi") if res.get("is_fallacy") else None,
                "fallacy_en": res.get("fallacy_name_en"),
                "confidence": res.get("confidence", 80),
                "is_fallacy": res.get("is_fallacy", False),
                "speaker": input.speaker
            }
    except Exception as e:
        print(f"Lỗi Gemini fallback: {e}")
        
        
    return {"fallacy": None, "confidence": 0, "is_fallacy": False}

@app.post("/check-argument")
async def check_argument(input: ArgInput):
    """Đánh giá xem lập luận có bám sát chủ đề không (ArgKP)"""
    if len(input.argument.strip()) < 10:
        return {"match": False, "score": 0}

    # Sử dụng ArgKP Model
    if argkp_model is not None and argkp_tokenizer is not None:
        try:
            tokens = argkp_tokenizer(
                input.argument,
                input.topic,
                return_tensors='pt',
                padding="max_length",
                truncation=True,
                max_length=256
            )

            with torch.no_grad():
                logits = argkp_model(**tokens).logits

            probs = torch.softmax(logits, dim=-1)[0]
            score = round(probs[1].item() * 100, 1) # Điểm khớp (Nhãn 1)
            is_match = probs.argmax().item() == 1

            return {
                "match": is_match,
                "score": score,
                "argument": input.argument,
                "topic": input.topic
            }
        except Exception as e:
            print(f"Lỗi phân tích ArgKP model: {e}")
            
    return {"match": True, "score": 100} # Mặc định đúng nếu lỗi model

@app.post("/hint")
async def get_hint(context: DebateContext):
    """Tạo gợi ý ngắn gọn (Hint Bot) cho user dựa trên lời của đối thủ"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": False, "hint": "Vui lòng cấu hình API Key để nhận gợi ý."}

    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                max_output_tokens=100,
                temperature=0.7,
            )
        )
        prompt = f"""Chủ đề: "{context.topic}"
Đối thủ vừa nói: "{context.transcript_b}"
Hãy đưa ra 1 câu gợi ý thật ngắn gọn (dưới 20 chữ) bằng tiếng Việt để giúp người chơi phản biện lại điểm yếu trong câu nói trên."""
        response = await asyncio.to_thread(gemini.generate_content, prompt)
        return {"success": True, "hint": response.text.strip()}
    except Exception as e:
        return {"success": False, "hint": "Không thể tạo gợi ý lúc này."}

@app.post("/generate-response")
async def generate_response(context: DebateContext):
    """Tạo câu trả lời của AI trong chế độ Solo AI"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": False, "error": "Chưa config GEMINI_API_KEY", "response": "Xin lỗi, hệ thống chưa được cấu hình API key của AI."}
        
    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                max_output_tokens=300,
                temperature=0.7,
            )
        )
        prompt = f"""Bạn là một chuyên gia tranh biện sắc bén. Đang tham gia một trận tranh biện.
Chủ đề: "{context.topic}"
Lập luận của đối thủ (Player A): "{context.transcript_a}"
Lập luận trước đó của bạn (nếu có): "{context.transcript_b}"

Hãy đưa ra luận điểm phản biện lại đối thủ một cách đanh thép, logic và thuyết phục trong khoảng 4-5 câu. Sử dụng tiếng Việt tự nhiên, phù hợp để nói ra bằng giọng nói. Không dùng các ký tự markdown hay định dạng phức tạp."""
        
        response = await asyncio.to_thread(gemini.generate_content, prompt)
        return {"success": True, "response": response.text.strip()}
    except Exception as e:
        print(f"Lỗi tạo phản hồi AI: {e}")
        return {"success": False, "error": str(e), "response": "Xin lỗi, tôi đang gặp trục trặc kỹ thuật và không thể suy nghĩ ngay lúc này."}

@app.post("/score")
async def score_debate(result: DebateResult):
    """Chấm điểm toàn bộ trận tranh biện bằng LLM"""

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": False, "error": "Chưa config GEMINI_API_KEY"}

    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                max_output_tokens=1000,
                temperature=0.1,
            )
        )

        prompt = f"""Bạn là chuyên gia huấn luyện kỹ năng tranh biện chuyên nghiệp.
Hãy chấm điểm và phân tích chi tiết trận tranh biện sau (chỉ trả JSON, không giải thích thêm):

CHỦ ĐỀ: {result.topic}

{result.player_a} (ủng hộ):
Lời phát biểu: {result.transcript_a}
Ngụy biện: {', '.join(result.fallacies_a) if result.fallacies_a else 'Không có'}

{result.player_b} (phản đối):
Lời phát biểu: {result.transcript_b}
Ngụy biện: {', '.join(result.fallacies_b) if result.fallacies_b else 'Không có'}

Thang điểm: Logic 40đ · Phong thái 20đ · Giọng nói 20đ · Phản biện 20đ
Trừ: 5đ/ngụy biện

JSON format (bắt buộc):
{{
  "player_a": {{"logic": 0, "delivery": 0, "voice": 0, "rebuttal": 0, "deduct": 0, "total": 0,
    "strengths": [], "weaknesses": [], "tips": []}},
  "player_b": {{"logic": 0, "delivery": 0, "voice": 0, "rebuttal": 0, "deduct": 0, "total": 0,
    "strengths": [], "weaknesses": [], "tips": []}},
  "winner": "",
  "why": "",
  "comment": "",
  "quality": ""
}}"""

        response = await asyncio.to_thread(gemini.generate_content, prompt)
        text = response.text
        # Try parse entire response as JSON first
        try:
            scores = json.loads(text)
            return {"success": True, "scores": scores}
        except json.JSONDecodeError:
            pass
        # Fall back to regex extraction
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            scores = json.loads(match.group())
            return {"success": True, "scores": scores}
        return {"success": False, "error": "Không parse được JSON từ Gemini", "raw": text[:500]}

    except Exception as e:
        return {"success": False, "error": str(e)}

