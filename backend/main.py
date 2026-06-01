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
import psycopg2
import psycopg2.extras
import hashlib

load_dotenv()

# --- PostgreSQL connection helper ---
def get_db():
    url = os.getenv("DATABASE_URL", "postgresql://postgres:yourpassword@localhost:5432/kaiko")
    conn = psycopg2.connect(url)
    return conn


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

    # Init PostgreSQL DB
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            nickname TEXT,
            store_points INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_history (
            id SERIAL PRIMARY KEY,
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
            id SERIAL PRIMARY KEY,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            UNIQUE(sender, receiver)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friends (
            id SERIAL PRIMARY KEY,
            user1 TEXT NOT NULL,
            user2 TEXT NOT NULL,
            debate_count INTEGER DEFAULT 0,
            UNIQUE(user1, user2)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_items (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            item_id TEXT NOT NULL,
            purchased_at TEXT NOT NULL,
            UNIQUE(username, item_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'upcoming',
            event_type TEXT NOT NULL DEFAULT 'small',
            reward TEXT DEFAULT '',
            deadline TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS event_participants (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            UNIQUE(event_id, username)
        )
    ''')
    # Add missing columns safely (PostgreSQL style)
    for col_sql in [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS store_points INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS frame TEXT DEFAULT 'none'",
        "ALTER TABLE friends ADD COLUMN IF NOT EXISTS debate_count INTEGER DEFAULT 0",
        "ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS submission_text TEXT",
        "ALTER TABLE match_history ADD COLUMN IF NOT EXISTS fallacies_list_self TEXT DEFAULT ''",
        "ALTER TABLE match_history ADD COLUMN IF NOT EXISTS fallacies_list_opp TEXT DEFAULT ''",
        "ALTER TABLE match_history ADD COLUMN IF NOT EXISTS transcript_self TEXT DEFAULT ''",
        "ALTER TABLE match_history ADD COLUMN IF NOT EXISTS transcript_opp TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS checkin_streak INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_checkin TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_losses INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS level_real INTEGER DEFAULT 1"
    ]:
        try:
            cursor.execute(col_sql)
        except Exception:
            conn.rollback()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS submission_votes (
            id SERIAL PRIMARY KEY,
            participant_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            voted_at TEXT NOT NULL,
            UNIQUE(participant_id, username)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_achievements (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            UNIQUE(username, achievement_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mentorship (
            id SERIAL PRIMARY KEY,
            master TEXT NOT NULL,
            disciple TEXT NOT NULL,
            start_date TEXT NOT NULL,
            is_graduated BOOLEAN DEFAULT FALSE,
            debate_count INTEGER DEFAULT 0,
            UNIQUE(master, disciple)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mentorship_requests (
            id SERIAL PRIMARY KEY,
            master TEXT NOT NULL,
            disciple TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(master, disciple)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_posts (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            likes INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_comments (
            id SERIAL PRIMARY KEY,
            post_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_reviews (
            id SERIAL PRIMARY KEY,
            match_id INTEGER NOT NULL,
            reviewer TEXT NOT NULL,
            reviewee TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT DEFAULT '',
            reviewer_level INTEGER DEFAULT 1,
            level_bonus INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            UNIQUE(match_id, reviewer, reviewee)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS judge_actions (
            id SERIAL PRIMARY KEY,
            judge TEXT NOT NULL,
            target TEXT NOT NULL,
            action_type TEXT NOT NULL,
            score_delta INTEGER DEFAULT 0,
            level_delta INTEGER DEFAULT 0,
            reason TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_daily_comments (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            comment_date TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            UNIQUE(username, comment_date)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            sender TEXT NOT NULL,
            target TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('SELECT COUNT(*) as count FROM events')
    if cursor.fetchone()['count'] == 0:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        cursor.executemany(
            'INSERT INTO events (title, description, status, event_type, reward, deadline, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)',
            [
                ('Đại Chiến Văn Mẫu', 'Debate: Tả con chó nhà em nhưng dưới góc nhìn của một hoàng thượng mèo.', 'open', 'small', 'Khung Hoàng Thượng + 200 Điểm', '2026-06-20', now),
                ('Bình Chọn Chủ Đề Tuần Mới', 'Vote chọn chủ đề tranh biện siêu hot từ TikTok/Reddit. (Bắt đầu vote từ 10g sáng ngày mở sự kiện)', 'upcoming', 'small', '50 Điểm Tích Lũy', '2026-06-24', now),
                ('Đại Chiến Cua Ma & Cua Thần', 'Tranh biện: Cua ma hay Cua hoàng đế ngon hơn? Phe thắng nhận đặc quyền Level 101!', 'locked', 'large', 'Level 101 + VIP', '2026-12-01', now),
            ]
        )
    conn.commit()
    conn.close()
    print('✅ PostgreSQL DB ready')

TRENDING_TOPICS = [
    # Mạng xã hội & Trend
    "TikTok có nên bị cấm cho trẻ em dưới 16 tuổi?",
    "Flexing trên mạng xã hội: Sống ảo hay động lực phấn đấu?",
    "Gen Z dùng quá nhiều tiếng lóng: Tiến hóa hay làm hỏng tiếng Việt?",
    "Review quán ăn trên TikTok: Đáng tin hay toàn seeding?",
    "Sống 'phông bạt' trên MXH có phải là một loại bệnh lý?",
    "Hủy diệt (Cancel) một người trên MXH: Công lý hay bạo lực mạng?",
    "Tóp Tóp đang làm giới trẻ mất khả năng tập trung sâu?",
    
    # Reddit & Thắc mắc cuộc sống
    "Có nên tin lời khuyên tình cảm từ cộng đồng mạng Reddit?",
    "Chia tiền 50/50 buổi hẹn đầu tiên: Hiện đại hay quá đáng?",
    "Sự nghiệp hay tình yêu quan trọng hơn ở tuổi 25?",
    "Văn hóa 'hustle' (làm việc bất chấp): Đam mê hay bóc lột?",
    "Bằng đại học có còn quan trọng trong thời đại AI?",
    
    # Văn mẫu hài hước
    "Tả con chó nhà em dưới góc nhìn của 'hoàng thượng' mèo",
    "Tại sao 'Trà Sữa' lại có sức mạnh hòa giải lớn hơn lời xin lỗi?",
    "Cảm nghĩ của cái điện thoại khi bị rớt xuống bồn cầu",
    "Phân tích tâm lý khi lỡ tay gửi nhầm tin nhắn nói xấu cho sếp",
    "Có nên đưa môn 'Thấu hiểu phụ nữ' vào giảng dạy THPT?",
    "Tranh biện: Cua ma hay Cua hoàng đế ngon hơn?"
]

# --- WebSocket Matchmaking & Signaling ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.player_names: Dict[str, str] = {}  # client_id -> playerName
        self.waiting_players = {"1v1": [], "text_1v1": [], "2v2": []}
        self.rooms = {}
        self.spectators: Dict[str, set[str]] = {}
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
            self.waiting_players[mode] = [p for p in self.waiting_players[mode] if p["id"] != client_id]
        for room_id in list(self.spectators.keys()):
            self.spectators[room_id].discard(client_id)
            if not self.spectators[room_id]:
                del self.spectators[room_id]

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
            try:
                await self.active_connections[client_id].send_text(message)
            except RuntimeError:
                # The connection is already closed
                pass

    async def send_message_to_username(self, message: str, username: str):
        prefix = f"{username}_"
        for cid, ws in self.active_connections.items():
            if cid.startswith(prefix):
                try:
                    await ws.send_text(message)
                except:
                    pass

    def find_room_for_players(self, *client_ids: str):
        for room_id, room in self.rooms.items():
            players = room.get("players", [])
            if any(cid in players for cid in client_ids if cid):
                return room_id
        return None

    async def broadcast_to_spectators(self, room_id: str, payload: dict):
        for cid in list(self.spectators.get(room_id, set())):
            if cid in self.active_connections:
                try:
                    await self.send_personal_message(json.dumps({
                        "type": "spectator_event",
                        "roomId": room_id,
                        "event": payload
                    }), cid)
                except:
                    pass

    async def matchmake(self, client_id: str, player_name: str, mode: str, level: int = 1, visibility: str = "private"):
        username = client_id.rsplit("_", 1)[0]
        try:
            conn = get_db()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cursor.execute("SELECT COALESCE(level_real, 1) as level FROM users WHERE username=%s", (username,))
            row = cursor.fetchone()
            conn.close()
            if row:
                level = row["level"] or level
        except Exception:
            pass
        self.player_names[client_id] = player_name
        visibility = "public" if visibility == "public" else "private"
        print(f"🔍 Player '{player_name}' (Lv.{level}, {client_id}) is searching for a {mode} match...")
        queue = self.waiting_players.get(mode)
        if queue is None:
            print(f"❌ Invalid mode: {mode}")
            return

        if len(queue) > 0:
            # Tìm người chơi có level chênh lệch <= 10 (Tier-based matching)
            matched_idx = -1
            for i, p in enumerate(queue):
                if abs(p["level"] - level) <= 10:
                    matched_idx = i
                    break
            
            # Nếu không tìm thấy ai chênh <= 10 level, lấy người đầu tiên (chờ lâu)
            if matched_idx == -1:
                matched_idx = 0
                
            opponent_info = queue.pop(matched_idx)
            opponent_id = opponent_info["id"]
            opponent_name = self.player_names.get(opponent_id, opponent_id)
            print(f"✅ Match Found! {client_id} (Lv.{level}) vs {opponent_id} (Lv.{opponent_info['level']})")
            room_id = f"room_{uuid.uuid4().hex[:8]}"
            topic = random.choice(self.topics)
            self.rooms[room_id] = {
                "players": [client_id, opponent_id],
                "topic": topic,
                "mode": mode,
                "visibility": visibility,
                "player_names": {
                    client_id: player_name,
                    opponent_id: opponent_name
                },
                "levels": {
                    client_id: level,
                    opponent_id: opponent_info.get("level", 1)
                }
            }
            # Tự động random người nào là Host (Ủng Hộ) và người nào là Guest (Phản Đối)
            is_client_host = random.choice([True, False])
            
            # Báo cho client_id
            await self.send_personal_message(json.dumps({
                "type": "matched",
                "roomId": room_id,
                "isHost": is_client_host,
                "opponentId": opponent_id,
                "opponentName": opponent_name,
                "topic": topic
            }), client_id)
            # Báo cho opponent_id
            await self.send_personal_message(json.dumps({
                "type": "matched",
                "roomId": room_id,
                "isHost": not is_client_host,
                "opponentId": client_id,
                "opponentName": player_name,
                "topic": topic
            }), opponent_id)
            print(f"📢 Notification sent to both players in {room_id}")
        else:
            if not any(p["id"] == client_id for p in queue):
                queue.append({"id": client_id, "level": level})
                print(f"⏳ {client_id} added to {mode} waiting queue. Current queue: {len(queue)}")
            else:
                print(f"ℹ️ {client_id} is already in the queue.")

manager = ConnectionManager()

def public_room_snapshot(room_id: str, room: dict):
    players = room.get("players", [])
    names = room.get("player_names", {})
    levels = room.get("levels", {})
    return {
        "roomId": room_id,
        "topic": room.get("topic", "Chủ đề ngẫu nhiên"),
        "mode": room.get("mode", "1v1"),
        "players": [
            {
                "id": pid,
                "name": names.get(pid, pid.rsplit("_", 1)[0]),
                "level": levels.get(pid, 1)
            }
            for pid in players
        ],
        "spectators": len(manager.spectators.get(room_id, set())),
        "visibility": room.get("visibility", "private"),
        "isHighLevel": max([levels.get(pid, 1) for pid in players] or [1]) >= 31
    }

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "find_match":
                await manager.matchmake(client_id, message.get("playerName"), message.get("mode", "1v1"), message.get("level", 1), message.get("visibility", "private"))
                
            elif msg_type == "create_room":
                room_code = str(random.randint(10000, 99999))
                manager.rooms[room_code] = {
                    "players": [client_id],
                    "topic": random.choice(manager.topics),
                    "mode": "custom",
                    "visibility": "public" if message.get("visibility") == "public" else "private",
                    "player_names": {client_id: client_id.rsplit("_", 1)[0]},
                    "levels": {client_id: 1}
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
                    manager.rooms[room_code].setdefault("player_names", {})[client_id] = client_id.rsplit("_", 1)[0]
                    manager.rooms[room_code].setdefault("levels", {})[client_id] = 1
                    
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
            elif msg_type == "spectate_room":
                room_id = message.get("roomId")
                if room_id in manager.rooms and manager.rooms[room_id].get("visibility") == "public":
                    manager.spectators.setdefault(room_id, set()).add(client_id)
                    await manager.send_personal_message(json.dumps({
                        "type": "spectator_joined",
                        "roomId": room_id,
                        "room": public_room_snapshot(room_id, manager.rooms[room_id])
                    }), client_id)
                else:
                    await manager.send_personal_message(json.dumps({
                        "type": "error",
                        "message": "Phòng live không còn tồn tại."
                    }), client_id)
            elif msg_type in ["offer", "answer", "ice-candidate", "transcript_update", "fallacy_detected", "debate_ended", "emoji_react", "player_ready", "player_declined", "control_action", "chat_msg", "chat", "topic_submitted", "end_request", "end_confirm", "debate_result"]:
                target_id = message.get("target")
                if target_id:
                    # Chuyển tiếp tin nhắn
                    # --- CHAT MESSAGES ---
                    if msg_type == "chat":
                        # Lưu tin nhắn vào DB
                        conn = get_db()
                        cursor = conn.cursor()
                        from datetime import datetime, timezone
                        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                        cursor.execute("INSERT INTO chat_messages (sender, target, message, created_at) VALUES (%s, %s, %s, %s)",
                                       (message.get("sender"), target_id, message.get("text"), now_str))
                        conn.commit()
                        conn.close()
                        
                        if target_id == 'global':
                            # Global chat: send to everyone except the sender connection.
                            # The sender already appends the message optimistically.
                            for cid, ws in manager.active_connections.items():
                                if cid == client_id:
                                    continue
                                try:
                                    await ws.send_text(json.dumps(message))
                                except:
                                    pass
                        else:
                            await manager.send_message_to_username(json.dumps(message), target_id)
                    else:
                        await manager.send_personal_message(json.dumps(message), target_id)
                    if msg_type in ["transcript_update", "fallacy_detected", "debate_ended", "emoji_react", "chat_msg"]:
                        room_id = manager.find_room_for_players(client_id, target_id)
                        if room_id:
                            await manager.broadcast_to_spectators(room_id, message)
                    
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

class CommunityPostInput(BaseModel):
    username: str
    content: str

class CommunityCommentInput(BaseModel):
    username: str
    content: str

class HelpRequestInput(BaseModel):
    from_user: str
    to_user: str
    topic: str
    mode: str = "1v1"

class MatchReviewInput(BaseModel):
    reviewer: str
    reviewee: str
    rating: int
    comment: str = ""
    match_id: Optional[int] = None

class JudgeScoreInput(BaseModel):
    judge: str
    target: str
    score_delta: int
    reason: str = ""

class JudgeProtectInput(BaseModel):
    judge: str
    disciple: str
    reason: str = ""

def resolve_public_user_identifier(cursor, identifier: str, viewer: str | None = None):
    """Resolve a public user identifier without exposing usernames for nicknamed users."""
    value = (identifier or "").strip()
    if not value:
        return None
    if viewer and value == viewer:
        return viewer
    cursor.execute("SELECT username FROM users WHERE nickname = %s", (value,))
    row = cursor.fetchone()
    if row:
        return row['username']
    cursor.execute("""
        SELECT username FROM users
        WHERE username = %s AND (nickname IS NULL OR nickname = '')
    """, (value,))
    row = cursor.fetchone()
    return row['username'] if row else None

def get_user_level(cursor, username: str) -> int:
    cursor.execute("SELECT COALESCE(level_real, 1) as level FROM users WHERE username=%s", (username,))
    row = cursor.fetchone()
    return row["level"] if row and row["level"] else 1

def apply_level_delta(cursor, username: str, delta: int):
    if not username or username == "ai_bot" or username.startswith("Guest_") or delta == 0:
        return None
    cursor.execute("""
        UPDATE users
        SET level_real = LEAST(101, GREATEST(1, COALESCE(level_real, 1) + %s))
        WHERE username=%s
        RETURNING level_real
    """, (delta, username))
    row = cursor.fetchone()
    if not row:
        cursor.execute(
            "INSERT INTO users (username, password_hash, level_real) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (username, "clerk_auth", max(1, min(101, 1 + delta)))
        )
        return max(1, min(101, 1 + delta))
    return row["level_real"]

def review_level_bonus(reviewer_level: int, rating: int) -> int:
    if rating < 4:
        return 0
    if reviewer_level >= 101:
        return 3
    if reviewer_level >= 91:
        return 2
    if reviewer_level >= 61:
        return 1
    return 0

class TextAnalyzeInput(BaseModel):
    text: str
    speaker: str
    topic: str

# --- Routes ---

import random

@app.get("/random-topic")
async def get_random_topic():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": True, "topic": random.choice(TRENDING_TOPICS)}

    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                max_output_tokens=50,
                temperature=0.9,
            )
        )
        prompt = "Hãy tạo 1 chủ đề tranh biện siêu thú vị, hài hước hoặc đang cực kỳ viral trên TikTok, Facebook, Reddit, hoặc một đề tập làm văn hài hước phá cách. Chỉ trả về đúng 1 câu ngắn gọn (dưới 15 chữ), không giải thích. Ví dụ: 'Có nên cấm Flexing trên mạng xã hội?' hoặc 'Tại sao Lão Hạc không ăn thịt chó?'"
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
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Check if exists
    cursor.execute("SELECT username FROM users WHERE username = %s", (user.username,))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Tài khoản đã tồn tại"}
        
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user.username, pwd_hash))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Đăng ký thành công"}

@app.post("/login")
def login(user: AuthInput):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    
    cursor.execute("SELECT username FROM users WHERE username = %s AND password_hash = %s", (user.username, pwd_hash))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"success": True, "username": row['username']}
    else:
        return {"success": False, "error": "Sai tài khoản hoặc mật khẩu"}

class NicknameUpdate(BaseModel):
    username: str
    nickname: str

@app.post("/set-nickname")
def set_nickname(data: NicknameUpdate):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT username, nickname FROM users WHERE username = %s", (data.username,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO users (username, password_hash, nickname) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (data.username, "clerk_auth", data.nickname))
    else:
        current_nickname = row['nickname']
        if current_nickname and current_nickname != "":
            cursor.execute("SELECT id FROM user_items WHERE username=%s AND item_id='rename_card'", (data.username,))
            item = cursor.fetchone()
            if not item:
                conn.close()
                return {"success": False, "error": "Bạn cần mua Thẻ Đổi Nickname trong Cửa Hàng để đổi tên!"}
            else:
                cursor.execute("DELETE FROM user_items WHERE id=%s", (item['id'],))
        cursor.execute("UPDATE users SET nickname = %s WHERE username = %s", (data.nickname, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

class PasswordUpdate(BaseModel):
    username: str
    old_password: str
    new_password: str

@app.post("/change-password")
def change_password(data: PasswordUpdate):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    old_hash = hashlib.sha256(data.old_password.encode()).hexdigest()
    cursor.execute("SELECT username FROM users WHERE username = %s AND password_hash = %s", (data.username, old_hash))
    if not cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Mật khẩu cũ không chính xác!"}
    new_hash = hashlib.sha256(data.new_password.encode()).hexdigest()
    cursor.execute("UPDATE users SET password_hash = %s WHERE username = %s", (new_hash, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/nicknames")
def get_nicknames():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT username, nickname FROM users WHERE nickname IS NOT NULL AND nickname != ''")
    rows = cursor.fetchall()
    conn.close()
    return {"success": True, "nicknames": {row['username']: row['nickname'] for row in rows}}

class SaveMatch(BaseModel):
    username: str
    opponent: str
    topic: str
    mode: str
    result: str
    score_self: int
    score_opp: int
    fallacies_self: int
    fallacies_opp: int
    fallacies_list_self: list[str] = []
    fallacies_list_opp: list[str] = []
    summary: str
    transcript_self: str = ""
    transcript_opp: str = ""

@app.post("/save-match")
def save_match(data: SaveMatch):
    """Lưu kết quả trận đấu, cộng điểm và kiểm tra thành tích"""
    from datetime import datetime, timezone
    played_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    fs_self_str = ",".join(data.fallacies_list_self)
    fs_opp_str = ",".join(data.fallacies_list_opp)
    
    cursor.execute("""
        INSERT INTO match_history
            (username, opponent, topic, mode, result,
             score_self, score_opp, fallacies_self, fallacies_opp, 
             fallacies_list_self, fallacies_list_opp, summary, played_at,
             transcript_self, transcript_opp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        data.username, data.opponent, data.topic, data.mode, data.result,
        data.score_self, data.score_opp,
        data.fallacies_self, data.fallacies_opp,
        fs_self_str, fs_opp_str,
        data.summary, played_at,
        data.transcript_self, data.transcript_opp
    ))
    match_id = cursor.fetchone()['id']
    
    # Phân biệt điểm theo loại: Video/Solo win=5, Chat win=3; Video draw=1, Chat draw=0
    is_chat = data.mode.startswith('text_')
    if data.result == 'win':
        pts = 3 if is_chat else 5
        cursor.execute("UPDATE users SET store_points = COALESCE(store_points,0) + %s WHERE username = %s", (pts, data.username))
    elif data.result == 'draw' and not is_chat:
        cursor.execute("UPDATE users SET store_points = COALESCE(store_points,0) + 1 WHERE username = %s", (data.username,))
        
    # Tăng số trận đấu giữa 2 bạn bè
    cursor.execute("""
        UPDATE friends SET debate_count = COALESCE(debate_count,0) + 1
        WHERE (user1=%s AND user2=%s) OR (user1=%s AND user2=%s)
        RETURNING debate_count
    """, (data.username, data.opponent, data.opponent, data.username))
    f_row = cursor.fetchone()
    
    if f_row and f_row['debate_count'] == 50:
        for u in [data.username, data.opponent]:
            cursor.execute("SELECT id FROM user_items WHERE username=%s AND item_id='title_banthan'", (u,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO user_items (username, item_id, item_type, obtained_at) VALUES (%s, 'title_banthan', 'badge', %s)", (u, played_at))
                cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, 'system', 'Chúc mừng! Bạn đã nhận được danh hiệu Bạn Thân Tri Kỷ!', %s)", (u, played_at))

    # Cập nhật số trận Mentorship và tự động xuất sư
    cursor.execute("""
        UPDATE mentorship SET debate_count = COALESCE(debate_count,0) + 1 
        WHERE ((master=%s AND disciple=%s) OR (master=%s AND disciple=%s)) AND is_graduated=FALSE
        RETURNING id, debate_count, master, disciple
    """, (data.username, data.opponent, data.opponent, data.username))
    m_row = cursor.fetchone()
    if m_row and m_row['debate_count'] >= 20:
        cursor.execute("UPDATE mentorship SET is_graduated=TRUE, graduated_date=%s WHERE id=%s", (played_at, m_row['id']))
        for u in [m_row['master'], m_row['disciple']]:
            cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, 'system', 'Chúc mừng! Hai thầy trò đã sát cánh 20 trận, đệ tử chính thức Xuất Sư!', %s)", (u, played_at))

    # --- TÍNH TOÁN LEVEL PHỨC TẠP ---
    cursor.execute("SELECT level_real, consecutive_losses FROM users WHERE username=%s", (data.username,))
    user_data = cursor.fetchone()
    current_level = user_data['level_real'] if user_data and user_data['level_real'] else 1
    consecutive_losses = user_data['consecutive_losses'] if user_data and user_data['consecutive_losses'] else 0

    if data.result == 'lose':
        consecutive_losses += 1
    else:
        consecutive_losses = 0

    cursor.execute("SELECT MAX(score_self) as max_score FROM match_history WHERE username=%s AND played_at < %s", (data.username, played_at))
    max_score = cursor.fetchone()['max_score'] or 0

    cursor.execute("SELECT score_self FROM match_history WHERE username=%s AND played_at < %s ORDER BY id DESC LIMIT 1", (data.username, played_at))
    prev_row = cursor.fetchone()
    prev_score = prev_row['score_self'] if prev_row else 0
    
    cursor.execute("SELECT COUNT(DISTINCT event_id) as event_count FROM event_participants WHERE username=%s", (data.username,))
    event_count = cursor.fetchone()['event_count'] or 0

    new_level = current_level

    # Phân cấp:
    if current_level < 10:
        if data.score_self > max_score or data.result == 'win':
            new_level += 1
    elif current_level < 30:
        if data.score_self >= prev_score + 2 and data.result == 'win':
            new_level += 1
    elif current_level < 60:
        if data.score_self > prev_score and event_count >= 1:
            new_level += 1
    elif current_level < 90:
        if consecutive_losses >= 3:
            new_level = max(60, new_level - 1)
        elif data.score_self > prev_score and event_count >= 2:
            new_level += 1
    elif current_level < 100:
        if data.result == 'lose':
            new_level = max(90, new_level - 1)
        elif data.result == 'win' and event_count >= 3:
            new_level += 1

    new_level = min(101, max(1, new_level))
    cursor.execute("UPDATE users SET level_real=%s, consecutive_losses=%s WHERE username=%s", (new_level, consecutive_losses, data.username))
    
    # --- KIỂM TRA THÀNH TÍCH (ACHIEVEMENTS) ---
    # 1. First Win
    if data.result == 'win':
        cursor.execute("SELECT COUNT(id) as win_count FROM match_history WHERE username=%s AND result='win'", (data.username,))
        win_count = cursor.fetchone()['win_count']
        if win_count == 1:
            cursor.execute("INSERT INTO user_achievements (username, achievement_id, unlocked_at) VALUES (%s, 'first_win', %s) ON CONFLICT DO NOTHING", (data.username, played_at))
        elif win_count == 10:
            cursor.execute("INSERT INTO user_achievements (username, achievement_id, unlocked_at) VALUES (%s, 'win_10', %s) ON CONFLICT DO NOTHING", (data.username, played_at))
            
    # 2. Hoàn mỹ (Không có ngụy biện)
    if data.fallacies_self == 0:
        cursor.execute("INSERT INTO user_achievements (username, achievement_id, unlocked_at) VALUES (%s, 'perfect_logic', %s) ON CONFLICT DO NOTHING", (data.username, played_at))
        
    # 3. 100 Điểm
    if data.score_self >= 100:
        cursor.execute("INSERT INTO user_achievements (username, achievement_id, unlocked_at) VALUES (%s, 'perfect_score', %s) ON CONFLICT DO NOTHING", (data.username, played_at))
        
    conn.commit()
    conn.close()
    return {"success": True, "match_id": match_id, "level": new_level}

class PurchaseRequest(BaseModel):
    username: str
    item_id: str
    price: int

@app.post("/purchase")
def purchase_item(data: PurchaseRequest):
    """Mua vật phẩm bằng Điểm Tích Lũy"""
    from datetime import datetime, timezone
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    # Check if already owned
    cursor.execute("SELECT id FROM user_items WHERE username=%s AND item_id=%s", (data.username, data.item_id))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Bạn đã sở hữu vật phẩm này rồi!"}
    # Check balance (backend store_points + we trust frontend for localStorage points)
    cursor.execute("SELECT store_points FROM users WHERE username=%s", (data.username,))
    row = cursor.fetchone()
    current_points = row['store_points'] if row and row['store_points'] else 0
    if current_points < data.price:
        conn.close()
        return {"success": False, "error": f"Không đủ điểm! Cần {data.price}, hiện có {current_points}."}
    cursor.execute("UPDATE users SET store_points = store_points - %s WHERE username=%s", (data.price, data.username))
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("INSERT INTO user_items (username, item_id, purchased_at) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (data.username, data.item_id, now))
    conn.commit()
    conn.close()
    return {"success": True, "remaining_points": current_points - data.price}

@app.get("/my-info/{username}")
def get_my_info(username: str):
    """Lấy thông tin profile đầy đủ của user"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Lấy thông tin user (points, avatar, frame, level, streak)
    cursor.execute("SELECT store_points, avatar, frame, level_real, checkin_streak FROM users WHERE username=%s", (username,))
    user_row = cursor.fetchone()
    store_points = user_row['store_points'] if user_row and user_row['store_points'] else 0
    avatar = user_row['avatar'] if user_row and user_row['avatar'] else ''
    frame = user_row['frame'] if user_row and user_row['frame'] else 'none'
    level_real = user_row['level_real'] if user_row and user_row['level_real'] else 1
    checkin_streak = user_row['checkin_streak'] if user_row and user_row['checkin_streak'] else 0
    
    # Lấy items
    cursor.execute("SELECT item_id FROM user_items WHERE username=%s", (username,))
    items = [r['item_id'] for r in cursor.fetchall()]
    
    # Lấy achievements
    cursor.execute("SELECT achievement_id FROM user_achievements WHERE username=%s", (username,))
    achievements = [r['achievement_id'] for r in cursor.fetchall()]
    
    # Lấy số thông báo chưa đọc
    cursor.execute("SELECT COUNT(id) as unread FROM notifications WHERE username=%s AND is_read=FALSE", (username,))
    unread = cursor.fetchone()['unread']
    
    conn.close()
    return {
        "success": True, 
        "store_points": store_points, 
        "avatar": avatar,
        "frame": frame,
        "items": items,
        "achievements": achievements,
        "unread_notifications": unread,
        "level_real": level_real,
        "checkin_streak": checkin_streak
    }

class CheckinRequest(BaseModel):
    username: str

@app.post("/checkin")
def server_checkin(data: CheckinRequest):
    """Server-side check-in: cộng 50 điểm vào store_points"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("UPDATE users SET store_points = COALESCE(store_points,0) + 50 WHERE username=%s", (data.username,))
    if cursor.rowcount == 0:
        cursor.execute("INSERT INTO users (username, password_hash, store_points) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (data.username, 'clerk_auth', 50))
    conn.commit()
    cursor.execute("SELECT store_points FROM users WHERE username=%s", (data.username,))
    row = cursor.fetchone()
    conn.close()
    return {"success": True, "store_points": row['store_points'] if row else 50}

class PenaltyRequest(BaseModel):
    username: str

@app.post("/deduct-penalty")
def deduct_penalty(data: PenaltyRequest):
    """Trừ 1 điểm tích lũy khi không bấm Sẵn Sàng đúng hạn"""
    if data.username == 'guest':
        return {"success": True}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET store_points = GREATEST(0, COALESCE(store_points,0) - 1) WHERE username=%s", (data.username,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/events")
def get_events():
    """Lấy danh sách sự kiện theo trạng thái. Event lớn bị khóa nếu event nhỏ chưa kết thúc."""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cursor.execute("SELECT COUNT(*) as count FROM events WHERE event_type = 'small' AND status IN ('open', 'upcoming')")
    active_small = cursor.fetchone()['count'] > 0
    
    cursor.execute("SELECT * FROM events ORDER BY event_type DESC, status ASC")
    rows = list(cursor.fetchall())
    
    for r in rows:
        if r['event_type'] == 'large' and active_small:
            r['status'] = 'locked'
            
    conn.close()
    return {"success": True, "events": rows}

class EventToggle(BaseModel):
    event_id: int
    status: str  # 'open' | 'upcoming' | 'locked'

@app.post("/admin/event-toggle")
def admin_toggle_event(data: EventToggle):
    """Admin toggle trạng thái sự kiện"""
    if data.status not in ['open', 'upcoming', 'locked']:
        return {"success": False, "error": "Invalid status"}
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("UPDATE events SET status=%s WHERE id=%s", (data.status, data.event_id))
    conn.commit()
    conn.close()
    return {"success": True}

class JoinEventRequest(BaseModel):
    username: str
    event_id: int

@app.post("/join-event")
def join_event(data: JoinEventRequest):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    
    # Check if event is open
    cursor.execute("SELECT status FROM events WHERE id=%s", (data.event_id,))
    event = cursor.fetchone()
    if not event or event['status'] != 'open':
        conn.close()
        return {"success": False, "error": "Sự kiện không tồn tại hoặc chưa mở."}
        
    try:
        cursor.execute("INSERT INTO event_participants (event_id, username, joined_at) VALUES (%s, %s, %s)", (data.event_id, data.username, now))
        conn.commit()
        success = True
        error = ""
    except Exception as e:
        conn.rollback()
        success = False
        error = "Bạn đã tham gia sự kiện này rồi."
    finally:
        conn.close()
    
    if success:
        return {"success": True}
    else:
        return {"success": False, "error": error}

@app.get("/my-events/{username}")
def get_my_events(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT event_id FROM event_participants WHERE username=%s", (username,))
    rows = cursor.fetchall()
    conn.close()
    return {"success": True, "events": [row['event_id'] for row in rows]}

class EventSubmission(BaseModel):
    username: str
    event_id: int
    content: str

@app.post("/submit-event")
def submit_event(data: EventSubmission):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE event_participants SET submission_text = %s WHERE username = %s AND event_id = %s", (data.content, data.username, data.event_id))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/event-submission/{event_id}/{username}")
def get_event_submission(event_id: int, username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT submission_text FROM event_participants WHERE username = %s AND event_id = %s", (username, event_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"success": True, "content": row['submission_text'] or ""}
    return {"success": False, "error": "Not found"}

@app.get("/event-submissions-list/{event_id}")
def get_event_submissions_list(event_id: int):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT ep.id as participant_id, ep.username, ep.submission_text,
               (SELECT COUNT(*) FROM submission_votes sv WHERE sv.participant_id = ep.id) as votes
        FROM event_participants ep
        WHERE ep.event_id = %s AND ep.submission_text IS NOT NULL AND ep.submission_text != ''
        ORDER BY votes DESC, ep.joined_at DESC
    """, (event_id,))
    rows = list(cursor.fetchall())
    conn.close()
    return {"success": True, "submissions": rows}

class VoteSubmission(BaseModel):
    participant_id: int
    voter_username: str

@app.post("/vote-submission")
def vote_submission(data: VoteSubmission):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Check daily limit
        cursor.execute("SELECT COUNT(*) as count FROM submission_votes WHERE username = %s AND DATE(voted_at) = CURRENT_DATE", (data.voter_username,))
        today_votes = cursor.fetchone()['count']
        if today_votes >= 10:
            return {"success": False, "error": "Bạn đã hết 10 lượt vote trong ngày hôm nay."}
        
        # Ensure not voting for self
        cursor.execute("SELECT username FROM event_participants WHERE id = %s", (data.participant_id,))
        participant = cursor.fetchone()
        if participant and participant['username'] == data.voter_username:
            return {"success": False, "error": "Bạn không thể tự vote cho chính mình."}

        # Check if already voted
        cursor.execute("SELECT COUNT(*) as count FROM submission_votes WHERE username = %s AND participant_id = %s", (data.voter_username, data.participant_id))
        if cursor.fetchone()['count'] > 0:
            return {"success": False, "error": "Bạn đã vote cho bài viết này rồi."}
            
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("INSERT INTO submission_votes (participant_id, username, voted_at) VALUES (%s, %s, %s)", (data.participant_id, data.voter_username, now))
        conn.commit()
        return {"success": True, "remaining_votes": 9 - today_votes}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@app.get("/history/{username}")
def get_history(username: str, limit: int = 20):
    """Lấy lịch sử trận đấu của user"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, opponent, topic, mode, result,
               score_self, score_opp, fallacies_self, fallacies_opp,
               summary, played_at, transcript_self, transcript_opp, visibility
        FROM match_history
        WHERE username = %s
        ORDER BY played_at DESC
        LIMIT %s
    """, (username, limit))
    rows = list(cursor.fetchall())
    conn.close()
    return {"success": True, "history": rows}

@app.get("/leaderboard")
def get_leaderboard(limit: int = 10):
    """Lấy bảng xếp hạng công bằng: Ưu tiên Thắng, sau đó là Hiệu năng trận đấu thực tế"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
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
        HAVING COUNT(id) > 0
        ORDER BY wins DESC, avg_score DESC
        LIMIT %s
    """, (limit,))
    rows = list(cursor.fetchall())
    conn.close()
    
    # Fix giá trị null nếu user chưa có trận nào có điểm > 0
    for row in rows:
        if row['avg_score'] is None:
            row['avg_score'] = 0
            
    return {"success": True, "leaderboard": rows}

# --- FRIENDS SYSTEM ---
@app.get("/friends/{username}")
def get_friends(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    # Lấy danh sách bạn bè kèm debate_count
    cursor.execute("""
        SELECT CASE WHEN user1=%s THEN user2 ELSE user1 END as friend,
               COALESCE(debate_count, 0) as debate_count
        FROM friends WHERE user1=%s OR user2=%s
    """, (username, username, username))
    friends = [{"username": row['friend'], "debate_count": row['debate_count']} for row in cursor.fetchall()]
    
    # Lấy lời mời kết bạn (những người gửi cho username)
    cursor.execute("SELECT sender FROM friend_requests WHERE receiver = %s", (username,))
    requests = [row['sender'] for row in cursor.fetchall()]
    conn.close()
    
    return {"success": True, "friends": friends, "requests": requests}


@app.post("/friend-request")
def send_friend_request(data: FriendAction):
    target_username = (data.target or "").strip()
    if data.user == target_username:
        return {"success": False, "error": "Không thể tự kết bạn"}
        
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Kiểm tra target có tồn tại không
    target_username = resolve_public_user_identifier(cursor, target_username, data.user)
    if not target_username:
        conn.close()
        return {"success": False, "error": "Người chơi không tồn tại"}
        
    # Check giới hạn 100 bạn bè
    if data.user == target_username:
        conn.close()
        return {"success": False, "error": "Không thể tự kết bạn"}

    cursor.execute("SELECT COUNT(id) as count FROM friends WHERE user1 = %s OR user2 = %s", (data.user, data.user))
    if cursor.fetchone()['count'] >= 100:
        conn.close()
        return {"success": False, "error": "Bạn đã đạt giới hạn tối đa 100 bạn bè."}
        
    cursor.execute("SELECT COUNT(id) as count FROM friends WHERE user1 = %s OR user2 = %s", (target_username, target_username))
    if cursor.fetchone()['count'] >= 100:
        conn.close()
        return {"success": False, "error": "Người này đã đạt giới hạn tối đa 100 bạn bè."}
        
    # Kiểm tra đã là bạn chưa
    cursor.execute("""
        SELECT id FROM friends 
        WHERE (user1 = %s AND user2 = %s) OR (user1 = %s AND user2 = %s)
    """, (data.user, target_username, target_username, data.user))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Đã là bạn bè"}
        
    try:
        cursor.execute("INSERT INTO friend_requests (sender, receiver) VALUES (%s, %s) ON CONFLICT (sender, receiver) DO NOTHING", (data.user, target_username))
        conn.commit()
    except Exception as e:
        print("Lỗi gửi lời mời:", e)
        conn.rollback()
    conn.close()
    return {"success": True}

@app.post("/accept-friend")
def accept_friend(data: FriendAction):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Check giới hạn 100 bạn bè
    cursor.execute("SELECT COUNT(id) as count FROM friends WHERE user1 = %s OR user2 = %s", (data.user, data.user))
    if cursor.fetchone()['count'] >= 100:
        conn.close()
        return {"success": False, "error": "Bạn đã đạt giới hạn tối đa 100 bạn bè."}
        
    cursor.execute("DELETE FROM friend_requests WHERE sender = %s AND receiver = %s", (data.target, data.user))
    try:
        cursor.execute("INSERT INTO friends (user1, user2) VALUES (%s, %s) ON CONFLICT (user1, user2) DO NOTHING", (data.user, data.target))
        conn.commit()
    except Exception as e:
        print("Lỗi kết bạn:", e)
        conn.rollback()
    conn.close()
    return {"success": True}

@app.post("/decline-friend")
def decline_friend(data: FriendAction):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("DELETE FROM friend_requests WHERE sender = %s AND receiver = %s", (data.target, data.user))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/remove-friend")
def remove_friend(data: FriendAction):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        DELETE FROM friends 
        WHERE (user1 = %s AND user2 = %s) OR (user1 = %s AND user2 = %s)
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

@app.post("/analyze-text")
async def analyze_text(input: TextAnalyzeInput):
    """Phân tích ngụy biện và gian lận (AI generated) cho chế độ gõ văn bản"""
    if len(input.text.strip()) < 10:
        return {"fallacy": None, "is_fallacy": False, "is_ai": False, "score_deduct": 0, "message": ""}
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Chưa config GEMINI_API_KEY", "is_fallacy": False, "is_ai": False}
        
    try:
        gemini = genai.GenerativeModel(
            "gemini-3.1-flash-lite-preview",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                max_output_tokens=200,
                temperature=0.1,
            )
        )
        prompt = f"""Phân tích câu nói sau trong cuộc tranh biện về chủ đề "{input.topic}".
        Câu nói: "{input.text}"
        Hãy đánh giá:
        1. Có chứa từ ngữ xúc phạm, chửi thề, thô tục hoặc độc hại không? (is_profanity)
        2. Có hoàn toàn lạc đề, không liên quan gì đến chủ đề tranh biện không? (is_off_topic)
        3. Câu nói có cực kỳ hay, lập luận sắc bén, "tuyệt cú mèo" không? (is_excellent)
        4. Có ngụy biện logic không? (is_fallacy, fallacy_name_vi)
        5. Đoạn văn này có dấu hiệu rõ ràng của việc copy từ AI (như ChatGPT, Gemini) hay không?
        
        Trả về JSON đúng với các khóa (keys) sau:
        {{
            "is_profanity": false,
            "is_off_topic": false,
            "is_excellent": false,
            "is_fallacy": false,
            "fallacy_name_vi": "",
            "fallacy_name_en": "",
            "is_ai_generated": false,
            "ai_reason": ""
        }}
        Lưu ý: Chỉ trả về true/false thực sự dựa trên đánh giá, không copy y nguyên cấu trúc ví dụ."""
        response = await asyncio.to_thread(gemini.generate_content, prompt)
        text = response.text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            res = json.loads(match.group())
            return {
                "fallacy": res.get("fallacy_name_vi") if res.get("is_fallacy") else None,
                "fallacy_en": res.get("fallacy_name_en"),
                "is_fallacy": res.get("is_fallacy", False),
                "is_ai": res.get("is_ai_generated", False),
                "ai_reason": res.get("ai_reason", ""),
                "is_profanity": res.get("is_profanity", False),
                "is_off_topic": res.get("is_off_topic", False),
                "is_excellent": res.get("is_excellent", False),
                "speaker": input.speaker
            }
    except Exception as e:
        print(f"Lỗi phân tích Text: {e}")
        
    return {"is_fallacy": False, "is_ai": False}

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

# --- ACHIEVEMENTS & STATS ---
@app.get("/fallacy-stats/{username}")
def get_fallacy_stats(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT fallacies_list_self FROM match_history WHERE username=%s AND fallacies_list_self != ''", (username,))
    rows = cursor.fetchall()
    conn.close()
    
    stats = {}
    for row in rows:
        fallacies = row['fallacies_list_self'].split(',')
        for f in fallacies:
            f = f.strip()
            if f:
                stats[f] = stats.get(f, 0) + 1
    
    return {"success": True, "stats": stats}

# --- PROFILE & NOTIFICATIONS ---
class UpdateProfile(BaseModel):
    username: str
    avatar: str
    frame: str

@app.post("/update-profile")
def update_profile(data: UpdateProfile):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET avatar=%s, frame=%s WHERE username=%s", (data.avatar, data.frame, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/notifications/{username}")
def get_notifications(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM notifications WHERE username=%s ORDER BY id DESC LIMIT 20", (username,))
    rows = cursor.fetchall()
    conn.close()
    return {"success": True, "notifications": rows}

# --- COMMUNITY FORUM ---
@app.get("/community-posts")
def get_community_posts(limit: int = 30):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("""
            SELECT p.id, p.username, p.content, p.created_at, COALESCE(p.likes, 0) as likes,
                   COALESCE(u.nickname, '') as nickname,
                   COUNT(c.id) as comment_count
            FROM community_posts p
            LEFT JOIN users u ON u.username = p.username
            LEFT JOIN post_comments c ON c.post_id = p.id
            GROUP BY p.id, u.nickname
            ORDER BY p.id DESC
            LIMIT %s
        """, (limit,))
        posts = [dict(row) for row in cursor.fetchall()]
        for post in posts:
            cursor.execute("""
                SELECT c.id, c.post_id, c.username, c.content, c.created_at,
                       COALESCE(u.nickname, '') as nickname
                FROM post_comments c
                LEFT JOIN users u ON u.username = c.username
                WHERE c.post_id=%s
                ORDER BY c.id ASC
                LIMIT 50
            """, (post["id"],))
            post["comments"] = [dict(row) for row in cursor.fetchall()]
        return {"success": True, "posts": posts}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/community-posts")
def create_community_post(data: CommunityPostInput):
    content = data.content.strip()
    if not content:
        return {"success": False, "error": "Nội dung bài viết không được để trống"}
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO community_posts (username, content, created_at, likes)
            VALUES (%s, %s, %s, 0)
            RETURNING id, username, content, created_at, likes
        """, (data.username, content[:1000], now))
        post = dict(cursor.fetchone())
        conn.commit()
        post["comments"] = []
        post["comment_count"] = 0
        return {"success": True, "post": post}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/community-posts/{post_id}/like")
def like_community_post(post_id: int):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("UPDATE community_posts SET likes = COALESCE(likes, 0) + 1 WHERE id=%s RETURNING likes", (post_id,))
        row = cursor.fetchone()
        conn.commit()
        if not row:
            return {"success": False, "error": "Bài viết không tồn tại"}
        return {"success": True, "likes": row["likes"]}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/community-posts/{post_id}/comments")
def create_post_comment(post_id: int, data: CommunityCommentInput):
    content = data.content.strip()
    if not content:
        return {"success": False, "error": "Nội dung bình luận không được để trống"}
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("SELECT id FROM community_posts WHERE id=%s", (post_id,))
        if not cursor.fetchone():
            return {"success": False, "error": "Bài viết không tồn tại"}
        cursor.execute("""
            INSERT INTO post_comments (post_id, username, content, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id, post_id, username, content, created_at
        """, (post_id, data.username, content[:500], now))
        comment = dict(cursor.fetchone())
        conn.commit()
        return {"success": True, "comment": comment}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/live-rooms")
def get_live_rooms():
    rooms = []
    for room_id, room in manager.rooms.items():
        if room.get("visibility") != "public":
            continue
        players = room.get("players", [])
        if len(players) < 2:
            continue
        if not all(pid in manager.active_connections for pid in players):
            continue
        rooms.append(public_room_snapshot(room_id, room))
    rooms.sort(key=lambda r: (not r["isHighLevel"], -max([p["level"] for p in r["players"]] or [1])))
    return {"success": True, "rooms": rooms}

@app.post("/request-help")
async def request_help(data: HelpRequestInput):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("""
            SELECT id FROM friends
            WHERE ((user1=%s AND user2=%s) OR (user1=%s AND user2=%s))
              AND COALESCE(debate_count, 0) >= 50
        """, (data.from_user, data.to_user, data.to_user, data.from_user))
        if not cursor.fetchone():
            return {"success": False, "error": "Chỉ có thể nhờ Bạn thân đã debate cùng ít nhất 50 trận."}
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        text = f"🆘 {data.from_user} cần bạn thân trợ giúp topic: {data.topic}"
        cursor.execute("INSERT INTO chat_messages (sender, target, message, created_at) VALUES (%s, %s, %s, %s)",
                       (data.from_user, data.to_user, text, now))
        cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, %s, %s, %s)",
                       (data.to_user, "help_request", text, now))
        conn.commit()
        await manager.send_message_to_username(json.dumps({
            "type": "chat",
            "target": data.to_user,
            "sender": data.from_user,
            "text": text
        }), data.to_user)
        return {"success": True}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/notifications/read/{notif_id}")
def mark_notification_read(notif_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read=TRUE WHERE id=%s", (notif_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- MATCH REVIEW & LEVEL PRIVILEGES ---
@app.post("/match-review")
def submit_match_review(data: MatchReviewInput):
    if data.reviewer == data.reviewee:
        return {"success": False, "error": "Không thể tự đánh giá chính mình"}
    if data.reviewee == "ai_bot" or data.reviewee.startswith("Guest_"):
        return {"success": False, "error": "Không thể đánh giá tài khoản này"}
    rating = max(1, min(5, data.rating))
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        match_id = data.match_id
        if not match_id:
            cursor.execute("""
                SELECT id FROM match_history
                WHERE (username=%s AND opponent=%s) OR (username=%s AND opponent=%s)
                ORDER BY id DESC
                LIMIT 1
            """, (data.reviewer, data.reviewee, data.reviewee, data.reviewer))
            row = cursor.fetchone()
            if not row:
                return {"success": False, "error": "Không tìm thấy trận đấu để đánh giá"}
            match_id = row["id"]

        reviewer_level = get_user_level(cursor, data.reviewer)
        bonus = review_level_bonus(reviewer_level, rating)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO match_reviews (match_id, reviewer, reviewee, rating, comment, reviewer_level, level_bonus, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (match_id, data.reviewer, data.reviewee, rating, data.comment.strip()[:500], reviewer_level, bonus, now))
        new_level = apply_level_delta(cursor, data.reviewee, bonus) if bonus > 0 else get_user_level(cursor, data.reviewee)
        if bonus > 0:
            cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, %s, %s, %s)",
                           (data.reviewee, "review", f"Đánh giá tốt từ người Lv.{reviewer_level} giúp bạn tăng {bonus} level!", now))
        conn.commit()
        return {"success": True, "level_bonus": bonus, "new_level": new_level}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return {"success": False, "error": "Bạn đã đánh giá người này cho trận đấu này rồi"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/judge/adjust-score")
def judge_adjust_score(data: JudgeScoreInput):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        judge_level = get_user_level(cursor, data.judge)
        if judge_level < 101:
            return {"success": False, "error": "Chỉ Level 101 mới có quyền Giám khảo"}
        delta = max(-10, min(10, data.score_delta))
        cursor.execute("""
            UPDATE match_history
            SET score_self = LEAST(100, GREATEST(0, score_self + %s))
            WHERE id = (
                SELECT id FROM match_history WHERE username=%s ORDER BY id DESC LIMIT 1
            )
            RETURNING id, score_self
        """, (delta, data.target))
        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "Không tìm thấy trận gần nhất của người chơi"}
        level_delta = 1 if delta >= 5 else (-1 if delta <= -5 else 0)
        new_level = apply_level_delta(cursor, data.target, level_delta) if level_delta else get_user_level(cursor, data.target)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO judge_actions (judge, target, action_type, score_delta, level_delta, reason, created_at)
            VALUES (%s, %s, 'adjust_score', %s, %s, %s, %s)
        """, (data.judge, data.target, delta, level_delta, data.reason.strip()[:500], now))
        cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, %s, %s, %s)",
                       (data.target, "judge", f"Giám khảo Lv.101 {data.judge} đã điều chỉnh điểm trận gần nhất của bạn ({delta:+d}).", now))
        conn.commit()
        return {"success": True, "match_id": row["id"], "score": row["score_self"], "level_delta": level_delta, "new_level": new_level}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/judge/protect-disciple")
def judge_protect_disciple(data: JudgeProtectInput):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        judge_level = get_user_level(cursor, data.judge)
        if judge_level < 101:
            return {"success": False, "error": "Chỉ Level 101 mới có quyền bảo kê"}
        cursor.execute("SELECT id FROM mentorship WHERE master=%s AND disciple=%s AND is_graduated=FALSE", (data.judge, data.disciple))
        if not cursor.fetchone():
            return {"success": False, "error": "Người này không phải đệ tử đang theo học của bạn"}
        new_level = apply_level_delta(cursor, data.disciple, 2)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO judge_actions (judge, target, action_type, level_delta, reason, created_at)
            VALUES (%s, %s, 'protect_disciple', 2, %s, %s)
        """, (data.judge, data.disciple, data.reason.strip()[:500], now))
        cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, %s, %s, %s)",
                       (data.disciple, "judge", f"Sư phụ Lv.101 {data.judge} đã bảo kê, giúp bạn tăng 2 level.", now))
        conn.commit()
        return {"success": True, "new_level": new_level}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# --- MENTORSHIP ---
class MentorshipRequest(BaseModel):
    master: str
    disciple: str

@app.post("/mentorship/request")
def request_mentorship(data: MentorshipRequest):
    conn = get_db()
    cursor = conn.cursor()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        cursor.execute("SELECT id FROM mentorship WHERE (master=%s AND disciple=%s) OR (master=%s AND disciple=%s)", (data.master, data.disciple, data.disciple, data.master))
        if cursor.fetchone():
            return {"success": False, "error": "Đã có quan hệ sư đồ!"}
            
        cursor.execute("INSERT INTO mentorship_requests (master, disciple, created_at) VALUES (%s, %s, %s)", (data.master, data.disciple, now))
        # Create notification for master
        cursor.execute("INSERT INTO notifications (username, type, message, created_at) VALUES (%s, %s, %s, %s)",
                       (data.master, "mentorship", f"{data.disciple} muốn bái bạn làm sư phụ!", now))
        conn.commit()
        success = True
        error = ""
    except Exception as e:
        conn.rollback()
        success = False
        error = "Đã gửi yêu cầu bái sư trước đó hoặc có lỗi."
    finally:
        conn.close()
        
    return {"success": success, "error": error}

@app.post("/mentorship/accept")
def accept_mentorship(data: MentorshipRequest):
    conn = get_db()
    cursor = conn.cursor()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    try:
        cursor.execute("DELETE FROM mentorship_requests WHERE master=%s AND disciple=%s", (data.master, data.disciple))
        cursor.execute("INSERT INTO mentorship (master, disciple, start_date) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (data.master, data.disciple, now))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()
    return {"success": True}

@app.post("/mentorship/decline")
def decline_mentorship(data: MentorshipRequest):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM mentorship_requests WHERE master=%s AND disciple=%s", (data.master, data.disciple))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()
    return {"success": True}

@app.get("/mentorship/{username}")
def get_mentorship(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    # Check if they are a master
    cursor.execute("SELECT * FROM mentorship WHERE master=%s", (username,))
    disciples = cursor.fetchall()
    # Check if they are a disciple
    cursor.execute("SELECT * FROM mentorship WHERE disciple=%s", (username,))
    masters = cursor.fetchall()
    # Check requests
    cursor.execute("SELECT disciple FROM mentorship_requests WHERE master=%s", (username,))
    requests = [r['disciple'] for r in cursor.fetchall()]
    conn.close()
    return {"success": True, "disciples": disciples, "masters": masters, "requests": requests}

# --- SERVER ANNOUNCEMENTS ---
@app.get("/server-announcements")
def get_server_announcements():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Top player by level
        cursor.execute("SELECT username, level FROM users ORDER BY level DESC, exp DESC LIMIT 1")
        top = cursor.fetchone()
        # Recent match
        cursor.execute("SELECT winner, loser, created_at FROM match_history ORDER BY id DESC LIMIT 1")
        recent = cursor.fetchone()
        # Total users
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        total_users = cursor.fetchone()['cnt']
        # Total matches
        cursor.execute("SELECT COUNT(*) as cnt FROM match_history")
        total_matches = cursor.fetchone()['cnt']

        announcements = [
            f"🌟 KaiKo Arena - Nơi tranh biện huyền thoại! Hiện có {total_users} võ sĩ đang hành đạo",
            f"⚔️ Tổng số trận đấu toàn server: {total_matches} trận - Chiến trường chưa bao giờ sôi động đến vậy!",
        ]
        if top:
            announcements.append(f"👑 Đại Cao Thủ đang dẫn đầu bảng xếp hạng: [{top['username']}] - Cấp {top['level']}")
        if recent:
            announcements.append(f"🥊 Trận vừa kết thúc: {recent['winner']} đánh bại {recent['loser']} - Huyết chiến vừa tàn!")
        announcements += [
            "🎓 Hệ thống Sư Đồ đã mở! Bái sư để nâng cao tu vi của bạn ngay hôm nay",
            "🦀 Huy hiệu 'Cua Hoàng Đế' đang chờ những tranh biện viên xuất sắc nhất",
            "🔥 Tính năng Chat Cộng Đồng mới ra mắt - Kết nối với các đạo hữu ngay bây giờ!",
        ]
        return {"success": True, "announcements": announcements}
    except Exception as e:
        return {"success": True, "announcements": ["🌟 Chào mừng đến với KaiKo Arena - Sân đấu tranh biện huyền thoại!"]}
    finally:
        conn.close()

# --- CHAT MESSAGES ---
@app.get("/chat-messages/{target}")
def get_chat_messages(target: str, username: str = None):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if target == 'global':
            cursor.execute("SELECT sender, message as text, created_at as timestamp FROM chat_messages WHERE target='global' ORDER BY id DESC LIMIT 100")
            msgs = list(reversed(cursor.fetchall()))
        else:
            if not username:
                return {"success": False, "error": "Missing username"}
            cursor.execute(
                "SELECT sender, message as text, created_at as timestamp FROM chat_messages WHERE (sender=%s AND target=%s) OR (sender=%s AND target=%s) ORDER BY id ASC LIMIT 100",
                (username, target, target, username)
            )
            msgs = cursor.fetchall()
        return {"success": True, "messages": [dict(m) for m in msgs]}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# --- FRIENDS LAST MESSAGES ---
@app.get("/chat-friends-preview/{username}")
def get_friends_chat_preview(username: str):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("SELECT user1, user2 FROM friends WHERE user1=%s OR user2=%s", (username, username))
        friends_rows = cursor.fetchall()
        result = []
        for row in friends_rows:
            friend = row['user2'] if row['user1'] == username else row['user1']
            cursor.execute(
                "SELECT sender, message as text, created_at as timestamp FROM chat_messages WHERE (sender=%s AND target=%s) OR (sender=%s AND target=%s) ORDER BY id DESC LIMIT 1",
                (username, friend, friend, username)
            )
            last_msg = cursor.fetchone()
            result.append({"friend": friend, "lastMessage": dict(last_msg) if last_msg else None})
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
