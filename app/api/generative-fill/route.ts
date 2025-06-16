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

    const { image, mask, prompt } = await request.json()

    if (!image || !mask || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: image, mask, and prompt' },
        { status: 400 }
      )
    }

    const output = await replicate.run(
      "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
      {
        input: {
          image: image,
          mask: mask,
          prompt: prompt,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          num_outputs: 1,
          scheduler: "K_EULER_ANCESTRAL"
        }
      }
    )

    return NextResponse.json({ output })
  } catch (error) {
    console.error('Generative fill error:', error)
    return NextResponse.json(
      { error: 'Failed to process generative fill request' },
      { status: 500 }
    )
  }
}