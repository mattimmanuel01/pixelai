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

    // Get the latest version of the model first
    const model = await replicate.models.get("luma", "reframe-image")
    const latestVersion = model.latest_version.id

    // Create a prediction instead of waiting for completion
    // Pass the base64 data directly as 'image' parameter instead of 'image_url'
    const prediction = await replicate.predictions.create({
      version: latestVersion,
      input: {
        image: image_data,  // Use 'image' for base64 data
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