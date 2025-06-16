import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

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

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
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