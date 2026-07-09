import { useRef, useState, useEffect, useCallback } from 'react'

// STUN để tìm địa chỉ public, TURN để relay khi 2 peer ở sau NAT đối xứng
// (mạng công ty/trường/4G). Thiếu TURN là nguyên nhân phổ biến nhất khiến
// video đối phương bị đen khi 2 người khác mạng.
// ⚠️ TURN công cộng bên dưới chỉ dùng để dev/demo. Production nên tự dựng
// coturn hoặc dùng dịch vụ TURN có credential riêng.
const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
}

export function useWebRTC({ roomId, isHost, opponentId, sendMessage, registerHandler }) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)

  // Perfect-negotiation state
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  const pendingCandidatesRef = useRef([])   // ICE nhận được trước khi có remoteDescription
  const politeRef = useRef(!isHost)          // guest = polite, host = impolite

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)

  const [connected, setConnected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [error, setError] = useState(null)

  // Chỉ dùng WebRTC khi có đối thủ thật (không phải AI)
  const isPeerRoom = !!(roomId && opponentId && opponentId !== 'ai_bot' && sendMessage)

  useEffect(() => { politeRef.current = !isHost }, [isHost])

  // Đẩy các ICE candidate đang chờ sau khi đã set remoteDescription
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return
    const queued = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c))
      } catch (e) {
        console.error('Lỗi thêm ICE candidate (queued):', e)
      }
    }
  }, [])

  // Tạo RTCPeerConnection (idempotent) + gắn sự kiện
  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current
    if (!isPeerRoom) return null

    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    pc.ontrack = event => {
      const [stream] = event.streams
      if (stream) {
        setRemoteStream(stream)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
      }
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({ type: 'ice-candidate', target: opponentId, candidate: event.candidate })
      }
    }

    // Perfect negotiation: tự tạo offer khi có thay đổi track (thêm/đổi camera…)
    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true
        await pc.setLocalDescription()
        sendMessage({ type: 'offer', target: opponentId, offer: pc.localDescription })
      } catch (err) {
        console.error('Lỗi onnegotiationneeded:', err)
      } finally {
        makingOfferRef.current = false
      }
    }

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState
      setConnected(st === 'connected' || st === 'completed')
      // Thử khôi phục khi mất kết nối tạm thời
      if (st === 'failed') {
        try { pc.restartIce() } catch { /* trình duyệt cũ không hỗ trợ */ }
      }
    }

    return pc
  }, [isPeerRoom, opponentId, sendMessage])

  // Đăng ký các handler tín hiệu NGAY khi vào phòng (không chờ cấp quyền camera)
  // → tránh mất offer khi người kia bấm "Cho phép" trước.
  useEffect(() => {
    if (!isPeerRoom || !registerHandler) return

    ensurePeerConnection()

    const cleanupOffer = registerHandler('offer', async (data) => {
      const pc = ensurePeerConnection()
      if (!pc) return
      try {
        const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable'
        ignoreOfferRef.current = !politeRef.current && offerCollision
        if (ignoreOfferRef.current) return   // impolite peer bỏ qua khi tranh chấp

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        await flushPendingCandidates()
        await pc.setLocalDescription()
        sendMessage({ type: 'answer', target: opponentId, answer: pc.localDescription })
      } catch (err) {
        console.error('Lỗi xử lý offer:', err)
      }
    })

    const cleanupAnswer = registerHandler('answer', async (data) => {
      const pc = pcRef.current
      if (!pc) return
      try {
        // Bỏ qua answer lạc (không có offer đang chờ)
        if (pc.signalingState !== 'have-local-offer') return
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        await flushPendingCandidates()
      } catch (err) {
        console.error('Lỗi xử lý answer:', err)
      }
    })

    const cleanupIce = registerHandler('ice-candidate', async (data) => {
      const pc = pcRef.current
      if (!pc || !data.candidate) return
      // Nếu chưa có remoteDescription thì xếp hàng, tránh mất candidate
      if (!pc.remoteDescription || !pc.remoteDescription.type) {
        pendingCandidatesRef.current.push(data.candidate)
        return
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (err) {
        if (!ignoreOfferRef.current) console.error('Lỗi thêm ICE candidate:', err)
      }
    })

    return () => {
      cleanupOffer && cleanupOffer()
      cleanupAnswer && cleanupAnswer()
      cleanupIce && cleanupIce()
    }
  }, [isPeerRoom, registerHandler, ensurePeerConnection, flushPendingCandidates, opponentId, sendMessage])

  // Lấy camera/mic
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      console.error('Lỗi lấy media:', err)
      setError(err.message)
      throw err
    }
  }, [])

  const initWebRTC = useCallback(async () => {
    try {
      const stream = await startLocalStream()

      if (!isPeerRoom) return // solo/AI: chỉ bật camera, không cần WebRTC

      const pc = ensurePeerConnection()
      if (!pc) return

      // Thêm track local → kích hoạt onnegotiationneeded → tự tạo offer.
      // Perfect negotiation lo phần tranh chấp offer giữa 2 bên.
      stream.getTracks().forEach(track => {
        const already = pc.getSenders().some(s => s.track === track)
        if (!already) pc.addTrack(track, stream)
      })
    } catch (err) {
      setError(err.message)
      console.error('Lỗi khởi tạo WebRTC:', err)
    }
  }, [isPeerRoom, startLocalStream, ensurePeerConnection])

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop()
          localStreamRef.current.removeTrack(t)
        })
      }
      // Giữ sender, chỉ gỡ track → không cần renegotiate
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) sender.replaceTrack(null)
      }
      setIsCameraOn(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
        const videoTrack = stream.getVideoTracks()[0]

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack)
        } else {
          localStreamRef.current = stream
          setLocalStream(stream)
          if (localVideoRef.current) localVideoRef.current.srcObject = stream
        }

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track === null || (s.track && s.track.kind === 'video'))
          if (sender) {
            sender.replaceTrack(videoTrack)   // replaceTrack không cần renegotiate
          } else {
            pcRef.current.addTrack(videoTrack, localStreamRef.current)
          }
        }
        setIsCameraOn(true)
      } catch (err) {
        console.error('Lỗi bật lại camera:', err)
      }
    }
  }, [isCameraOn])

  const toggleMic = useCallback(async () => {
    if (isMicOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.stop()
          localStreamRef.current.removeTrack(t)
        })
      }
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'audio')
        if (sender) sender.replaceTrack(null)
      }
      setIsMicOn(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioTrack = stream.getAudioTracks()[0]

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(audioTrack)
        } else {
          localStreamRef.current = stream
          setLocalStream(stream)
        }

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track === null || (s.track && s.track.kind === 'audio'))
          if (sender) {
            sender.replaceTrack(audioTrack)
          } else {
            pcRef.current.addTrack(audioTrack, localStreamRef.current)
          }
        }
        setIsMicOn(true)
      } catch (err) {
        console.error('Lỗi bật lại mic:', err)
      }
    }
  }, [isMicOn])

  const stopAllMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log(`Stopped track: ${track.kind}`)
      })
      localStreamRef.current = null
      setLocalStream(null)
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    pendingCandidatesRef.current = []
    setConnected(false)
    setRemoteStream(null)
  }, [])

  useEffect(() => {
    return () => {
      stopAllMedia()
    }
  }, [stopAllMedia])

  return {
    localVideoRef,
    remoteVideoRef,
    connected,
    isCameraOn,
    isMicOn,
    error,
    initWebRTC,
    toggleCamera,
    toggleMic,
    stopAllMedia,
    localStream,
    remoteStream
  }
}
