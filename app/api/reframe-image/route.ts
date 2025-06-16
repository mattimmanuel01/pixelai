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
        { error: "Pro subscription required for image expansion" },
        { status: 403 }
      );
    }

    // Check quota
    if (userProfile.expand_used >= userProfile.expand_quota) {
      return NextResponse.json(
        { error: "Image expansion quota exceeded. Upgrade your plan for more credits." },
        { status: 403 }
      );
    }

    const requestBody = await request.json();
    console.log("Received request body keys:", Object.keys(requestBody));
    console.log("image_data present:", !!requestBody.image_data);
    console.log("aspect_ratio present:", !!requestBody.aspect_ratio);
    console.log("image_data length:", requestBody.image_data?.length || 0);

    const { image_data, aspect_ratio, prompt } = requestBody;

    if (!image_data || !aspect_ratio) {
      console.log(
        "Missing fields - image_data:",
        !!image_data,
        "aspect_ratio:",
        !!aspect_ratio
      );
      return NextResponse.json(
        { error: "Missing required fields: image_data and aspect_ratio" },
        { status: 400 }
      );
    }

    // Upload the image directly to Supabase Storage
    console.log("Uploading image to Supabase Storage...");

    // Convert base64 to buffer
    const base64Data = image_data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename with timestamp
    const uniqueFilename = `${Date.now()}-temp-image.png`;
    console.log("Uploading to Supabase with filename:", uniqueFilename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("temp-images")
      .upload(uniqueFilename, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json(
        { error: `Failed to upload image: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Upload successful:", data);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("temp-images").getPublicUrl(data.path);
    
    console.log("Image uploaded successfully:", publicUrl);

    // Get the latest version of the model first
    const model = await replicate.models.get("luma", "reframe-image");
    const latestVersion = model.latest_version.id;

    // Create a prediction with the public URL
    const prediction = await replicate.predictions.create({
      version: latestVersion,
      input: {
        image_url: publicUrl, // Use public URL from Supabase Storage
        aspect_ratio: aspect_ratio,
        prompt: prompt || "high quality, professional, detailed",
      },
    });

    // Increment usage quota - using direct database call since this is server-side
    await supabase
      .from('users')
      .update({ expand_used: userProfile.expand_used + 1 })
      .eq('id', user.id);

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error("Image reframe error:", error);
    return NextResponse.json(
      { error: "Failed to process image reframe request" },
      { status: 500 }
    );
  }
}
