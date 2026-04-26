import { useState, useEffect, useRef, useCallback } from 'react'

export function useSignaling(playerName) {
  const [socket, setSocket] = useState(null)
  const [matchInfo, setMatchInfo] = useState(null)
  const socketRef = useRef(null)
  const onMessageHandlers = useRef({})

  useEffect(() => {
    // Kết nối tới WebSocket server của FastAPI
    const wsUrl = `ws://localhost:8000/ws/${playerName}_${Math.floor(Math.random()*10000)}`
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
          topic: data.topic
        })
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

  const findMatch = (mode) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setMatchInfo(null)
      socketRef.current.send(JSON.stringify({
        type: 'find_match',
        mode: mode,
        playerName: playerName
      }))
    }
  }

  const cancelMatch = () => {
    setMatchInfo(null)
    // Tùy chọn: gửi tín hiệu hủy lên server nếu cần
  }

  const registerHandler = useCallback((type, handler) => {
    onMessageHandlers.current[type] = handler
  }, [])

  const sendMessage = useCallback((msg) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return {
    socket,
    matchInfo,
    findMatch,
    cancelMatch,
    registerHandler,
    sendMessage
  }
}
