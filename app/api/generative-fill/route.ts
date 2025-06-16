import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    const { image, mask, prompt } = await request.json();

    if (!image || !mask || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: image, mask, and prompt" },
        { status: 400 }
      );
    }

    // Create a prediction instead of waiting for completion
    const prediction = await replicate.predictions.create({
      version:
        "e5a34f913de0adc560d20e002c45ad43a80031b62caacc3d84010c6b6a64870c",
      input: {
        image: image,
        mask: mask,
        prompt: prompt,
        num_outputs: 1,
        guidance_scale: 7.5,
        prompt_strength: 0.8,
        num_inference_steps: 25,
      },
    });

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.log("Generative fill error:", error);
    return NextResponse.json(
      { error: "Failed to process generative fill request" },
      { status: 500 }
    );
  }
}
