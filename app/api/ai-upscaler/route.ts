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

    const requestBody = await request.json();
    console.log("Upscaler API - received keys:", Object.keys(requestBody));

    const { image_data } = requestBody;

    if (!image_data) {
      console.log("Upscaler API - missing image_data");
      return NextResponse.json(
        { error: "Missing required field: image_data" },
        { status: 400 }
      );
    }

    // First, upload the image to Supabase Storage
    console.log("Uploading image to Supabase Storage for upscaling...");
    const uploadResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/upload-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: image_data,
          filename: "upscale-input.png",
        }),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload failed:", errorText);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    const { publicUrl } = await uploadResponse.json();
    console.log("Image uploaded successfully for upscaling:", publicUrl);

    // Create a prediction for upscaling using SwinIR
    const prediction = await replicate.predictions.create({
      version:
        "660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a",
      input: {
        image: publicUrl,
        jpeg: 40,
        noise: 15,
        task_type: "Real-World Image Super-Resolution-Large",
      },
    });

    console.log("Upscaler prediction created:", prediction.id);

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error("Image upscaler error:", error);
    return NextResponse.json(
      { error: "Failed to process image upscaling request" },
      { status: 500 }
    );
  }
}
