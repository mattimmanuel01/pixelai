'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Sparkles, Zap, Expand, X } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: 'upscale' | 'expand'
  isAuthenticated: boolean
}

export default function UpgradeModal({ isOpen, onClose, feature, isAuthenticated }: UpgradeModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const featureConfig = {
    upscale: {
      title: 'AI Upscaler',
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      description: 'Enhance image quality and resolution using advanced AI',
      benefits: [
        'Increase resolution up to 4x',
        'Restore old and blurry photos',
        'Preserve fine details and textures',
        'Professional quality results'
      ]
    },
    expand: {
      title: 'Generative Expand',
      icon: <Expand className="w-6 h-6 text-purple-500" />,
      description: 'Expand your images beyond their borders with AI-generated content',
      benefits: [
        'Perfect for social media ratios',
        'Seamless background extension',
        'Custom aspect ratio control',
        'Photorealistic AI generation'
      ]
    }
  }

  const config = featureConfig[feature]

  const handleUpgrade = async () => {
    setLoading(true)
    
    if (!isAuthenticated) {
      // Redirect to signup with feature context
      router.push(`/signup?feature=${feature}`)
    } else {
      // Show upgrade message - payment integration not implemented
      alert('Upgrade functionality coming soon! Payment integration will be added in the next update.')
      setLoading(false)
      onClose()
    }
  }

  const handleSignIn = () => {
    router.push(`/login?feature=${feature}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white shadow-2xl border-0" showCloseButton={false}>
        <DialogHeader className="space-y-0 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">{config.title}</DialogTitle>
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs mt-1">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro Feature
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-600 text-base mt-4">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">What you'll get:</h4>
            <ul className="space-y-3 mb-6">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Pro Plan Benefits</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  50 AI upscales/month
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  50 expansions/month
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  Priority processing
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  Advanced features
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-900">
                  $9<span className="text-base font-normal text-gray-600">/month</span>
                </span>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Save 25% vs pay-per-use
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {!isAuthenticated ? (
            <>
              <Button 
                onClick={handleUpgrade} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium h-12" 
                disabled={loading}
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading ? 'Redirecting...' : 'Sign Up for Pro'}
              </Button>
              <Button variant="outline" onClick={handleSignIn} className="w-full h-11">
                Already have an account? Sign In
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleUpgrade} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium h-12" 
                disabled={loading}
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading ? 'Redirecting...' : 'Upgrade to Pro'}
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-11">
                Maybe Later
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}