import { useState, useEffect, useRef, useCallback } from 'react'
import { WS_BASE } from '../config'

export function useSignaling(playerName) {
  const [socket, setSocket] = useState(null)
  const [matchInfo, setMatchInfo] = useState(null)
  const [roomError, setRoomError] = useState(null)
  const [createdRoomCode, setCreatedRoomCode] = useState(null)
  const socketRef = useRef(null)
  const onMessageHandlers = useRef({})

  useEffect(() => {
    // Kết nối tới WebSocket server của FastAPI
    const wsUrl = `${WS_BASE}/ws/${playerName}_${Math.floor(Math.random()*10000)}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Đã kết nối WebSocket Signaling')
      setSocket(ws)
      socketRef.current = ws
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'matched') {
        setMatchInfo({
          roomId: data.roomId,
          isHost: data.isHost,
          opponentId: data.opponentId,
          opponentName: data.opponentName || data.opponentId,
          topic: data.topic,
          visibility: data.visibility || 'private',
          format: data.format || 'video'
        })
      } else if (data.type === 'room_created') {
        setCreatedRoomCode(data.roomCode)
      } else if (data.type === 'error') {
        setRoomError(data.message)
      } else {
        // Handle other messages (offer, answer, candidate) via registered handlers
        if (onMessageHandlers.current[data.type]) {
          onMessageHandlers.current[data.type](data)
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket đóng kết nối')
      setSocket(null)
      socketRef.current = null
    }

    return () => {
      ws.close()
    }
  }, [playerName])

  const findMatch = (mode, displayName, level = 1, visibility = 'private') => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setMatchInfo(null)
      setRoomError(null)
      setCreatedRoomCode(null)
      socketRef.current.send(JSON.stringify({
        type: 'find_match',
        mode: mode,
        playerName: displayName || playerName,
        level,
        visibility
      }))
    }
  }

  const createRoom = (visibility = 'private', category = null, format = 'video') => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setRoomError(null)
      socketRef.current.send(JSON.stringify({ type: 'create_room', visibility, category, format }))
    } else {
      setRoomError('Mất kết nối tới máy chủ. Vui lòng tải lại trang và thử lại.')
    }
  }

  const joinRoom = (roomCode) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setRoomError(null)
      socketRef.current.send(JSON.stringify({ type: 'join_room', roomCode }))
    } else {
      setRoomError('Mất kết nối tới máy chủ. Vui lòng tải lại trang và thử lại.')
    }
  }

  const cancelMatch = () => {
    setMatchInfo(null)
    setCreatedRoomCode(null)
    setRoomError(null)
    // Tùy chọn: gửi tín hiệu hủy lên server nếu cần
  }

  const registerHandler = useCallback((type, handler) => {
    onMessageHandlers.current[type] = handler
    return () => {
      if (onMessageHandlers.current[type] === handler) {
        delete onMessageHandlers.current[type]
      }
    }
  }, [])

  const sendMessage = useCallback((msg) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return {
    socket,
    matchInfo,
    roomError,
    createdRoomCode,
    findMatch,
    createRoom,
    joinRoom,
    cancelMatch,
    registerHandler,
    sendMessage
  }
}
