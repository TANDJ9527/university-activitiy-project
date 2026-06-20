import { useRef, useState, useCallback, useEffect } from 'react'

interface AvatarCropperProps {
  imageSrc: string
  onCrop: (croppedBase64: string) => void
  onCancel: () => void
}

export function AvatarCropper({ imageSrc, onCrop, onCancel }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const canvasSize = 320
  const cropSize = 240

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      // 初始居中显示
      const minScale = Math.max(cropSize / img.width, cropSize / img.height)
      setScale(Math.max(minScale, 1))
      setPosition({
        x: (canvasSize - img.width * Math.max(minScale, 1)) / 2,
        y: (canvasSize - img.height * Math.max(minScale, 1)) / 2,
      })
    }
    img.src = imageSrc
  }, [imageSrc])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // 绘制图片
    ctx.drawImage(img, position.x, position.y, img.width * scale, img.height * scale)

    // 绘制遮罩层（裁剪框外变暗）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    // 上
    ctx.fillRect(0, 0, canvasSize, (canvasSize - cropSize) / 2)
    // 下
    ctx.fillRect(0, (canvasSize + cropSize) / 2, canvasSize, (canvasSize - cropSize) / 2)
    // 左
    ctx.fillRect(0, (canvasSize - cropSize) / 2, (canvasSize - cropSize) / 2, cropSize)
    // 右
    ctx.fillRect((canvasSize + cropSize) / 2, (canvasSize - cropSize) / 2, (canvasSize - cropSize) / 2, cropSize)

    // 绘制裁剪框边框
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect((canvasSize - cropSize) / 2, (canvasSize - cropSize) / 2, cropSize, cropSize)

    // 绘制九宫格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    const cellSize = cropSize / 3
    const startX = (canvasSize - cropSize) / 2
    const startY = (canvasSize - cropSize) / 2
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(startX + i * cellSize, startY)
      ctx.lineTo(startX + i * cellSize, startY + cropSize)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(startX, startY + i * cellSize)
      ctx.lineTo(startX + cropSize, startY + i * cellSize)
      ctx.stroke()
    }
  }, [position, scale])

  useEffect(() => {
    if (imageLoaded) {
      draw()
    }
  }, [imageLoaded, draw])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleCrop = () => {
    const img = imageRef.current
    if (!img) return

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = cropSize
    outputCanvas.height = cropSize
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    const startX = (canvasSize - cropSize) / 2
    const startY = (canvasSize - cropSize) / 2

    ctx.drawImage(
      img,
      (startX - position.x) / scale,
      (startY - position.y) / scale,
      cropSize / scale,
      cropSize / scale,
      0,
      0,
      cropSize,
      cropSize
    )

    const base64 = outputCanvas.toDataURL('image/jpeg', 0.9)
    onCrop(base64)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-center text-lg font-bold text-slate-800">裁剪头像</h3>
        <p className="mb-4 text-center text-xs text-slate-500">拖拽移动图片，点击按钮缩放，调整至满意后点击确认</p>

        <div
          ref={containerRef}
          className="relative mx-auto mb-4 cursor-move select-none overflow-hidden rounded-lg"
          style={{ width: canvasSize, height: canvasSize }}
          onMouseDown={handleMouseDown}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="block"
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <span className="text-sm text-slate-500">加载中…</span>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            −
          </button>
          <span className="w-16 text-center text-sm text-slate-600">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(5, s + 0.2))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            +
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-60"
          >
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  )
}
