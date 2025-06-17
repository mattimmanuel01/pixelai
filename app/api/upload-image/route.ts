import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log("Supabase config check:", {
  url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log("Upload API - received keys:", Object.keys(requestBody));
    console.log("Upload API - full request body:", {
      imageData: requestBody.imageData ? `${requestBody.imageData.substring(0, 50)}...` : null,
      filename: requestBody.filename,
      fileName: requestBody.fileName // Check for casing issue
    });

    const { imageData, filename, fileName } = requestBody;
    const actualFilename = filename || fileName; // Handle both cases

    if (!imageData || !actualFilename) {
      console.log("Upload API - missing fields:", {
        imageData: !!imageData,
        filename: !!filename,
        fileName: !!fileName,
        actualFilename: !!actualFilename
      });
      return NextResponse.json(
        { error: "Missing imageData or filename" },
        { status: 400 }
      );
    }

    // Detect image format from data URL
    const isJpeg = imageData.startsWith("data:image/jpeg");
    const contentType = isJpeg ? "image/jpeg" : "image/png";
    
    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    console.log("Base64 data length after cleanup:", base64Data.length);
    console.log("Detected content type:", contentType);

    const buffer = Buffer.from(base64Data, "base64");
    console.log("Buffer size:", buffer.length);

    // Generate unique filename with timestamp
    const uniqueFilename = `${Date.now()}-${actualFilename}`;
    console.log("Uploading to Supabase with filename:", uniqueFilename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("temp-images")
      .upload(uniqueFilename, buffer, {
        contentType: contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
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

    return NextResponse.json({
      publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
