'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import AdvancedImageEditor from '@/components/advanced-image-editor'

function EditorContent() {
  const searchParams = useSearchParams()
  const imageUrl = searchParams.get('image')
  const imageKey = searchParams.get('imageKey')
  const hasFile = searchParams.get('hasFile')
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (imageUrl) {
          // Direct image URL (decode if it was encoded)
          const decodedUrl = decodeURIComponent(imageUrl)
          
          // Check if it's a blob URL - these don't work across page navigation
          if (decodedUrl.startsWith('blob:')) {
            console.log('Blob URL detected, cannot load across pages:', decodedUrl)
            setError('Image not available. Please try uploading again from the main page.')
          } else {
            setBase64Image(decodedUrl)
          }
        } else if (hasFile && typeof window !== 'undefined') {
          // Get from global window object
          const file = (window as any).editorImageFile
          if (file && file instanceof File) {
            console.log('Found file:', file.name, file.size)
            // Convert file to base64
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = reader.result as string
              console.log('Converted to base64, length:', base64.length)
              setBase64Image(base64)
              // Clean up global reference
              delete (window as any).editorImageFile
              setLoading(false)
            }
            reader.onerror = (err) => {
              console.error('FileReader error:', err)
              setError('Failed to read image file')
              setLoading(false)
            }
            reader.readAsDataURL(file)
            return // Exit early since we're handling loading state in the reader callbacks
          } else {
            console.log('No file found in global scope (likely page refresh)')
            setError('Image session expired. Please go back and select an image again.')
          }
        } else if (imageKey) {
          // Get from localStorage (fallback)
          if (typeof window !== 'undefined') {
            console.log('Looking for image with key:', imageKey)
            const storedImage = localStorage.getItem(imageKey)
            if (storedImage) {
              console.log('Found stored image, length:', storedImage.length)
              setBase64Image(storedImage)
              // Clean up localStorage
              localStorage.removeItem(imageKey)
              console.log('Cleaned up stored image')
            } else {
              console.log('No image found in localStorage for key:', imageKey)
              setError('Image data not found. Please try uploading again.')
            }
          }
        } else {
          setError('No image provided. Please upload an image from the main page.')
        }
      } catch (err) {
        console.error('Error loading image:', err)
        setError('Failed to load image')
      } finally {
        // Always set loading to false after attempting to load
        setLoading(false)
      }
    }

    // Add a small delay to ensure the page is fully loaded
    const timer = setTimeout(() => {
      loadImage()
    }, 100)

    return () => clearTimeout(timer)
  }, [imageUrl, imageKey, hasFile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading image...</p>
        </div>
      </div>
    )
  }

  if (error || !base64Image) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || 'No Image Selected'}
          </h1>
          <p className="text-gray-600 mb-4">
            Please go back and select an image to edit.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <AdvancedImageEditor imageUrl={base64Image} />
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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