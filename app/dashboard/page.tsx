'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Download, 
  Zap, 
  Expand, 
  ImageIcon, 
  Crown,
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  Search,
  Grid3X3,
  List,
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  X
} from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'
import { getUserImages, UserImage, saveUserImage, deleteUserImage } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import UpgradeModal from '@/components/modals/UpgradeModal'

interface ProcessingImage {
  id: string
  file: File
  originalUrl: string
  processedUrl?: string
  status: 'uploaded' | 'processing' | 'completed' | 'error'
  progress: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const [userImages, setUserImages] = useState<UserImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [processingImages, setProcessingImages] = useState<ProcessingImage[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'background_removal' | 'ai_upscale' | 'generative_expand'>('all')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const loadUserImages = useCallback(async () => {
    console.log('loadUserImages called, user:', !!user)
    
    if (!user) {
      setLoadingImages(false)
      return
    }
    
    setLoadingImages(true)
    
    try {
      console.log('Fetching user images')
      const result = await getUserImages()
      
      if (result.error) {
        console.error('Error loading user images:', result.error)
        // If API error, just show empty state
        setUserImages([])
      } else {
        console.log('Loaded user images:', result.data?.length || 0, 'images')
        setUserImages(result.data || [])
      }
    } catch (error) {
      console.error('Error loading user images:', error)
      // Gracefully handle any errors by showing empty state
      setUserImages([])
    } finally {
      console.log('Setting loadingImages to false')
      setLoadingImages(false)
    }
  }, [user])

  useEffect(() => {
    console.log('Dashboard useEffect:', { loading, user: !!user, userProfile: !!userProfile })
    
    if (loading) return
    
    if (!user) {
      router.push('/login')
      return
    }

    if (userProfile) {
      loadUserImages()
    } else {
      console.log('No userProfile, setting loadingImages to false')  
      setLoadingImages(false)
    }
  }, [user, userProfile, loading, router, loadUserImages])

  // Auto-retry loading userProfile if we have a user but no profile after loading
  useEffect(() => {
    if (!loading && user && !userProfile) {
      console.log('User exists but no profile loaded, refreshing auth state...')
      const timeoutId = setTimeout(() => {
        // Force a refresh of the auth state
        window.location.reload()
      }, 2000) // Wait 2 seconds before auto-refreshing - reduced from 3
      
      return () => clearTimeout(timeoutId)
    }
  }, [loading, user, userProfile])

  // Separate timeout effect to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('Timeout fallback: setting loadingImages to false')
      setLoadingImages(false)
    }, 8000) // 8 seconds timeout - reduced from 15

    return () => clearTimeout(timeoutId)
  }, [])

  const processBackgroundRemoval = useCallback(async (imageId: string) => {
    const image = processingImages.find(img => img.id === imageId)
    if (!image) return

    // Immediately set to processing state
    setProcessingImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, status: 'processing', progress: 10 }
          : img
      )
    )

    try {
      // Start progress animation immediately
      const progressInterval = setInterval(() => {
        setProcessingImages(prev => 
          prev.map(img => 
            img.id === imageId && img.progress < 70
              ? { ...img, progress: img.progress + 5 }
              : img
          )
        )
      }, 200)

      // Remove background
      const blob = await removeBackground(image.file)
      
      // Update progress to 90%
      setProcessingImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, progress: 90 }
            : img
        )
      )

      // Convert blob to base64 for upload
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const base64Data = await base64Promise

      // Upload processed image to Supabase storage
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data,
          filename: `processed-${image.file.name}`,
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload processed image')
      }

      const { publicUrl: processedUrl } = await uploadResponse.json()

      // Also upload original image if not already uploaded
      let originalUrl = image.originalUrl
      if (originalUrl.startsWith('blob:')) {
        const originalBase64Promise = new Promise<string>((resolve, reject) => {
          const origReader = new FileReader()
          origReader.onload = () => resolve(origReader.result as string)
          origReader.onerror = reject
          origReader.readAsDataURL(image.file)
        })

        const originalBase64 = await originalBase64Promise
        
        const originalUploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: originalBase64,
            filename: `original-${image.file.name}`,
          }),
        })

        if (originalUploadResponse.ok) {
          const { publicUrl } = await originalUploadResponse.json()
          originalUrl = publicUrl
        }
      }

      clearInterval(progressInterval)

      setProcessingImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, processedUrl, status: 'completed', progress: 100 }
            : img
        )
      )

      if (user) {
        await saveUserImage({
          original_url: originalUrl,
          processed_url: processedUrl,
          operation_type: 'background_removal',
          file_name: image.file.name,
          file_size: image.file.size
        })
        loadUserImages()
      }
    } catch (error) {
      console.error('Background removal failed:', error)
      setProcessingImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, status: 'error', progress: 0 }
            : img
        )
      )
    }
  }, [processingImages, user, loadUserImages])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newProcessingImages: ProcessingImage[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'uploaded',
      progress: 0
    }))
    
    setProcessingImages(prev => [...prev, ...newProcessingImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true,
    disabled: !user
  })

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `processed-${filename}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openInEditor = (imageUrl: string, file?: File) => {
    if (file) {
      // Store the file in global window object for editor access
      (window as Window & { editorImageFile?: File }).editorImageFile = file
      router.push('/editor?hasFile=true')
    } else {
      router.push(`/editor?image=${encodeURIComponent(imageUrl)}`)
    }
  }

  const removeUploadedImage = (imageId: string) => {
    setProcessingImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!user || !confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return
    }

    try {
      const result = await deleteUserImage(imageId)
      if (result.error) {
        console.error('Error deleting image:', result.error)
        alert('Failed to delete image. Please try again.')
      } else {
        // Refresh the images list
        loadUserImages()
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  const filteredImages = userImages.filter(image => {
    const matchesSearch = image.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || image.operation_type === filterType
    return matchesSearch && matchesFilter
  })

  const upscalePercentage = userProfile?.upscale_quota && userProfile.upscale_quota > 0 
    ? (userProfile.upscale_used / userProfile.upscale_quota) * 100 
    : 0
  
  const expandPercentage = userProfile?.expand_quota && userProfile.expand_quota > 0 
    ? (userProfile.expand_used / userProfile.expand_quota) * 100 
    : 0

  const totalOperations = userImages.length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // If user exists but no userProfile after loading is complete, show error state
  if (!loading && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-yellow-100 rounded-full w-fit mx-auto mb-4">
            <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading your profile...
          </h3>
          <p className="text-gray-600 mb-6">
            Refreshing your profile data. This page will reload automatically in a moment.
          </p>
          <Button onClick={() => window.location.reload()}>
            <Upload className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {userProfile.email.split('@')[0]}!
              </h1>
              <p className="text-gray-600">
                Manage your AI image projects and track your usage
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                variant="outline"
                className="hidden md:flex"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Plan</span>
                <Crown className={`w-4 h-4 ${
                  userProfile.subscription_tier === 'pro' ? 'text-yellow-500' : 'text-gray-400'
                }`} />
              </div>
              <Badge 
                variant={userProfile.subscription_tier === 'pro' ? 'default' : 'outline'}
                className={userProfile.subscription_tier === 'pro' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : ''
                }
              >
                {userProfile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Projects</span>
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalOperations}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Upscales</span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {userProfile.upscale_used}
                {userProfile.subscription_tier === 'pro' && (
                  <span className="text-sm font-normal text-gray-500">/{userProfile.upscale_quota}</span>
                )}
              </div>
              {userProfile.subscription_tier === 'pro' && userProfile.upscale_quota > 0 && (
                <Progress value={upscalePercentage} className="h-1.5 mt-2" />
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Expansions</span>
                <Expand className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {userProfile.expand_used}
                {userProfile.subscription_tier === 'pro' && (
                  <span className="text-sm font-normal text-gray-500">/{userProfile.expand_quota}</span>
                )}
              </div>
              {userProfile.subscription_tier === 'pro' && userProfile.expand_quota > 0 && (
                <Progress value={expandPercentage} className="h-1.5 mt-2" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-white/20">
          <CardContent className="p-8">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop images here' : 'Upload images to get started'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drag & drop your images here, or click to browse
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">JPEG</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">WEBP</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {processingImages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {processingImages.some(img => img.status === 'processing') ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Images
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Choose Action for Uploaded Images
                </>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processingImages.map((image) => (
                <Card key={image.id} className="bg-white/70 backdrop-blur-sm border-white/20">
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={image.originalUrl}
                      alt="Processing"
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                    {image.status === 'uploaded' && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-t-lg">
                        <Button
                          onClick={() => removeUploadedImage(image.id)}
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <div className="text-center">
                          <h3 className="text-white text-lg font-semibold mb-4">Choose Action</h3>
                          <div className="flex flex-col gap-3">
                            <Button 
                              onClick={() => processBackgroundRemoval(image.id)}
                              disabled={image.status === 'processing'}
                              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            >
                              {image.status === 'processing' ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Remove Background
                                </>
                              )}
                            </Button>
                            <Button 
                              onClick={() => openInEditor(image.originalUrl, image.file)}
                              variant="outline"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Advanced Editor
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    {image.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                          <div className="text-white text-sm font-medium">{image.progress}%</div>
                        </div>
                      </div>
                    )}
                    {image.status === 'completed' && (
                      <div className="absolute top-2 right-2">
                        <div className="p-1 bg-green-500 rounded-full">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    {image.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-t-lg">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {image.file.name}
                      </span>
                      {image.status === 'completed' && image.processedUrl && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadImage(image.processedUrl!, image.file.name)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {image.status === 'processing' && (
                      <Progress value={image.progress} className="mt-2 h-1.5" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType('all')}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('background_removal')}>Background Removal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('ai_upscale')}>AI Upscale</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('generative_expand')}>Generative Expand</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {loadingImages ? (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-white/70 backdrop-blur-sm">
                <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredImages.length > 0 ? (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredImages.map((image) => (
              <Card key={image.id} className="group overflow-hidden hover:shadow-lg transition-all bg-white/70 backdrop-blur-sm border-white/20">
                <div className={`${viewMode === 'grid' ? 'aspect-video' : 'aspect-[3/1] md:aspect-[4/1]'} bg-gray-100 relative overflow-hidden`}>
                  {image.processed_url || image.original_url ? (
                    <img
                      src={image.processed_url || image.original_url}
                      alt={image.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
                      {image.operation_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => downloadImage(image.processed_url || image.original_url, image.file_name)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteImage(image.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className={`flex ${viewMode === 'list' ? 'items-center justify-between' : 'flex-col'}`}>
                    <div className={viewMode === 'list' ? 'flex-1' : ''}>
                      <h3 className="font-medium text-gray-900 truncate mb-1">
                        {image.file_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{(image.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        <span>{new Date(image.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadImage(image.processed_url || image.original_url, image.file_name)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteImage(image.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                <Sparkles className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterType !== 'all' ? 'No matching projects' : 'Ready to create amazing images?'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Upload your first image and start editing with AI-powered tools'}
              </p>
              {!searchQuery && filterType === 'all' && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => document.querySelector('input[type="file"]')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                  {userProfile.subscription_tier === 'free' && (
                    <Button variant="outline" onClick={() => setShowUpgradeModal(true)}>
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade for AI Features
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="upscale"
        isAuthenticated={!!user}
      />
    </div>
  )
}