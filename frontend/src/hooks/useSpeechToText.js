import { useState, useRef, useCallback } from 'react'

/**
 * useSpeechToText — cải thiện độ nhạy:
 * - Tích lũy interim results, chỉ gửi khi có đủ nội dung (>= 5 ký tự)
 * - Tự restart sau silence / network error
 * - Gửi text ngay khi isFinal, không đợi kết thúc session
 */
export function useSpeechToText({ onTranscript }) {
  const recognitionRef = useRef(null)
  const shouldListenRef = useRef(false)
  const accumulatedRef = useRef('')      // tích lũy text qua nhiều lần onresult
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText] = useState('')
  const sessionDataRef = useRef(null)

  const start = useCallback((sessionData = null) => {
    sessionDataRef.current = sessionData
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.')
      return
    }

    shouldListenRef.current = true
    accumulatedRef.current = ''

    const createRecognition = () => {
      if (!shouldListenRef.current) return

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.lang = 'vi-VN'
      recognition.continuous = true       // không tự dừng
      recognition.interimResults = true   // hiện chữ đang nói
      recognition.maxAlternatives = 3     // nhiều lựa chọn hơn → chọn cái tốt nhất

      recognition.onresult = (event) => {
        let interimChunk = ''
        let finalChunk = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Chọn alternative có confidence cao nhất
          let bestText = ''
          let bestConf = -1
          for (let j = 0; j < event.results[i].length; j++) {
            if (event.results[i][j].confidence > bestConf) {
              bestConf = event.results[i][j].confidence
              bestText = event.results[i][j].transcript
            }
          }

          if (event.results[i].isFinal) {
            finalChunk += bestText + ' '
          } else {
            interimChunk += bestText
          }
        }

        // Hiển thị live text (interim)
        if (interimChunk) {
          setLiveText(interimChunk)
        }

        // Gửi transcript khi có kết quả final
        if (finalChunk.trim()) {
          accumulatedRef.current += finalChunk
          setLiveText('')

          // Gửi ngay từng câu để phân tích real-time
          const words = finalChunk.trim()
          if (words.length >= 2 && onTranscript) {
            onTranscript(words, sessionDataRef.current)
          }
        }
      }

      recognition.onerror = (event) => {
        console.warn('[STT] Lỗi:', event.error)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Cần cấp quyền Microphone! Vào Settings → Privacy → Microphone.')
          shouldListenRef.current = false
          setIsListening(false)
          return
        }
        // Với no-speech, network → onend sẽ tự restart
      }

      recognition.onend = () => {
        if (shouldListenRef.current) {
          // Restart sau 100ms để không bỏ lỡ giọng nói
          setTimeout(() => {
            if (shouldListenRef.current) createRecognition()
          }, 100)
        } else {
          setIsListening(false)
          setLiveText('')
        }
      }

      try {
        recognition.start()
        setIsListening(true)
      } catch (e) {
        // "already started" — ignore, onend sẽ xử lý
        console.warn('[STT] start error:', e.message)
      }
    }

    createRecognition()
  }, [onTranscript])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    setIsListening(false)
    setLiveText('')
    accumulatedRef.current = ''
  }, [])

  return { isListening, liveText, start, stop }
}
