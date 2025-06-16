import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { imageData, filename } = await request.json()

    if (!imageData || !filename) {
      return NextResponse.json(
        { error: 'Missing imageData or filename' },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename with timestamp
    const uniqueFilename = `${Date.now()}-${filename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('temp-images')
      .upload(uniqueFilename, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('temp-images')
      .getPublicUrl(data.path)

    return NextResponse.json({ 
      publicUrl,
      path: data.path
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}