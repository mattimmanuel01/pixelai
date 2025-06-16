'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Download, 
  Trash2, 
  Sparkles, 
  Wand2,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  Stars
} from 'lucide-react'
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

export default function ModernImageUploader() {
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
      if (!image) return

      const progressInterval = setInterval(() => {
        setImages(prev => 
          prev.map(img => 
            img.id === imageId && img.progress < 90
              ? { ...img, progress: img.progress + 10 }
              : img
          )
        )
      }, 500)

      const blob = await removeBackground(image.originalFile)
      const processedUrl = URL.createObjectURL(blob)

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
    } catch (error) {
      console.error('Background removal failed:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Stars className="w-3 h-3 text-yellow-900" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-6">
              AI Image Studio
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Professional image editing powered by AI. Remove backgrounds, enhance images, and create stunning visuals in seconds.
            </p>
            
            {/* Stats */}
            <div className="flex justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">10M+</div>
                <div className="text-sm text-gray-500">Images Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">99.9%</div>
                <div className="text-sm text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">5s</div>
                <div className="text-sm text-gray-500">Avg Processing</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-8">
            <div
              {...getRootProps()}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02] shadow-lg' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }
              `}
            >
              <input {...getInputProps()} />
              
              {/* Upload Icon */}
              <div className={`
                w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-300
                ${isDragActive 
                  ? 'bg-blue-500 text-white scale-110' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'
                }
              `}>
                <Upload className="w-10 h-10" />
              </div>

              {isDragActive ? (
                <div className="animate-pulse">
                  <h3 className="text-2xl font-semibold text-blue-600 mb-2">
                    Drop your images here!
                  </h3>
                  <p className="text-blue-500">
                    Release to upload your files
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Drag & drop your images
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    or click to browse from your device
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">PNG</Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">JPG</Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">WEBP</Badge>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">JPEG</Badge>
                  </div>
                </div>
              )}

              {/* Decorative Elements */}
              <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 rounded-full opacity-50"></div>
              <div className="absolute top-6 right-8 w-1 h-1 bg-purple-400 rounded-full opacity-50"></div>
              <div className="absolute bottom-8 left-6 w-1.5 h-1.5 bg-green-400 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>

        {/* Image Processing Grid */}
        {images.length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Images ({images.length})
              </h2>
              <Button
                variant="outline"
                onClick={() => setImages([])}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {images.map((image) => (
                <div key={image.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
                  {/* Image Preview */}
                  <div className="aspect-video relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600">
                    {image.originalUrl && (
                      <img
                        src={image.originalUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    )}
                    
                    {/* Status Overlay */}
                    {image.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Processing...</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{image.progress}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image Info & Actions */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {image.originalFile.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(image.originalFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Badge 
                          variant={
                            image.status === 'completed' ? 'default' :
                            image.status === 'processing' ? 'secondary' :
                            image.status === 'error' ? 'destructive' : 'outline'
                          }
                          className="flex items-center gap-1"
                        >
                          {image.status === 'completed' && <Check className="w-3 h-3" />}
                          {image.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {image.status === 'error' && <AlertCircle className="w-3 h-3" />}
                          {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {image.status === 'processing' && (
                      <div className="mb-4">
                        <Progress value={image.progress} className="h-2" />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {image.status === 'idle' && (
                        <>
                          <Button 
                            onClick={() => removeBackgroundFromImage(image.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Remove Background
                          </Button>
                          <Button
                            onClick={() => openEditor(image)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
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
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            onClick={() => openEditor(image)}
                            disabled={isProcessing}
                            variant="outline"
                            className="border-2 hover:bg-gray-50"
                          >
                            <Wand2 className="w-4 h-4 mr-2" />
                            Edit More
                          </Button>
                        </>
                      )}
                      
                      {image.status === 'error' && (
                        <>
                          <Button 
                            onClick={() => removeBackgroundFromImage(image.id)}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Try Again
                          </Button>
                          <Button
                            onClick={() => openEditor(image)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
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
                    <div className="border-t border-gray-200 dark:border-slate-700">
                      <div className="p-4 bg-gray-50 dark:bg-slate-700/50">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                          ✨ AI Processed Result
                        </p>
                        <div className="aspect-video relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjEwIiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNGOUZBRkIiLz4KPHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI0Y5RkFGQiIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI0YzRjRGNiIvPgo8L3N2Zz4K')] bg-repeat rounded-lg overflow-hidden">
                          <img
                            src={image.processedUrl}
                            alt="Processed"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        {images.length === 0 && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400">AI-powered processing in seconds, not minutes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Professional Quality</h3>
              <p className="text-gray-600 dark:text-gray-400">Studio-grade results with pixel-perfect precision</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Enhancement</h3>
              <p className="text-gray-600 dark:text-gray-400">Advanced generative fill and image editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}