'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Download, 
  Zap, 
  Expand, 
  ImageIcon, 
  Calendar,
  TrendingUp,
  Users,
  Crown
} from 'lucide-react'
import { getUserImages, UserImage } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const [userImages, setUserImages] = useState<UserImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (loading) return
    
    // Redirect to login if no user
    if (!user) {
      router.push('/login')
      return
    }

    // Load images when we have user and profile
    if (userProfile) {
      loadUserImages()
    }
  }, [user, userProfile, loading, router])

  const loadUserImages = async () => {
    if (!user) return
    
    try {
      const { data, error } = await getUserImages(user.id)
      if (error) {
        console.error('Error loading user images:', error)
      } else {
        setUserImages(data || [])
      }
    } catch (error) {
      console.error('Error loading user images:', error)
    } finally {
      setLoadingImages(false)
    }
  }

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

  if (!user || !userProfile) {
    return null
  }

  const upscalePercentage = userProfile.upscale_quota > 0 
    ? (userProfile.upscale_used / userProfile.upscale_quota) * 100 
    : 0
  
  const expandPercentage = userProfile.expand_quota > 0 
    ? (userProfile.expand_used / userProfile.expand_quota) * 100 
    : 0

  const totalOperations = userImages.length
  const recentImages = userImages.slice(0, 6)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile.email.split('@')[0]}!
          </h1>
          <p className="text-gray-600">
            Manage your AI image projects and track your usage
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Subscription Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Plan</CardTitle>
                <Crown className={`w-4 h-4 ${
                  userProfile.subscription_tier === 'pro' ? 'text-yellow-500' : 'text-gray-400'
                }`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={userProfile.subscription_tier === 'pro' ? 'default' : 'outline'}
                  className={userProfile.subscription_tier === 'pro' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : ''
                  }
                >
                  {userProfile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                </Badge>
                {userProfile.subscription_tier === 'free' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => router.push('/#pricing')}
                    className="text-xs"
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Operations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Projects</CardTitle>
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalOperations}</div>
              <p className="text-xs text-gray-500">All time</p>
            </CardContent>
          </Card>

          {/* AI Upscales Used */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">AI Upscales</CardTitle>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {userProfile.upscale_used}
                {userProfile.subscription_tier === 'pro' && (
                  <span className="text-sm font-normal text-gray-500">/{userProfile.upscale_quota}</span>
                )}
              </div>
              {userProfile.subscription_tier === 'pro' && userProfile.upscale_quota > 0 && (
                <div className="mt-2">
                  <Progress value={upscalePercentage} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{Math.round(upscalePercentage)}% used</p>
                </div>
              )}
              {userProfile.subscription_tier === 'free' && (
                <p className="text-xs text-purple-600">Upgrade for 50/month</p>
              )}
            </CardContent>
          </Card>

          {/* Generative Expansions Used */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Expansions</CardTitle>
                <Expand className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {userProfile.expand_used}
                {userProfile.subscription_tier === 'pro' && (
                  <span className="text-sm font-normal text-gray-500">/{userProfile.expand_quota}</span>
                )}
              </div>
              {userProfile.subscription_tier === 'pro' && userProfile.expand_quota > 0 && (
                <div className="mt-2">
                  <Progress value={expandPercentage} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{Math.round(expandPercentage)}% used</p>
                </div>
              )}
              {userProfile.subscription_tier === 'free' && (
                <p className="text-xs text-purple-600">Upgrade for 50/month</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/')}>
              <CardContent className="p-6 text-center">
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Upload & Edit</h3>
                <p className="text-sm text-gray-600">Start a new image editing project</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/#pricing')}>
              <CardContent className="p-6 text-center">
                <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Upgrade Plan</h3>
                <p className="text-sm text-gray-600">Unlock AI upscaling and expansion</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Download className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Download All</h3>
                <p className="text-sm text-gray-600">Export your recent projects</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Images */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            {totalOperations > 6 && (
              <Button variant="outline" size="sm">
                View All ({totalOperations})
              </Button>
            )}
          </div>
          
          {loadingImages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentImages.map((image) => (
                <Card key={image.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 relative">
                    {image.processed_url || image.original_url ? (
                      <img
                        src={image.processed_url || image.original_url}
                        alt={image.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {image.operation_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 truncate mb-1">
                      {image.file_name}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{(image.file_size / 1024 / 1024).toFixed(1)} MB</span>
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-6">Start by uploading your first image</p>
                <Button onClick={() => router.push('/')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}