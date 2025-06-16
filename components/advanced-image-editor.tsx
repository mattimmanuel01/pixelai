'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Brush, 
  Eraser, 
  Download, 
  Sparkles,
  ArrowLeft,
  Undo,
  Redo
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdvancedImageEditorProps {
  imageUrl: string
}

export default function AdvancedImageEditor({ imageUrl }: AdvancedImageEditorProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showCursor, setShowCursor] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setOriginalImage(img)
      initializeCanvas(img)
    }
    img.src = imageUrl
  }, [imageUrl])

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const cursorCanvas = cursorCanvasRef.current
    if (!canvas || !maskCanvas || !cursorCanvas) return

    const ctx = canvas.getContext('2d')
    const maskCtx = maskCanvas.getContext('2d')
    const cursorCtx = cursorCanvas.getContext('2d')
    if (!ctx || !maskCtx || !cursorCtx) return

    // Set canvas dimensions to fit the container
    const containerWidth = 800
    const containerHeight = 600
    const ratio = Math.min(containerWidth / img.width, containerHeight / img.height)
    
    canvas.width = img.width * ratio
    canvas.height = img.height * ratio
    maskCanvas.width = canvas.width
    maskCanvas.height = canvas.height
    cursorCanvas.width = canvas.width
    cursorCanvas.height = canvas.height

    // Draw original image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Initialize mask canvas with transparent background
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
  }

  const startDrawing = useCallback((e: React.MouseEvent) => {
    const canvas = maskCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    
    setIsDrawing(true)
    setLastPos({ x, y })
    
    // Draw initial dot
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'brush') {
      // Create a flat mask - areas are either selected (1) or not (0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(239, 68, 68, 1)' // Full opacity
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI)
      ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI)
      ctx.fill()
    }
  }, [tool, brushSize])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    setLastPos(null)
  }, [])

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !lastPos) return
    
    const canvas = maskCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const currentX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const currentY = (e.clientY - rect.top) * (canvas.height / rect.height)

    // Calculate distance to prevent overlapping circles
    const distance = Math.sqrt(
      Math.pow(currentX - lastPos.x, 2) + Math.pow(currentY - lastPos.y, 2)
    )

    // Only draw if we've moved enough to prevent overlap
    if (distance < brushSize * 0.1) return

    if (tool === 'brush') {
      // Create flat binary mask - painting over doesn't increase opacity
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(239, 68, 68, 1)' // Full opacity for clean mask
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()
    } else {
      // Erase smooth line between points
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()
    }

    setLastPos({ x: currentX, y: currentY })
  }, [isDrawing, tool, brushSize, lastPos])

  const clearMask = () => {
    const canvas = maskCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear the entire mask canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const updateCursor = useCallback((e: React.MouseEvent) => {
    const canvas = cursorCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    
    setMousePos({ x, y })

    // Draw cursor outline
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (showCursor) {
      ctx.strokeStyle = tool === 'brush' ? '#ef4444' : '#6b7280'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [brushSize, tool, showCursor])

  const handleMouseEnter = () => setShowCursor(true)
  const handleMouseLeave = () => {
    setShowCursor(false)
    const canvas = cursorCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const processGenerativeFill = async () => {
    if (!originalImage || !prompt.trim()) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      if (!canvas || !maskCanvas) return

      // Create a proper mask - convert red overlay to white mask
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = maskCanvas.width
      tempCanvas.height = maskCanvas.height
      const tempCtx = tempCanvas.getContext('2d')
      
      if (tempCtx) {
        // Get the red overlay data
        const imageData = maskCanvas.getContext('2d')!.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
        const data = imageData.data
        
        // Convert red areas to white mask
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha > 0) {
            // Red area exists, make it white in mask
            data[i] = 255     // R
            data[i + 1] = 255 // G
            data[i + 2] = 255 // B
            data[i + 3] = 255 // A
          } else {
            // No red area, make it black in mask
            data[i] = 0       // R
            data[i + 1] = 0   // G
            data[i + 2] = 0   // B
            data[i + 3] = 255 // A
          }
        }
        
        tempCtx.putImageData(imageData, 0, 0)
      }

      // Convert canvases to base64
      const imageBase64 = canvas.toDataURL('image/png')
      const maskBase64 = tempCanvas.toDataURL('image/png')

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 90 ? prev + 10 : prev)
      }, 500)

      const response = await fetch('/api/generative-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: prompt.trim()
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('Failed to process generative fill')
      }

      const data = await response.json()
      
      if (data.output && data.output[0]) {
        const resultImg = new Image()
        resultImg.crossOrigin = 'anonymous'
        resultImg.onload = () => {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height)
            setProgress(100)
          }
        }
        resultImg.src = data.output[0]
      }
    } catch (error) {
      console.error('Generative fill failed:', error)
      alert('Failed to process generative fill. Please try again.')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'edited-image.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">AI Image Editor</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={downloadImage}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Image Editor</span>
              </div>
            </div>
            
            <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <canvas
                  ref={canvasRef}
                  className="block max-w-full max-h-full"
                  style={{ maxWidth: '800px', maxHeight: '600px' }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 pointer-events-auto"
                  style={{ 
                    cursor: 'none',
                    maxWidth: '800px', 
                    maxHeight: '600px',
                    opacity: 0.4 // Make the red overlay more subtle
                  }}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={(e) => {
                    draw(e)
                    updateCursor(e)
                  }}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={() => {
                    stopDrawing()
                    handleMouseLeave()
                  }}
                />
                <canvas
                  ref={cursorCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ 
                    maxWidth: '800px', 
                    maxHeight: '600px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tools Panel */}
        <div className="space-y-6">
          {/* Tools */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tools</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Select Tool</Label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setTool('brush')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      tool === 'brush' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Brush className="w-4 h-4" />
                    Brush
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      tool === 'eraser' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    Eraser
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brush-size" className="text-sm font-medium">
                  Brush Size: {brushSize}px
                </Label>
                <Input
                  id="brush-size"
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearMask}
                className="w-full"
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {/* Generative Fill */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Generative Fill</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-sm font-medium">
                  Describe what to fill:
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., a beautiful sunset sky, green grass, modern building..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Processing...</span>
                    <span className="text-gray-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={processGenerativeFill}
                disabled={!prompt.trim() || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Generate Fill'}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>1. Paint over the area you want to fill</p>
                <p>2. Describe what should appear there</p>
                <p>3. Click Generate Fill</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={isProcessing ? "secondary" : "outline"}>
                  {isProcessing ? "Processing" : "Ready"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tool:</span>
                <Badge 
                  variant="outline"
                  className="bg-gray-50 text-gray-700 border-gray-200"
                >
                  {tool === 'brush' ? 'Brush' : 'Eraser'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}