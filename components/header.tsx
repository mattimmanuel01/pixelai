'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Crown, User, Stars } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <Stars className="w-2 h-2 text-yellow-900" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                PixelAI
              </h1>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:flex bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            Beta
          </Badge>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              <Crown className="w-3 h-3" />
              Free Plan
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              5/10 images
            </span>
          </div>
          
          <Button variant="outline" size="sm" className="border-2 hover:bg-gray-50 dark:hover:bg-slate-800">
            <User className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          
          <Button size="sm" className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 hover:from-blue-600 hover:via-purple-600 hover:to-purple-700 text-white shadow-lg">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        </div>
      </div>
    </header>
  )
}