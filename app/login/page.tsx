'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, ArrowLeft, Sparkles, Eye, EyeOff, Mail, Lock, Zap, Expand } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feature, setFeature] = useState<string | null>(null)

  useEffect(() => {
    const featureParam = searchParams.get('feature')
    setFeature(featureParam)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Redirect based on context
      if (feature) {
        router.back() // Go back to the editor where they were trying to use Pro features
      } else {
        router.push('/dashboard')
      }
    }
  }

  const getFeatureInfo = () => {
    if (feature === 'upscale') {
      return {
        icon: <Zap className="w-5 h-5 text-blue-500" />,
        title: 'AI Upscaler',
        description: 'Sign in to enhance your images with AI upscaling'
      }
    } else if (feature === 'expand') {
      return {
        icon: <Expand className="w-5 h-5 text-purple-500" />,
        title: 'Generative Expand', 
        description: 'Sign in to expand your images with AI generation'
      }
    }
    return null
  }

  const featureInfo = getFeatureInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">PixelAI</span>
          </div>
          
          {featureInfo ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                {featureInfo.icon}
                <div>
                  <h3 className="font-semibold text-lg">{featureInfo.title}</h3>
                  <p className="text-blue-100">{featureInfo.description}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-bold leading-tight">
                  Ready to unlock<br />professional AI features?
                </h2>
                <p className="text-blue-100 text-lg">
                  Join thousands of creators using PixelAI to enhance their visual content with cutting-edge AI technology.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">
                Welcome back to<br />PixelAI
              </h2>
              <p className="text-blue-100 text-lg">
                Continue your creative journey with our professional AI image suite.
              </p>
            </div>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-8 text-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">50K+</div>
            <div className="text-sm">Images Enhanced</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">10K+</div>
            <div className="text-sm">Happy Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">99.9%</div>
            <div className="text-sm">Uptime</div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              PixelAI
            </div>
            {featureInfo && (
              <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                {featureInfo.icon}
                <span className="text-sm text-gray-600">{featureInfo.description}</span>
              </div>
            )}
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {featureInfo ? 'Sign in to continue' : 'Welcome back'}
            </h1>
            <p className="text-gray-600">
              {featureInfo ? 'Access your Pro features' : 'Enter your credentials to access your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link 
                  href={`/signup${feature ? `?feature=${feature}` : ''}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </form>

          <div className="text-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}