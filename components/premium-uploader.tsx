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
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  Zap,
  Image as ImageIcon,
  Play,
  Edit
} from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'
import { useRouter } from 'next/navigation'

interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  processedUrl?: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  progress: number
  type: 'background-removal' | 'generative-fill'
}

export default function PremiumUploader() {
  const router = useRouter()
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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
      }, 300)

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

  const openAdvancedEditor = (image: ProcessedImage) => {
    // Convert the file to base64 and store it with both approaches
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const imageKey = `editor_image_${Date.now()}`
      
      if (typeof window !== 'undefined') {
        // Store in both global variable (for immediate navigation) and localStorage (for refresh)
        (window as any).editorImageFile = image.originalFile
        
        try {
          localStorage.setItem(imageKey, base64)
          console.log('Stored image in localStorage with key:', imageKey)
        } catch (error) {
          console.warn('Failed to store in localStorage:', error)
        }
        
        // Navigate with both methods for reliability
        router.push(`/editor?hasFile=true&imageKey=${imageKey}`)
      }
    }
    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      alert('Failed to process image. Please try again.')
    }
    reader.readAsDataURL(image.originalFile)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Image Processing
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Remove backgrounds
              <br />
              <span className="text-blue-600">in seconds</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Professional-quality background removal and AI image editing. 
              No subscriptions, no watermarks, just results.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <div className={`
            w-16 h-16 mx-auto mb-8 rounded-2xl flex items-center justify-center transition-all duration-200
            ${isDragActive 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-400'
            }
          `}>
            <Upload className="w-8 h-8" />
          </div>

          {isDragActive ? (
            <div>
              <h3 className="text-2xl font-semibold text-blue-600 mb-2">
                Drop your images here
              </h3>
              <p className="text-blue-500">
                Release to upload
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Upload your images
              </h3>
              <p className="text-gray-500 mb-8">
                Drag and drop files here, or click to browse
              </p>
              
              <Button className="bg-black hover:bg-gray-800 text-white px-8 py-3 h-auto text-base font-medium">
                Choose Files
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-sm text-gray-400 mt-6">
                Supports PNG, JPG, JPEG, WebP • Max 10MB per file
              </p>
            </div>
          )}
        </div>

        {/* Processing Queue */}
        {images.length > 0 && (
          <div className="mt-16 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Processing Queue
              </h2>
              <Button
                variant="outline"
                onClick={() => setImages([])}
                className="text-gray-500 hover:text-red-600"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-4">
              {images.map((image) => (
                <div key={image.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-6">
                    {/* Image Preview */}
                    <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {image.originalUrl && (
                        <img
                          src={image.originalUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {image.status === 'processing' && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {image.originalFile.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {(image.originalFile.size / 1024 / 1024).toFixed(1)} MB • 
                        {image.originalFile.type.split('/')[1].toUpperCase()}
                      </p>
                      
                      {image.status === 'processing' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Processing...</span>
                            <span className="text-gray-600">{image.progress}%</span>
                          </div>
                          <Progress value={image.progress} className="h-2" />
                        </div>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-3">
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
                        {image.status === 'idle' && <Play className="w-3 h-3" />}
                        {image.status}
                      </Badge>
                      
                      {image.status === 'idle' && (
                        <>
                          <Button 
                            onClick={() => removeBackgroundFromImage(image.id)}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Remove BG
                          </Button>
                          <Button
                            onClick={() => openAdvancedEditor(image)}
                            variant="outline"
                            className="border-2 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Advanced Edit
                          </Button>
                        </>
                      )}
                      
                      {image.status === 'completed' && image.processedUrl && (
                        <Button
                          onClick={() => downloadImage(
                            image.processedUrl!,
                            `bg-removed-${image.originalFile.name}`
                          )}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                      
                      {image.status === 'error' && (
                        <>
                          <Button 
                            onClick={() => removeBackgroundFromImage(image.id)}
                            disabled={isProcessing}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Retry
                          </Button>
                          <Button
                            onClick={() => openAdvancedEditor(image)}
                            disabled={isProcessing}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Advanced Edit
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(image.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Result Preview */}
                  {image.processedUrl && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-500" />
                          Processed Result
                        </div>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <Button
                          onClick={() => openAdvancedEditor(image)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Advanced Edit
                        </Button>
                      </div>
                      
                      <div className="mt-4 w-32 h-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjEwIiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNGOUZBRkIiLz4KPHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI0Y5RkFGQiIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI0YzRjRGNiIvPgo8L3N2Zz4K')] bg-repeat rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={image.processedUrl}
                          alt="Processed"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Grid */}
        {images.length === 0 && (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-600">
                Remove backgrounds in seconds with our advanced AI technology
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Professional Quality
              </h3>
              <p className="text-gray-600">
                Get pixel-perfect results that rival expensive desktop software
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Multiple Formats
              </h3>
              <p className="text-gray-600">
                Support for PNG, JPG, JPEG, and WebP with transparent outputs
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}