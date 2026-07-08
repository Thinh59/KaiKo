import { useEffect, useRef, useState, useCallback } from 'react'

// Phân tích cử chỉ / ngôn ngữ cơ thể trong lúc tranh biện VIDEO bằng MediaPipe FaceLandmarker.
// Đo 3 chỉ số trên khuôn mặt người chơi (camera local):
//   - Giao tiếp bằng mắt (eyeContact): tỉ lệ thời gian nhìn thẳng vào camera (head pose gần chính diện)
//   - Hiện diện (presence): tỉ lệ thời gian có mặt trong khung hình
//   - Biểu cảm (expressiveness): mức độ biểu cảm khuôn mặt (cười, mở miệng, nhướng mày...)
// -> gộp thành điểm cử chỉ 0..100, dùng để chấm mục "Phong thái" ở chế độ video.
//
// Model + WASM tải từ CDN (cần Internet). Nếu tải lỗi -> ready=false, degrade an toàn.

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const EMPTY = { eyeContact: 0, presence: 0, expressiveness: 0, score: 0 }

export function useGestureAnalysis({ videoRef, active }) {
  const [ready, setReady] = useState(false)
  const [metrics, setMetrics] = useState(EMPTY)

  const landmarkerRef = useRef(null)
  const rafRef = useRef(null)
  const lastVideoTime = useRef(-1)
  const lastUi = useRef(0)
  const acc = useRef({ samples: 0, faceFrames: 0, facingFrames: 0, exprSum: 0 })

  // Nạp model 1 lần
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        })
        if (cancelled) {
          landmarker.close?.()
          return
        }
        landmarkerRef.current = landmarker
        setReady(true)
      } catch (e) {
        console.warn('[useGestureAnalysis] Không tải được MediaPipe FaceLandmarker:', e)
        setReady(false)
      }
    })()
    return () => {
      cancelled = true
      try {
        landmarkerRef.current?.close?.()
      } catch {
        /* noop */
      }
      landmarkerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    acc.current = { samples: 0, faceFrames: 0, facingFrames: 0, exprSum: 0 }
    setMetrics(EMPTY)
  }, [])

  const getReport = useCallback(() => {
    const a = acc.current
    if (a.samples === 0) return null
    const presence = a.faceFrames / a.samples
    const eyeContact = a.faceFrames ? a.facingFrames / a.faceFrames : 0
    const expressiveness = a.faceFrames ? Math.min(1, a.exprSum / a.faceFrames / 0.25) : 0
    const score = Math.round((0.5 * eyeContact + 0.3 * presence + 0.2 * expressiveness) * 100)
    return {
      eyeContact: Math.round(eyeContact * 100),
      presence: Math.round(presence * 100),
      expressiveness: Math.round(expressiveness * 100),
      score,
      samples: a.samples,
    }
  }, [])

  // Vòng lặp phân tích khi đang chạy + có camera
  useEffect(() => {
    if (!ready || !active) return
    let running = true

    const loop = () => {
      if (!running) return
      const video = videoRef?.current
      const lm = landmarkerRef.current
      if (video && lm && video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime
        try {
          const res = lm.detectForVideo(video, performance.now())
          acc.current.samples++
          if (res.faceLandmarks && res.faceLandmarks.length) {
            acc.current.faceFrames++
            const lmk = res.faceLandmarks[0]
            const L = lmk[33] // mắt trái
            const R = lmk[263] // mắt phải
            const N = lmk[1] // chóp mũi
            const eyeMidX = (L.x + R.x) / 2
            const eyeDist = Math.abs(R.x - L.x) || 1e-3
            const yaw = Math.abs((N.x - eyeMidX) / eyeDist) // ~0 khi nhìn thẳng
            if (yaw < 0.12) acc.current.facingFrames++

            const bs = res.faceBlendshapes?.[0]?.categories
            if (bs) {
              const pick = (name) => bs.find((c) => c.categoryName === name)?.score || 0
              const expr =
                pick('mouthSmileLeft') +
                pick('mouthSmileRight') +
                pick('jawOpen') +
                pick('browInnerUp')
              acc.current.exprSum += Math.min(1, expr)
            }
          }

          const now = performance.now()
          if (now - lastUi.current > 250) {
            lastUi.current = now
            const r = getReport()
            if (r) setMetrics(r)
          }
        } catch {
          /* bỏ qua lỗi từng frame */
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, active, videoRef, getReport])

  return { ready, metrics, getReport, reset }
}
