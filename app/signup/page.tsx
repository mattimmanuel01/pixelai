import { Suspense } from 'react'
import { Sparkles } from 'lucide-react'
import SignupContent from './signup-content'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}