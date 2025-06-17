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
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Check user subscription and quota
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify Pro subscription
    if (userProfile.subscription_tier !== "pro") {
      return NextResponse.json(
        { error: "Pro subscription required for AI upscaling" },
        { status: 403 }
      );
    }

    // Check quota
    if (userProfile.upscale_used >= userProfile.upscale_quota) {
      return NextResponse.json(
        {
          error:
            "AI upscaling quota exceeded. Upgrade your plan for more credits.",
        },
        { status: 403 }
      );
    }

    const requestBody = await request.json();
    console.log("Upscaler API - received keys:", Object.keys(requestBody));

    const { image_url } = requestBody;

    if (!image_url) {
      console.log("Upscaler API - missing image_url");
      return NextResponse.json(
        { error: "Missing required field: image_url" },
        { status: 400 }
      );
    }

    console.log("Using original image URL for upscaling:", image_url);

    // Create a prediction for upscaling using Real-ESRGAN
    console.log("Creating upscaler prediction with input:", {
      image: image_url,
      scale: 4,
      face_enhance: false,
    });

    const prediction = await replicate.predictions.create({
      model: "nightmareai/real-esrgan",
      version:
        "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      input: {
        image: image_url,
        scale: 4,
        face_enhance: false,
      },
    });

    console.log("Upscaler prediction created:", {
      id: prediction.id,
      status: prediction.status,
      created_at: prediction.created_at,
    });

    // Increment usage quota - using direct database call since this is server-side
    await supabase
      .from("users")
      .update({ upscale_used: userProfile.upscale_used + 1 })
      .eq("id", user.id);

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
