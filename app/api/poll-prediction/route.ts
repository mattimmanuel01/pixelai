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

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Missing prediction ID' },
        { status: 400 }
      )
    }

    const prediction = await replicate.predictions.get(predictionId)

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
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