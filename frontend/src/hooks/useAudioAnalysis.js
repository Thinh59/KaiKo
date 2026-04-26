import { useRef, useState, useCallback } from 'react'

export function useAudioAnalysis() {
  const [audioMetrics, setAudioMetrics] = useState({
    volume: 0,
    avgVolume: 0,
    pitchVariance: 0,
    isLoud: false,
    isShaky: false,
  })

  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const intervalRef = useRef(null)
  const volumeHistRef = useRef([])
  const pitchHistRef = useRef([])

  const LOUD_THRESHOLD = 80
  const SHAKY_THRESHOLD = 15

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      audioCtxRef.current = audioCtx
      analyserRef.current = analyser
      volumeHistRef.current = []
      pitchHistRef.current = []

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      intervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)

        const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length)
        const volume = Math.min(100, Math.round((rms / 128) * 100))

        const maxIdx = dataArray.indexOf(Math.max(...dataArray))
        const pitch = maxIdx * (audioCtx.sampleRate / analyser.fftSize)

        volumeHistRef.current.push(volume)
        pitchHistRef.current.push(pitch)

        if (volumeHistRef.current.length > 50) volumeHistRef.current.shift()
        if (pitchHistRef.current.length > 50) pitchHistRef.current.shift()

        const pitchArr = pitchHistRef.current
        const avgPitch = pitchArr.reduce((a, b) => a + b, 0) / pitchArr.length
        const variance = Math.sqrt(
          pitchArr.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / pitchArr.length
        )
        const normalizedVariance = Math.min(100, Math.round(variance / 10))

        const avgVol = Math.round(
          volumeHistRef.current.reduce((a, b) => a + b, 0) / volumeHistRef.current.length
        )

        setAudioMetrics({
          volume,
          avgVolume: avgVol,
          pitchVariance: normalizedVariance,
          isLoud: volume > LOUD_THRESHOLD,
          isShaky: normalizedVariance > SHAKY_THRESHOLD,
        })
      }, 50)
    } catch (err) {
      console.error('Audio analysis error:', err)
    }
  }, [])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    audioCtxRef.current?.close()
  }, [])

  const getSummary = useCallback(() => {
    const vols = volumeHistRef.current
    const loud = vols.filter(v => v > LOUD_THRESHOLD).length
    const pcts = pitchHistRef.current

    const avgPitch = pcts.reduce((a, b) => a + b, 0) / Math.max(pcts.length, 1)
    const shaky = pcts.filter(p => Math.abs(p - avgPitch) > avgPitch * 0.15).length

    return {
      loudPct: Math.round((loud / Math.max(vols.length, 1)) * 100),
      shakyPct: Math.round((shaky / Math.max(pcts.length, 1)) * 100),
      avgVolume: Math.round(vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1)),
    }
  }, [])

  return { audioMetrics, start, stop, getSummary }
}
