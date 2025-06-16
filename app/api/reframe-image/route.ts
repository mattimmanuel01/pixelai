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

    const { image, aspect_ratio, prompt } = await request.json()

    if (!image || !aspect_ratio) {
      return NextResponse.json(
        { error: 'Missing required fields: image and aspect_ratio' },
        { status: 400 }
      )
    }

    const output = await replicate.run(
      "luma/reframe-image:1b85b1c4d01e2c11f2d7b6a1c985bd8b6bb26bd8e4fd0d21a9c00f8a8ebd2a7d",
      {
        input: {
          image: image,
          aspect_ratio: aspect_ratio,
          prompt: prompt || "high quality, professional, detailed"
        }
      }
    )

    return NextResponse.json({ output })
  } catch (error) {
    console.error('Image reframe error:', error)
    return NextResponse.json(
      { error: 'Failed to process image reframe request' },
      { status: 500 }
    )
  }
}