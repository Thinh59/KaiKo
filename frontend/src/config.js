// Centralized API config.
// Local dev defaults to localhost:8000. In production (Vercel) set VITE_API_BASE
// to your Railway backend URL, e.g. https://kaiko-backend.up.railway.app
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// WebSocket base derived from API_BASE (http -> ws, https -> wss)
export const WS_BASE = API_BASE.replace(/^http/, 'ws')
