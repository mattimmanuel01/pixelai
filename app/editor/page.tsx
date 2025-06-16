'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AdvancedImageEditor from '@/components/advanced-image-editor'

function EditorContent() {
  const searchParams = useSearchParams()
  const imageUrl = searchParams.get('image')

  if (!imageUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">No Image Selected</h1>
          <p className="text-gray-600">Please go back and select an image to edit.</p>
        </div>
      </div>
    )
  }

  return <AdvancedImageEditor imageUrl={imageUrl} />
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}