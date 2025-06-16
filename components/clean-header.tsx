'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Crown, User } from 'lucide-react'

export default function CleanHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">
              PixelAI
            </span>
          </div>
          <Badge variant="secondary" className="hidden sm:flex bg-blue-50 text-blue-700 border-blue-200 px-2 py-1 text-xs">
            Beta
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Pricing
          </a>
          <a href="#docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            API
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <Crown className="w-3 h-3" />
              Free Plan
            </Badge>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              5/10 images
            </span>
          </div>
          
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
            <User className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        </div>
      </div>
    </header>
  )
}