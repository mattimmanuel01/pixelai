'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function SimpleUploader() {
  const [images, setImages] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎨 AI Image Editor
          </h1>
          <p className="text-gray-600 text-lg">
            Remove backgrounds and enhance images with AI
          </p>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-4 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="text-6xl mb-4">📸</div>
          {isDragActive ? (
            <p className="text-xl font-semibold text-blue-600">
              Drop your images here!
            </p>
          ) : (
            <div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Drag & drop images here, or click to select
              </p>
              <p className="text-gray-500">
                Supports PNG, JPG, JPEG, WebP formats
              </p>
            </div>
          )}
        </div>

        {/* Image Preview */}
        {images.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Uploaded Images ({images.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((file, index) => (
                <div key={index} className="bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <p className="text-sm text-gray-600 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <button className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors">
                    Process
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
            🎭 Remove Background
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
            ✨ AI Enhance
          </button>
        </div>
      </div>
    </div>
  )
}