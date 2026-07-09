// Centralized API config.
// Local dev defaults to localhost:8000. In production (Vercel) set VITE_API_BASE
// to your Railway backend URL, e.g. https://kaiko-backend.up.railway.app
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// WebSocket base derived from API_BASE (http -> ws, https -> wss)
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

// ── WebRTC ICE servers ──────────────────────────────────────────────────────
// STUN: giúp mỗi máy tìm địa chỉ public của mình.
// TURN: relay media khi 2 peer ở sau NAT/tường lửa khác nhau (mạng 4G, wifi
//       trường/công ty…). KHÔNG có TURN thì 2 người KHÁC MẠNG sẽ không thấy/
//       nghe được nhau (màn đen, không có tiếng) — đây là lỗi phổ biến nhất.
//
// Cấu hình TURN riêng (KHUYẾN NGHỊ cho production) qua biến môi trường Vercel:
//   VITE_TURN_URL         ví dụ: turn:global.relay.metered.ca:80  (nhiều URL cách nhau bằng dấu phẩy)
//   VITE_TURN_USERNAME
//   VITE_TURN_CREDENTIAL
// Lấy free tại https://www.metered.ca/tools/openrelay/ (đăng ký 2 phút, 50GB/tháng).
const iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

const turnUrl = import.meta.env.VITE_TURN_URL
if (turnUrl) {
  iceServers.push({
    urls: turnUrl.split(',').map(s => s.trim()).filter(Boolean),
    username: import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
  })
}

export const ICE_SERVERS = { iceServers }
// true nếu đã cấu hình TURN — dùng để cảnh báo trên UI khi chưa có
export const HAS_TURN = !!turnUrl
