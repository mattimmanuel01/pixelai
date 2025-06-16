'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Palette
} from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onSave?: (editedImageUrl: string) => void
  onClose?: () => void
}

export default function ImageEditor({ imageUrl, onSave, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

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
    if (!canvas || !maskCanvas) return

    const ctx = canvas.getContext('2d')
    const maskCtx = maskCanvas.getContext('2d')
    if (!ctx || !maskCtx) return

    // Set canvas dimensions
    const maxWidth = 800
    const maxHeight = 600
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
    
    canvas.width = img.width * ratio
    canvas.height = img.height * ratio
    maskCanvas.width = canvas.width
    maskCanvas.height = canvas.height

    // Draw original image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Initialize mask canvas with black background
    maskCtx.fillStyle = 'black'
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  }

  const startDrawing = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true)
    draw(e)
  }, [tool, brushSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return
    
    const canvas = maskCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out'
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI)
    ctx.fill()
  }, [isDrawing, tool, brushSize])

  const clearMask = () => {
    const canvas = maskCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const processGenerativeFill = async () => {
    if (!originalImage || !prompt.trim()) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      if (!canvas || !maskCanvas) return

      // Convert canvases to base64
      const imageBase64 = canvas.toDataURL('image/png')
      const maskBase64 = maskCanvas.toDataURL('image/png')

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
            
            if (onSave) {
              onSave(canvas.toDataURL('image/png'))
            }
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
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Image Editor</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadImage}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Image Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full object-contain"
                  style={{ zIndex: 1 }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 w-full h-full object-contain opacity-30 pointer-events-auto"
                  style={{ 
                    zIndex: 2,
                    mixBlendMode: 'multiply'
                  }}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={tool === 'brush' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('brush')}
                  className="flex-1"
                >
                  <Brush className="w-4 h-4" />
                </Button>
                <Button
                  variant={tool === 'eraser' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('eraser')}
                  className="flex-1"
                >
                  <Eraser className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brush-size">Brush Size: {brushSize}px</Label>
                <Input
                  id="brush-size"
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
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
            </CardContent>
          </Card>

          {/* Generative Fill */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generative Fill
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Describe what to fill:</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., a beautiful sunset sky, green grass, modern building..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                onClick={processGenerativeFill}
                disabled={!prompt.trim() || isProcessing}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Generate Fill'}
              </Button>

              <div className="text-xs text-muted-foreground">
                1. Paint over the area you want to fill
                2. Describe what should appear there
                3. Click Generate Fill
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <Badge variant={isProcessing ? "secondary" : "outline"}>
                    {isProcessing ? "Processing" : "Ready"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tool:</span>
                  <Badge variant="outline">
                    {tool === 'brush' ? 'Selection' : 'Eraser'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}