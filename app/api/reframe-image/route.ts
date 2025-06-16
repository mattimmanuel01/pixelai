import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      )
    }

    const { image_data, aspect_ratio, prompt } = await request.json()

    if (!image_data || !aspect_ratio) {
      return NextResponse.json(
        { error: 'Missing required fields: image_data and aspect_ratio' },
        { status: 400 }
      )
    }

    // First, upload the image to Supabase Storage
    console.log('Uploading image to Supabase Storage...')
    const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: image_data,
        filename: 'temp-image.png'
      }),
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Upload failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    const { publicUrl } = await uploadResponse.json()
    console.log('Image uploaded successfully:', publicUrl)

    // Get the latest version of the model first
    const model = await replicate.models.get("luma", "reframe-image")
    const latestVersion = model.latest_version.id

    // Create a prediction with the public URL
    const prediction = await replicate.predictions.create({
      version: latestVersion,
      input: {
        image_url: publicUrl,  // Use public URL from Supabase Storage
        aspect_ratio: aspect_ratio,
        prompt: prompt || "high quality, professional, detailed"
      }
    })

    return NextResponse.json({ 
      predictionId: prediction.id,
      status: prediction.status 
    })
  } catch (error) {
    console.error('Image reframe error:', error)
    return NextResponse.json(
      { error: 'Failed to process image reframe request' },
      { status: 500 }
    )
  }
}