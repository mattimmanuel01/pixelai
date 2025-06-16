import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function GET(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get('id')
    const convertToBase64 = searchParams.get('convertToBase64') === 'true'

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Missing prediction ID' },
        { status: 400 }
      )
    }

    const prediction = await replicate.predictions.get(predictionId)

    let processedOutput = prediction.output

    // Convert to base64 if requested and prediction succeeded
    if (convertToBase64 && prediction.status === 'succeeded' && prediction.output) {
      try {
        console.log("Converting upscaler result to base64")
        const imageResponse = await fetch(prediction.output as string)
        if (imageResponse.ok) {
          const buffer = await imageResponse.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
          processedOutput = `data:${mimeType};base64,${base64}`
        } else {
          throw new Error("Failed to fetch result image")
        }
      } catch (error) {
        console.error("Error converting to base64:", error)
        return NextResponse.json({
          id: prediction.id,
          status: 'failed',
          error: 'Failed to convert result to base64',
          logs: prediction.logs
        })
      }
    }

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: processedOutput,
      error: prediction.error,
      logs: prediction.logs
    })
  } catch (error) {
    console.error('Polling error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prediction status' },
      { status: 500 }
    )
  }
}