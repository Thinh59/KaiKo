import { useRef, useState, useEffect, useCallback } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] }
  ]
}

export function useWebRTC({ roomId, isHost, opponentId, sendMessage, registerHandler }) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)

  const [connected, setConnected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [error, setError] = useState(null)

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
      
      if (!roomId || !opponentId || !sendMessage) return // Allow camera to turn on but don't start WebRTC

      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      pc.ontrack = event => {
        setRemoteStream(event.streams[0])
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
        setConnected(true)
      }

      pc.onicecandidate = event => {
        if (event.candidate) {
          sendMessage({
            type: 'ice-candidate',
            target: opponentId,
            candidate: event.candidate
          })
        }
      }

      // Đăng ký nhận tín hiệu
      if (registerHandler) {
        registerHandler('offer', async (data) => {
          if (!pcRef.current) return
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer))
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)
          sendMessage({
            type: 'answer',
            target: opponentId,
            answer: answer
          })
        })

        registerHandler('answer', async (data) => {
          if (!pcRef.current) return
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        })

        registerHandler('ice-candidate', async (data) => {
          if (!pcRef.current) return
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          } catch (e) {
            console.error('Error adding received ice candidate', e)
          }
        })
      }

      // Host tạo offer
      if (isHost) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendMessage({
          type: 'offer',
          target: opponentId,
          offer: offer
        })
      }

    } catch (err) {
      setError(err.message)
      console.error('Lỗi khởi tạo WebRTC:', err)
    }
  }, [roomId, isHost, opponentId, sendMessage, registerHandler, startLocalStream])

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
        const videoTrack = stream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        } else {
          localStreamRef.current = stream;
          setLocalStream(stream);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }
        
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pcRef.current.addTrack(videoTrack, localStreamRef.current);
          }
        }
        setIsCameraOn(true);
      } catch (err) {
        console.error("Lỗi bật lại camera:", err);
      }
    }
  }, [isCameraOn]);

  const toggleMic = useCallback(async () => {
    if (isMicOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
      }
      setIsMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = stream.getAudioTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(audioTrack);
        } else {
          localStreamRef.current = stream;
          setLocalStream(stream);
        }
        
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          } else {
            pcRef.current.addTrack(audioTrack, localStreamRef.current);
          }
        }
        setIsMicOn(true);
      } catch (err) {
        console.error("Lỗi bật lại mic:", err);
      }
    }
  }, [isMicOn]);

  const stopAllMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnected(false);
    setRemoteStream(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAllMedia();
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
