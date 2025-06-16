'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Upload, Image as ImageIcon, Download, Trash2, Sparkles, Edit, Wand2 } from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'
import ImageEditor from './image-editor'

interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  processedUrl?: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  progress: number
  type: 'background-removal' | 'generative-fill'
}

export default function ImageUploader() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingImage, setEditingImage] = useState<ProcessedImage | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: ProcessedImage[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      originalFile: file,
      originalUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
      type: 'background-removal'
    }))
    
    setImages(prev => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true
  })

  const removeBackgroundFromImage = async (imageId: string) => {
    console.log('Starting background removal for image:', imageId)
    setIsProcessing(true)
    
    setImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, status: 'processing', progress: 0 }
          : img
      )
    )

    try {
      const image = images.find(img => img.id === imageId)
      if (!image) {
        console.error('Image not found:', imageId)
        return
      }

      console.log('Processing image:', image.originalFile.name)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImages(prev => 
          prev.map(img => 
            img.id === imageId && img.progress < 90
              ? { ...img, progress: img.progress + 10 }
              : img
          )
        )
      }, 500)

      console.log('Calling removeBackground...')
      const blob = await removeBackground(image.originalFile)
      console.log('Background removal completed, blob size:', blob.size)
      
      const processedUrl = URL.createObjectURL(blob)
      console.log('Created object URL:', processedUrl)

      clearInterval(progressInterval)

      setImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { 
                ...img, 
                processedUrl, 
                status: 'completed', 
                progress: 100 
              }
            : img
        )
      )
      
      console.log('Background removal completed successfully')
    } catch (error) {
      console.error('Background removal failed:', error)
      alert(`Background removal failed: ${error}`)
      setImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, status: 'error', progress: 0 }
            : img
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.originalUrl)
        if (imageToRemove.processedUrl) {
          URL.revokeObjectURL(imageToRemove.processedUrl)
        }
      }
      return prev.filter(img => img.id !== imageId)
    })
  }

  const openEditor = (image: ProcessedImage) => {
    setEditingImage(image)
  }

  const closeEditor = () => {
    setEditingImage(null)
  }

  const saveEditedImage = (editedImageUrl: string) => {
    if (!editingImage) return

    setImages(prev => 
      prev.map(img => 
        img.id === editingImage.id
          ? { ...img, processedUrl: editedImageUrl, status: 'completed' }
          : img
      )
    )
    closeEditor()
  }

  if (editingImage) {
    return (
      <ImageEditor
        imageUrl={editingImage.processedUrl || editingImage.originalUrl}
        onSave={saveEditedImage}
        onClose={closeEditor}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white drop-shadow-lg">🎨 AI Image Editor</h1>
        <p className="text-white/80 text-lg">
          Remove backgrounds and enhance images with AI
        </p>
      </div>

      {/* Upload Area */}
      <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop your images here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drag & drop images here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PNG, JPG, JPEG, WebP formats
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Processing Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden bg-white/95 backdrop-blur shadow-xl border-0">
              <CardContent className="p-0">
                <div className="aspect-video relative bg-muted flex items-center justify-center">
                  {image.originalUrl ? (
                    <img
                      src={image.originalUrl}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium truncate">
                        {image.originalFile.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          image.status === 'completed' ? 'default' :
                          image.status === 'processing' ? 'secondary' :
                          image.status === 'error' ? 'destructive' : 'outline'
                        }>
                          {image.status}
                        </Badge>
                        {image.status === 'processing' && (
                          <span className="text-sm text-muted-foreground">
                            {image.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {image.status === 'processing' && (
                    <Progress value={image.progress} className="w-full" />
                  )}

                  <div className="flex gap-2">
                    {image.status === 'idle' && (
                      <>
                        <Button 
                          onClick={() => removeBackgroundFromImage(image.id)}
                          disabled={isProcessing}
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 shadow-lg"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Remove Background
                        </Button>
                        <Button
                          onClick={() => openEditor(image)}
                          disabled={isProcessing}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          AI Edit
                        </Button>
                      </>
                    )}
                    
                    {image.status === 'completed' && image.processedUrl && (
                      <>
                        <Button
                          onClick={() => downloadImage(
                            image.processedUrl!,
                            `processed-${image.originalFile.name}`
                          )}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openEditor(image)}
                          disabled={isProcessing}
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => removeBackgroundFromImage(image.id)}
                          disabled={isProcessing}
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    {image.status === 'error' && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={() => removeBackgroundFromImage(image.id)}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          Try Again
                        </Button>
                        <Button
                          onClick={() => openEditor(image)}
                          disabled={isProcessing}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          AI Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Processed Image Preview */}
                {image.processedUrl && (
                  <div className="border-t bg-muted/50">
                    <div className="aspect-video relative bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <img
                        src={image.processedUrl}
                        alt="Processed"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}