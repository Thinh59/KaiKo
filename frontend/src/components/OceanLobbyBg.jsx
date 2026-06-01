import { useEffect, useRef } from 'react'

/**
 * OceanLobbyBg — full-screen animated underwater canvas background.
 * Layers (back→front):
 *   1. Deep ocean gradient
 *   2. God-ray sunbeams from surface
 *   3. Mid-layer: corals, seaweeds silhouettes
 *   4. Floating bubbles (rising)
 *   5. Swimming fish (parallax speed difference)
 *   6. Foreground rock silhouettes
 */
export default function OceanLobbyBg({ style = {} }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = 0, H = 0

    // ── Resize ──────────────────────────────────────────────
    const resize = () => {
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // ── Bubbles ──────────────────────────────────────────────
    const NUM_BUBBLES = 60
    const bubbles = Array.from({ length: NUM_BUBBLES }, () => makeBubble(W, H, true))

    function makeBubble(w, h, random = false) {
      return {
        x: Math.random() * w,
        y: random ? Math.random() * h : h + Math.random() * 40,
        r: 2 + Math.random() * 6,
        speed: 0.4 + Math.random() * 1.0,
        drift: (Math.random() - 0.5) * 0.3,
        alpha: 0.2 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.04,
      }
    }

    // ── Fish ─────────────────────────────────────────────────
    const FISH_DATA = [
      { color: '#ff9f43', tailColor: '#e17055', size: 1.0, layer: 1 },
      { color: '#fdcb6e', tailColor: '#e17055', size: 0.7, layer: 2 },
      { color: '#74b9ff', tailColor: '#0984e3', size: 0.85, layer: 1 },
      { color: '#55efc4', tailColor: '#00b894', size: 0.6, layer: 2 },
      { color: '#fd79a8', tailColor: '#e84393', size: 0.9, layer: 1 },
      { color: '#a29bfe', tailColor: '#6c5ce7', size: 0.65, layer: 3 },
    ]
    const fish = FISH_DATA.map((f, i) => ({
      ...f,
      x: Math.random() * (W + 400) - 200,
      y: 0.25 * H + Math.random() * 0.55 * H,
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: (0.6 + Math.random() * 1.2) * (f.layer === 3 ? 0.4 : f.layer === 2 ? 0.7 : 1.0),
      tailPhase: Math.random() * Math.PI * 2,
      tailSpeed: 0.08 + Math.random() * 0.06,
      baseY: 0.25 * H + Math.random() * 0.55 * H,
      bobAmp: 8 + Math.random() * 14,
      bobSpeed: 0.01 + Math.random() * 0.015,
      bobPhase: Math.random() * Math.PI * 2,
    }))

    // ── Sun rays ─────────────────────────────────────────────
    const RAYS = 8
    const rays = Array.from({ length: RAYS }, (_, i) => ({
      angle: -0.55 + (i / (RAYS - 1)) * 1.1,   // radians spread
      width: 0.03 + Math.random() * 0.04,
      alpha: 0.04 + Math.random() * 0.07,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.005,
    }))

    // ── Corals / seaweeds (static shapes) ────────────────────
    function drawCorals(ctx, w, h) {
      // Silhouette coral shapes along the bottom
      ctx.save()
      const coralPositions = [
        { x: 0.05 * w, h: 0.22 * h, type: 'fan', color: 'rgba(180,60,80,0.45)' },
        { x: 0.12 * w, h: 0.16 * h, type: 'branch', color: 'rgba(230,100,50,0.4)' },
        { x: 0.18 * w, h: 0.28 * h, type: 'fan', color: 'rgba(150,50,120,0.4)' },
        { x: 0.78 * w, h: 0.2 * h, type: 'branch', color: 'rgba(200,80,60,0.4)' },
        { x: 0.87 * w, h: 0.26 * h, type: 'fan', color: 'rgba(160,60,180,0.38)' },
        { x: 0.93 * w, h: 0.18 * h, type: 'branch', color: 'rgba(220,110,40,0.42)' },
      ]
      for (const c of coralPositions) {
        if (c.type === 'fan') drawFanCoral(ctx, c.x, h, c.h, c.color)
        else drawBranchCoral(ctx, c.x, h, c.h, c.color)
      }
      ctx.restore()
    }

    function drawFanCoral(ctx, x, baseY, height, color) {
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      const branches = 7
      for (let i = 0; i < branches; i++) {
        const angle = -Math.PI / 2 + ((i / (branches - 1)) - 0.5) * 1.4
        ctx.beginPath()
        ctx.moveTo(x, baseY)
        const cx1 = x + Math.cos(angle) * height * 0.4
        const cy1 = baseY + Math.sin(angle) * height * 0.4
        ctx.quadraticCurveTo(cx1, cy1, x + Math.cos(angle) * height, baseY - height)
        ctx.stroke()
      }
      // Connecting arc
      ctx.beginPath()
      ctx.arc(x, baseY - height * 0.9, height * 0.55, Math.PI * 0.9, Math.PI * 0.1, false)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    function drawBranchCoral(ctx, x, baseY, height, color) {
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      function branch(x, y, len, angle, depth) {
        if (depth === 0 || len < 4) return
        const ex = x + Math.cos(angle) * len
        const ey = y - Math.sin(Math.abs(angle)) * len
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(ex, ey)
        ctx.lineWidth = Math.max(1, depth)
        ctx.stroke()
        branch(ex, ey, len * 0.65, angle - 0.5 + Math.random() * 0.3, depth - 1)
        branch(ex, ey, len * 0.65, angle + 0.5 - Math.random() * 0.3, depth - 1)
      }
      branch(x, baseY, height * 0.5, Math.PI / 2, 4)
    }

    // ── Foreground rocks ──────────────────────────────────────
    function drawRocks(ctx, w, h) {
      ctx.save()
      const rocks = [
        { x: -0.02 * w, yw: 0.18 * h, xw: 0.15 * w },
        { x: 0.88 * w, yw: 0.14 * h, xw: 0.14 * w },
        { x: 0.38 * w, yw: 0.07 * h, xw: 0.08 * w },
      ]
      for (const r of rocks) {
        const grad = ctx.createLinearGradient(r.x, h - r.yw, r.x, h)
        grad.addColorStop(0, 'rgba(10,30,60,0.85)')
        grad.addColorStop(1, 'rgba(5,15,40,0.95)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(r.x + r.xw / 2, h, r.xw / 2, r.yw, 0, Math.PI, 0)
        ctx.fill()
      }
      ctx.restore()
    }

    // ── Draw fish ─────────────────────────────────────────────
    function drawFish(ctx, f, t) {
      const tailWag = Math.sin(f.tailPhase) * 0.4
      const bodyLen = 28 * f.size
      const bodyH = 12 * f.size
      ctx.save()
      ctx.translate(f.x, f.y)
      if (f.dir < 0) ctx.scale(-1, 1)

      // tail
      ctx.fillStyle = f.tailColor
      ctx.beginPath()
      ctx.moveTo(-bodyLen * 0.4, 0)
      ctx.lineTo(-bodyLen, -bodyH * (0.8 + tailWag))
      ctx.lineTo(-bodyLen, bodyH * (0.8 - tailWag))
      ctx.closePath()
      ctx.fill()

      // body
      ctx.fillStyle = f.color
      ctx.beginPath()
      ctx.ellipse(0, 0, bodyLen * 0.6, bodyH * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // eye
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bodyLen * 0.3, -bodyH * 0.1, bodyH * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#222'
      ctx.beginPath()
      ctx.arc(bodyLen * 0.32, -bodyH * 0.1, bodyH * 0.09, 0, Math.PI * 2)
      ctx.fill()

      // fin
      ctx.fillStyle = f.tailColor + 'aa'
      ctx.beginPath()
      ctx.moveTo(bodyLen * 0.1, -bodyH * 0.4)
      ctx.lineTo(-bodyLen * 0.15, -bodyH * 0.8)
      ctx.lineTo(-bodyLen * 0.2, -bodyH * 0.4)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    // ── Main loop ─────────────────────────────────────────────
    let t = 0
    function draw() {
      t += 0.016
      if (!ctx || W === 0) { rafRef.current = requestAnimationFrame(draw); return }

      // 1. Deep ocean gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, '#051a35')
      bgGrad.addColorStop(0.3, '#082d52')
      bgGrad.addColorStop(0.7, '#0a3d6e')
      bgGrad.addColorStop(1, '#030f22')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      // 2. Sun rays from top-center
      ctx.save()
      for (const ray of rays) {
        ray.phase += ray.speed
        const alpha = ray.alpha * (0.7 + 0.3 * Math.sin(ray.phase))
        const rayGrad = ctx.createLinearGradient(W * 0.5, 0, W * 0.5, H * 0.85)
        rayGrad.addColorStop(0, `rgba(160,220,255,${alpha})`)
        rayGrad.addColorStop(0.5, `rgba(120,200,255,${alpha * 0.4})`)
        rayGrad.addColorStop(1, `rgba(0,0,0,0)`)
        ctx.fillStyle = rayGrad
        const spread = ray.width * W
        ctx.beginPath()
        ctx.moveTo(W * 0.5, 0)
        const lx = W * 0.5 + Math.tan(ray.angle - spread / W * 5) * H
        const rx = W * 0.5 + Math.tan(ray.angle + spread / W * 5) * H
        ctx.lineTo(lx, H)
        ctx.lineTo(rx, H)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      // 3. Atmospheric glow at surface
      const surfGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4)
      surfGrad.addColorStop(0, 'rgba(100,200,255,0.12)')
      surfGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = surfGrad
      ctx.fillRect(0, 0, W, H * 0.4)

      // 4. Corals (mid-layer)
      drawCorals(ctx, W, H)

      // 5. Fish (layered)
      for (const f of fish) {
        // bob
        f.bobPhase += f.bobSpeed
        f.y = f.baseY + Math.sin(f.bobPhase) * f.bobAmp

        // move
        f.tailPhase += f.tailSpeed
        f.x += f.dir * f.speed
        if (f.dir > 0 && f.x > W + 80) { f.x = -80; f.baseY = 0.25 * H + Math.random() * 0.55 * H }
        if (f.dir < 0 && f.x < -80) { f.x = W + 80; f.baseY = 0.25 * H + Math.random() * 0.55 * H }

        // depth fade for back layers
        const layerAlpha = f.layer === 3 ? 0.35 : f.layer === 2 ? 0.65 : 1.0
        ctx.globalAlpha = layerAlpha
        drawFish(ctx, f, t)
        ctx.globalAlpha = 1
      }

      // 6. Bubbles
      for (const b of bubbles) {
        b.wobble += b.wobbleSpeed
        b.y -= b.speed
        b.x += b.drift + Math.sin(b.wobble) * 0.3
        if (b.y < -20) {
          b.y = H + 10
          b.x = Math.random() * W
        }

        ctx.save()
        ctx.globalAlpha = b.alpha
        const bGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r)
        bGrad.addColorStop(0, 'rgba(200,240,255,0.9)')
        bGrad.addColorStop(0.4, 'rgba(150,220,255,0.3)')
        bGrad.addColorStop(1, 'rgba(100,180,255,0.05)')
        ctx.fillStyle = bGrad
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        // rim
        ctx.strokeStyle = 'rgba(180,230,255,0.4)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.restore()
      }

      // 7. Foreground rocks
      drawRocks(ctx, W, H)

      // 8. Caustic light ripples at bottom
      const causticGrad = ctx.createLinearGradient(0, H * 0.75, 0, H)
      causticGrad.addColorStop(0, 'rgba(0,80,160,0.0)')
      causticGrad.addColorStop(1, 'rgba(0,40,100,0.5)')
      ctx.fillStyle = causticGrad
      ctx.fillRect(0, H * 0.75, W, H * 0.25)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
