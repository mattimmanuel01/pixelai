import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

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

    // Check user subscription and quota
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify Pro subscription
    if (userProfile.subscription_tier !== 'pro') {
      return NextResponse.json(
        { error: "Pro subscription required for AI upscaling" },
        { status: 403 }
      );
    }

    // Check quota
    if (userProfile.upscale_used >= userProfile.upscale_quota) {
      return NextResponse.json(
        { error: "AI upscaling quota exceeded. Upgrade your plan for more credits." },
        { status: 403 }
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

    // Increment usage quota - using direct database call since this is server-side
    await supabase
      .from('users')
      .update({ upscale_used: userProfile.upscale_used + 1 })
      .eq('id', user.id);

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
