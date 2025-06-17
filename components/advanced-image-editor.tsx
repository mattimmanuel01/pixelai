"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  ArrowLeft,
  Expand,
  RectangleHorizontal,
  Move,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import UpgradeModal from "@/components/modals/UpgradeModal";
import { supabase, saveUserImage } from "@/lib/supabase";

interface AdvancedImageEditorProps {
  imageUrl: string;
}

// Helper function to upload base64 image to storage
const uploadImageToStorage = async (
  base64Data: string,
  fileName: string
): Promise<string | null> => {
  try {
    const response = await fetch("/api/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData: base64Data,
        filename: fileName,
      }),
    });

    if (!response.ok) {
      console.error("Failed to upload image to storage");
      return null;
    }

    const { publicUrl } = await response.json();
    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

// Helper function to get file size from base64
const getBase64FileSize = (base64: string): number => {
  const base64String = base64.split(",")[1] || base64;
  return Math.round((base64String.length * 3) / 4);
};

export default function AdvancedImageEditor({
  imageUrl,
}: AdvancedImageEditorProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  // Helper function to save processed image to database
  const saveProcessedImageToProjects = async (
    processedImageUrl: string,
    operationType: "upscale" | "expand"
  ) => {
    if (!user) return;

    try {
      let base64Data: string;
      let fileSize: number;
      
      // If it's already base64 (for expand operations), use directly
      if (processedImageUrl.startsWith("data:")) {
        base64Data = processedImageUrl;
        fileSize = getBase64FileSize(processedImageUrl);
      } else {
        // If it's a URL (for upscale operations), fetch and convert to base64
        console.log("Fetching image from URL for saving:", processedImageUrl);
        const response = await fetch(processedImageUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch processed image");
        }
        
        const blob = await response.blob();
        fileSize = blob.size;
        
        // Convert to base64 in browser environment
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binaryString);
        const mimeType = blob.type || 'image/jpeg';
        base64Data = `data:${mimeType};base64,${base64}`;
      }

      // Upload processed image to storage  
      const extension = base64Data.startsWith("data:image/jpeg") ? "jpg" : "png";
      const fileName = `processed-${operationType}-${Date.now()}.${extension}`;
      const uploadedUrl = await uploadImageToStorage(base64Data, fileName);

      if (!uploadedUrl) {
        console.error("Failed to upload processed image to storage");
        return;
      }

      // Save to database
      const imageData = {
        original_url: imageUrl,
        processed_url: uploadedUrl,
        operation_type: operationType,
        file_name: fileName,
        file_size: fileSize,
      };

      const result = await saveUserImage(imageData);

      if (result.error) {
        console.error("Failed to save image to database:", result.error);
      } else {
        console.log("Successfully saved processed image to projects");
      }
    } catch (error) {
      console.error("Error saving processed image:", error);
    }
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFeature, setActiveFeature] = useState<"upscale" | "expand">(
    "upscale"
  );
  const [expandPrompt, setExpandPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandProgress, setExpandProgress] = useState(0);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleProgress, setUpscaleProgress] = useState(0);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [expansionMode, setExpansionMode] = useState<"preset" | "freestyle">(
    "preset"
  );
  const [canvasBounds, setCanvasBounds] = useState({ width: 800, height: 600 });
  const [originalBounds, setOriginalBounds] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  const [, setIsDragging] = useState(false);
  const [, setDragHandle] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [tabHidden, setTabHidden] = useState(false);

  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"upscale" | "expand">(
    "upscale"
  );

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setOriginalImage(img);
      initializeCanvas(img);
    };
    img.onerror = () => {
      console.error("Failed to load image:", imageUrl);
    };
    img.src = imageUrl;

    return () => {
      // Cleanup image reference
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabHidden(document.hidden);
      if (document.hidden) {
        console.log("Tab became hidden - polling may be throttled");
      } else {
        console.log("Tab became visible - polling should resume normal speed");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Re-initialize canvas when switching between modes or when upscaled image changes
  useEffect(() => {
    if (activeFeature === "expand" && originalImage) {
      // Always redraw the original image when switching to expand mode
      initializeCanvas(originalImage);
    }
  }, [activeFeature, imageUrl]); // Use imageUrl instead of originalImage to avoid object reference issues

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const cursorCanvas = cursorCanvasRef.current;

    // Validate all canvas elements exist and are connected to DOM
    if (
      !canvas ||
      !maskCanvas ||
      !cursorCanvas ||
      !canvas.isConnected ||
      !maskCanvas.isConnected ||
      !cursorCanvas.isConnected
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    const cursorCtx = cursorCanvas.getContext("2d");
    if (!ctx || !maskCtx || !cursorCtx) return;

    // Set canvas dimensions to fit the container
    const containerWidth = 800;
    const containerHeight = 600;
    const ratio = Math.min(
      containerWidth / img.width,
      containerHeight / img.height
    );

    const displayWidth = img.width * ratio;
    const displayHeight = img.height * ratio;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    maskCanvas.width = displayWidth;
    maskCanvas.height = displayHeight;
    cursorCanvas.width = displayWidth;
    cursorCanvas.height = displayHeight;

    // Store original image bounds for expansion
    setOriginalBounds({
      width: displayWidth,
      height: displayHeight,
      x: 0,
      y: 0,
    });

    setCanvasBounds({
      width: displayWidth,
      height: displayHeight,
    });

    // Draw original image
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Initialize mask canvas with transparent background
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const pollForPrediction = async (
    predictionId: string,
    onProgress?: (progress: number) => void,
    queryParams?: string
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes max (2 seconds * 120 = 240 seconds)

      const poll = async () => {
        try {
          const url = `/api/poll-prediction?id=${predictionId}${
            queryParams ? `&${queryParams}` : ""
          }`;
          const headers = await getAuthHeaders();
          const response = await fetch(url, { headers });

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Unknown error" }));
            throw new Error(
              errorData.error ||
                `HTTP ${response.status}: Failed to poll prediction`
            );
          }

          const prediction = await response.json();
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `Poll attempt ${attempts + 1} at ${timestamp}:`,
            prediction.status,
            {
              id: prediction.id,
              status: prediction.status,
              created_at: prediction.created_at,
              started_at: prediction.started_at,
              logs: prediction.logs ? prediction.logs.slice(-200) : null, // Last 200 chars of logs
            }
          );

          // Update progress based on status
          if (onProgress) {
            if (prediction.status === "starting") {
              onProgress(10);
            } else if (prediction.status === "processing") {
              onProgress(Math.min(20 + attempts * 2, 85));
            }
          }

          if (prediction.status === "succeeded") {
            if (onProgress) onProgress(100);
            resolve(prediction);
          } else if (
            prediction.status === "failed" ||
            prediction.status === "canceled"
          ) {
            console.error("Prediction failed:", prediction.error);
            reject(new Error(prediction.error || "Prediction failed"));
          } else {
            // Still processing, poll again
            attempts++;

            // If stuck on "starting" for too long, show warning but continue
            if (prediction.status === "starting" && attempts > 20) {
              console.warn(
                `Prediction still starting after ${attempts} attempts. Cold start may take up to 4 minutes.`
              );
            }

            if (attempts >= maxAttempts) {
              console.error(
                `Prediction timed out after ${maxAttempts} attempts. Last status: ${prediction.status}`
              );
              reject(
                new Error(
                  `Prediction timed out. Last status: ${prediction.status}. Please try again.`
                )
              );
            } else {
              setTimeout(poll, 2000); // Poll every 2 seconds
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  };

  const pollPrediction = async (
    predictionId: string,
    onProgress?: (progress: number) => void
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes max (2 seconds * 120 = 240 seconds)

      const poll = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            `/api/poll-prediction?id=${predictionId}`,
            { headers }
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Unknown error" }));
            throw new Error(
              errorData.error ||
                `HTTP ${response.status}: Failed to poll prediction`
            );
          }

          const prediction = await response.json();
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `Poll attempt ${attempts + 1} at ${timestamp}:`,
            prediction.status,
            {
              id: prediction.id,
              status: prediction.status,
              created_at: prediction.created_at,
              started_at: prediction.started_at,
              logs: prediction.logs ? prediction.logs.slice(-200) : null, // Last 200 chars of logs
            }
          );

          // Update progress based on status
          if (onProgress) {
            if (prediction.status === "starting") {
              onProgress(10);
            } else if (prediction.status === "processing") {
              onProgress(Math.min(20 + attempts * 2, 85));
            }
          }

          if (prediction.status === "succeeded") {
            if (onProgress) onProgress(100);
            resolve(prediction);
          } else if (
            prediction.status === "failed" ||
            prediction.status === "canceled"
          ) {
            console.error("Prediction failed:", prediction.error);
            reject(new Error(prediction.error || "Prediction failed"));
          } else {
            // Still processing, poll again
            attempts++;

            // If stuck on "starting" for too long, show warning but continue
            if (prediction.status === "starting" && attempts > 20) {
              console.warn(
                `Prediction still starting after ${attempts} attempts. Cold start may take up to 4 minutes.`
              );
            }

            if (attempts >= maxAttempts) {
              console.error(
                `Prediction timed out after ${maxAttempts} attempts. Last status: ${prediction.status}`
              );
              reject(
                new Error(
                  `Prediction timed out. Last status: ${prediction.status}. Please try again.`
                )
              );
            } else {
              setTimeout(poll, 2000); // Poll every 2 seconds
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  };

  // Check if user can use Pro features
  const canUseProFeature = (feature: "upscale" | "expand") => {
    if (!user) return false;
    if (!userProfile) return false;
    if (userProfile.subscription_tier !== "pro") return false;

    const quotaField = feature === "upscale" ? "upscale_quota" : "expand_quota";
    const usedField = feature === "upscale" ? "upscale_used" : "expand_used";

    return userProfile[usedField] < userProfile[quotaField];
  };

  const handleProFeatureClick = (feature: "upscale" | "expand") => {
    if (!user || !userProfile || userProfile.subscription_tier !== "pro") {
      setUpgradeFeature(feature);
      setShowUpgradeModal(true);
      return false;
    }

    if (!canUseProFeature(feature)) {
      // Show quota exceeded modal
      alert(
        `You've reached your monthly ${feature} limit. Upgrade or wait for next month's reset.`
      );
      return false;
    }

    return true;
  };

  const processImageUpscale = async () => {
    if (!originalImage) return;

    // Check Pro access
    if (!handleProFeatureClick("upscale")) return;

    setIsUpscaling(true);
    setUpscaleProgress(0);

    try {
      // Use the original image URL directly instead of canvas
      // This preserves the original size and quality
      const originalImageUrl = imageUrl;

      console.log("Starting image upscale...");

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setUpscaleProgress((prev) => {
          if (prev >= 90) return prev; // Stop at 90% until real completion
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Start the prediction
      const headers = await getAuthHeaders();
      const response = await fetch("/api/ai-upscaler", {
        method: "POST",
        headers,
        body: JSON.stringify({
          image_url: originalImageUrl, // This is now actually a URL
        }),
      });

      console.log("Upscale response:", response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Upscale error response:", responseText);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || "Unknown error" };
        }
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to start image upscaling`
        );
      }

      const initialData = await response.json();
      console.log("Upscale prediction started:", initialData.predictionId);

      // Clear progress simulation and start polling
      clearInterval(progressInterval);

      // Poll for completion with base64 conversion
      const result = await pollForPrediction(
        initialData.predictionId,
        (progress) => {
          setUpscaleProgress(90 + (progress * 10) / 100); // Show 90-100%
        },
        `convertToBase64=true`
      );

      if (result.output) {
        setUpscaledImage(result.output);
        setUpscaleProgress(100);
        console.log("Upscaled image received as base64");
        console.log("Original bounds:", originalBounds);
        console.log("Slider position:", sliderPosition);

        // Save upscaled image to user projects if authenticated
        if (user && result.output) {
          await saveProcessedImageToProjects(result.output, "upscale");
        }
      } else {
        throw new Error("No upscaled image in response");
      }
    } catch (error) {
      console.error("Image upscaling failed:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : String(error)
      );
      alert(
        `Failed to process image upscaling: ${
          error instanceof Error ? error.message : String(error)
        }. Please try again.`
      );
    } finally {
      setIsUpscaling(false);
      setTimeout(() => setUpscaleProgress(0), 2000);
    }
  };

  const handleResizeDrag = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      setIsDragging(true);
      setDragHandle(handle);

      const startX = e.clientX;
      const startY = e.clientY;
      const startBounds = { ...canvasBounds };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const newBounds = { ...startBounds };

        switch (handle) {
          case "se": // Bottom-right
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width + deltaX
            );
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height + deltaY
            );
            break;
          case "sw": // Bottom-left
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width - deltaX
            );
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height + deltaY
            );
            break;
          case "ne": // Top-right
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width + deltaX
            );
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height - deltaY
            );
            break;
          case "nw": // Top-left
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width - deltaX
            );
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height - deltaY
            );
            break;
          case "e": // Right
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width + deltaX
            );
            break;
          case "w": // Left
            newBounds.width = Math.max(
              originalBounds.width,
              startBounds.width - deltaX
            );
            break;
          case "s": // Bottom
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height + deltaY
            );
            break;
          case "n": // Top
            newBounds.height = Math.max(
              originalBounds.height,
              startBounds.height - deltaY
            );
            break;
        }

        setCanvasBounds(newBounds);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        setDragHandle(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [canvasBounds, originalBounds]
  );

  const resetCanvasSize = () => {
    setCanvasBounds({
      width: originalBounds.width,
      height: originalBounds.height,
    });
  };

  const processImageExpansion = async () => {
    if (!originalImage || !expandPrompt.trim()) {
      console.log(
        "Early return - originalImage:",
        !!originalImage,
        "expandPrompt:",
        expandPrompt.trim()
      );
      return;
    }

    // Check Pro access
    if (!handleProFeatureClick("expand")) return;

    setIsExpanding(true);
    setExpandProgress(5); // Show initial progress

    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("No canvas found");
        return;
      }

      // Check canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        console.log("Canvas has no dimensions:", canvas.width, canvas.height);
        return;
      }

      // Convert canvas to base64
      const imageBase64 = canvas.toDataURL("image/png");

      // Debug logging
      console.log("Canvas dimensions:", canvas.width, canvas.height);
      console.log("Image base64 length:", imageBase64.length);
      console.log("Expand prompt:", expandPrompt.trim());
      console.log("Aspect ratio:", aspectRatio);
      console.log("Expansion mode:", expansionMode);

      // Validate we have data
      if (!imageBase64 || imageBase64.length < 100) {
        console.log("Invalid base64 data");
        return;
      }

      if (!aspectRatio) {
        console.log("No aspect ratio set");
        return;
      }

      let requestBody;
      if (expansionMode === "preset") {
        requestBody = {
          image_data: imageBase64,
          aspect_ratio: aspectRatio,
          prompt: expandPrompt.trim(),
        };
      } else {
        // For freestyle mode, calculate aspect ratio from canvas bounds
        const ratio = canvasBounds.width / canvasBounds.height;
        let closestRatio = "1:1";
        if (ratio > 1.7) closestRatio = "16:9";
        else if (ratio > 1.2) closestRatio = "4:3";
        else if (ratio < 0.8) closestRatio = "9:16";

        requestBody = {
          image_data: imageBase64,
          aspect_ratio: closestRatio,
          prompt: expandPrompt.trim(),
          custom_bounds: {
            width: Math.round(canvasBounds.width),
            height: Math.round(canvasBounds.height),
          },
        };
      }

      console.log("Sending request body:", requestBody);
      console.log("Request body keys:", Object.keys(requestBody));
      console.log(
        "Request body image_data length:",
        requestBody.image_data?.length
      );
      console.log("Request body aspect_ratio:", requestBody.aspect_ratio);

      // Update progress before making API call
      setExpandProgress(10);

      // Start the prediction
      const headers = await getAuthHeaders();
      const response = await fetch("/api/reframe-image", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log("Reframe response:", response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Reframe error response:", responseText);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || "Unknown error" };
        }
        const errorMessage =
          errorData.error ||
          `HTTP ${response.status}: Failed to start image expansion`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("Reframe success response:", responseData);
      const { predictionId } = responseData;

      // Update progress after successful API call
      setExpandProgress(20);

      // Poll for completion
      console.log("Starting polling for prediction:", predictionId);
      let prediction;
      try {
        prediction = await pollPrediction(predictionId, (progress) => {
          console.log("Progress update:", progress);
          setExpandProgress(progress);
        });
        console.log("Final prediction result:", prediction);
      } catch (pollError) {
        console.error("Polling failed:", pollError);
        throw pollError;
      }

      if (prediction.output) {
        const resultImg = new Image();
        resultImg.crossOrigin = "anonymous";
        resultImg.onload = async () => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Always preserve the aspect ratio of the result image
            // Update canvas to match the result dimensions
            canvas.width = resultImg.width;
            canvas.height = resultImg.height;

            // Draw the result image at full size
            ctx.drawImage(resultImg, 0, 0);

            // Update the canvas bounds to reflect the new size
            const containerWidth = 800;
            const containerHeight = 600;
            const ratio = Math.min(
              containerWidth / resultImg.width,
              containerHeight / resultImg.height
            );

            const displayWidth = resultImg.width * ratio;
            const displayHeight = resultImg.height * ratio;

            setCanvasBounds({
              width: displayWidth,
              height: displayHeight,
            });

            setOriginalBounds({
              width: displayWidth,
              height: displayHeight,
              x: 0,
              y: 0,
            });

            // Save expanded image to user projects if authenticated
            if (user && prediction.output) {
              await saveProcessedImageToProjects(prediction.output, "expand");
            }
          }
        };
        resultImg.src = prediction.output;
      }
    } catch (error) {
      console.error("Image expansion failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(
        `Failed to process image expansion: ${errorMessage}. Please check the console for more details.`
      );
    } finally {
      setIsExpanding(false);
      setTimeout(() => setExpandProgress(0), 2000);
    }
  };

  const downloadImage = async () => {
    try {
      let imageUrl: string;
      let fileName: string;

      // If we have an upscaled image, download that instead of the canvas
      if (upscaledImage && activeFeature === "upscale") {
        // If it's a URL, we need to fetch it first to trigger download
        if (upscaledImage.startsWith("http")) {
          // For URLs, create a download link that forces download
          const link = document.createElement("a");
          link.href = upscaledImage;
          link.download = "upscaled-image.jpg";
          link.target = "_blank";
          link.click();
          return;
        } else {
          // For base64 data (fallback)
          imageUrl = upscaledImage;
          const extension = upscaledImage.startsWith("data:image/jpeg") ? "jpg" : "png";
          fileName = `upscaled-image.${extension}`;
        }
      } else {
        // Otherwise, download the canvas content (original or expanded image)
        const canvas = canvasRef.current;
        if (!canvas || !canvas.isConnected) return;

        imageUrl = canvas.toDataURL();
        fileName =
          activeFeature === "expand"
            ? "expanded-image.png"
            : "edited-image.png";
      }

      // Create and trigger download for base64 data
      const link = document.createElement("a");
      link.download = fileName;
      link.href = imageUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download image:", error);
      alert("Failed to download image. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              AI Image Editor
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={downloadImage}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={activeFeature === "upscale" && !upscaledImage}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => router.push("/")} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Image Editor
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
              <div className="relative">
                {/* Expansion Preview Overlay */}
                {activeFeature === "expand" &&
                  expansionMode === "freestyle" && (
                    <div
                      className="absolute border-2 border-dashed border-purple-400 bg-purple-50/20 rounded-lg pointer-events-none z-10"
                      style={{
                        width: `${canvasBounds.width}px`,
                        height: `${canvasBounds.height}px`,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {Math.round(canvasBounds.width)} ×{" "}
                          {Math.round(canvasBounds.height)}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Main Canvas Container */}
                <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  {activeFeature === "upscale" && upscaledImage ? (
                    /* Before/After Drag Comparison */
                    <div className="w-full max-w-4xl mx-auto">
                      <div
                        className="relative cursor-ew-resize bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden"
                        style={{
                          width: "800px",
                          height: "600px",
                          maxWidth: "100%",
                        }}
                        onMouseDown={(e) => {
                          const container = e.currentTarget;
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const rect = container.getBoundingClientRect();
                            const x = moveEvent.clientX - rect.left;
                            const percentage = Math.max(
                              0,
                              Math.min(100, (x / rect.width) * 100)
                            );
                            setSliderPosition(percentage);
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      >
                        {/* Background - Upscaled Image (After) */}
                        <div className="absolute top-0 left-0 w-full h-full">
                          <img
                            src={upscaledImage}
                            alt="Upscaled"
                            className="w-full h-full object-contain"
                            onLoad={() =>
                              console.log("Upscaled image loaded successfully")
                            }
                            onError={() =>
                              console.error("Failed to load upscaled image")
                            }
                          />
                        </div>

                        {/* Foreground - Original Image (Before) - clips from right side */}
                        <div
                          className="absolute top-0 left-0 w-full h-full overflow-hidden"
                          style={{
                            clipPath: `inset(0 0 0 ${sliderPosition}%)`,
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt="Original"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Divider Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                          style={{ left: `${sliderPosition}%` }}
                        />

                        {/* Drag Handle */}
                        <div
                          className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center z-20"
                          style={{
                            left: `calc(${sliderPosition}% - 16px)`,
                            top: "calc(50% - 16px)",
                            cursor: "ew-resize",
                          }}
                        >
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-4 bg-blue-500 rounded"></div>
                            <div className="w-0.5 h-4 bg-blue-500 rounded"></div>
                          </div>
                        </div>

                        {/* Before/After Labels */}
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium z-10">
                          After
                        </div>
                        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium z-10">
                          Before
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular Canvas */
                    <>
                      <canvas
                        ref={canvasRef}
                        className="block max-w-full max-h-full"
                        style={{
                          width: `${originalBounds.width}px`,
                          height: `${originalBounds.height}px`,
                          maxWidth: "800px",
                          maxHeight: "600px",
                        }}
                      />
                      <canvas
                        ref={maskCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: `${originalBounds.width}px`,
                          height: `${originalBounds.height}px`,
                          maxWidth: "800px",
                          maxHeight: "600px",
                          display: "none",
                        }}
                      />
                      <canvas
                        ref={cursorCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: `${originalBounds.width}px`,
                          height: `${originalBounds.height}px`,
                          maxWidth: "800px",
                          maxHeight: "600px",
                          display: "none",
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Resize Handles for Freestyle Mode */}
                {activeFeature === "expand" &&
                  expansionMode === "freestyle" && (
                    <>
                      {/* Corner Handles */}
                      <div
                        className="absolute w-3 h-3 bg-purple-600 border border-white rounded-sm cursor-nw-resize z-20 hover:bg-purple-700"
                        style={{
                          top: `calc(50% - ${canvasBounds.height / 2}px - 6px)`,
                          left: `calc(50% - ${canvasBounds.width / 2}px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "nw")}
                      />
                      <div
                        className="absolute w-3 h-3 bg-purple-600 border border-white rounded-sm cursor-ne-resize z-20 hover:bg-purple-700"
                        style={{
                          top: `calc(50% - ${canvasBounds.height / 2}px - 6px)`,
                          right: `calc(50% - ${
                            canvasBounds.width / 2
                          }px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "ne")}
                      />
                      <div
                        className="absolute w-3 h-3 bg-purple-600 border border-white rounded-sm cursor-sw-resize z-20 hover:bg-purple-700"
                        style={{
                          bottom: `calc(50% - ${
                            canvasBounds.height / 2
                          }px - 6px)`,
                          left: `calc(50% - ${canvasBounds.width / 2}px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "sw")}
                      />
                      <div
                        className="absolute w-3 h-3 bg-purple-600 border border-white rounded-sm cursor-se-resize z-20 hover:bg-purple-700"
                        style={{
                          bottom: `calc(50% - ${
                            canvasBounds.height / 2
                          }px - 6px)`,
                          right: `calc(50% - ${
                            canvasBounds.width / 2
                          }px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "se")}
                      />

                      {/* Edge Handles */}
                      <div
                        className="absolute w-3 h-6 bg-purple-600 border border-white rounded-sm cursor-ew-resize z-20 hover:bg-purple-700"
                        style={{
                          top: `calc(50% - 12px)`,
                          left: `calc(50% - ${canvasBounds.width / 2}px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "w")}
                      />
                      <div
                        className="absolute w-3 h-6 bg-purple-600 border border-white rounded-sm cursor-ew-resize z-20 hover:bg-purple-700"
                        style={{
                          top: `calc(50% - 12px)`,
                          right: `calc(50% - ${
                            canvasBounds.width / 2
                          }px - 6px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "e")}
                      />
                      <div
                        className="absolute w-6 h-3 bg-purple-600 border border-white rounded-sm cursor-ns-resize z-20 hover:bg-purple-700"
                        style={{
                          top: `calc(50% - ${canvasBounds.height / 2}px - 6px)`,
                          left: `calc(50% - 12px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "n")}
                      />
                      <div
                        className="absolute w-6 h-3 bg-purple-600 border border-white rounded-sm cursor-ns-resize z-20 hover:bg-purple-700"
                        style={{
                          bottom: `calc(50% - ${
                            canvasBounds.height / 2
                          }px - 6px)`,
                          left: `calc(50% - 12px)`,
                        }}
                        onMouseDown={(e) => handleResizeDrag(e, "s")}
                      />
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Features Panel */}
        <div className="space-y-6">
          {/* Feature Tabs */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex">
              <button
                onClick={() => setActiveFeature("upscale")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeFeature === "upscale"
                    ? "bg-blue-50 text-blue-600 border-blue-500"
                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Upscaler
              </button>
              <button
                onClick={() => setActiveFeature("expand")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeFeature === "expand"
                    ? "bg-purple-50 text-purple-600 border-purple-500"
                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                }`}
              >
                <Expand className="w-4 h-4" />
                Expand Image
              </button>
            </div>

            <div className="p-6">
              {activeFeature === "upscale" ? (
                <div className="space-y-6">
                  {/* Upscaler Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          AI Image Upscaler
                        </h4>
                        <p className="text-xs text-blue-700 mb-3">
                          Enhance your image quality with AI-powered upscaling.
                          Increase resolution while preserving details.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upscaler Controls */}
                  <div className="space-y-4">
                    {isUpscaling && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {upscaleProgress < 30
                              ? "Starting AI upscaler..."
                              : "Upscaling..."}
                          </span>
                          <span className="text-gray-600">
                            {Math.round(upscaleProgress)}%
                          </span>
                        </div>
                        <Progress value={upscaleProgress} className="h-2" />
                        {upscaleProgress < 30 && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">
                              The AI model is starting up. Cold start can take
                              up to 4 minutes for the first request.
                            </p>
                            {tabHidden && isUpscaling && (
                              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                ⚠️ Tab is in background - processing may be
                                slower. Keep this tab active for best
                                performance.
                              </p>
                            )}
                            {upscaleProgress > 10 && upscaleProgress < 30 && (
                              <Button
                                onClick={() => {
                                  setIsUpscaling(false);
                                  setUpscaleProgress(0);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                              >
                                Cancel & Retry Later
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={processImageUpscale}
                      disabled={isUpscaling}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {isUpscaling ? "Upscaling..." : "Upscale Image"}
                    </Button>

                    {upscaledImage && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Before/After Comparison
                          </Label>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs text-green-700">
                              ✓ Upscaling completed! Drag anywhere on the image
                              to compare before and after.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              if (upscaledImage) {
                                if (upscaledImage.startsWith("http")) {
                                  // For URLs, create a download link
                                  const link = document.createElement("a");
                                  link.href = upscaledImage;
                                  link.download = "upscaled-image.jpg";
                                  link.target = "_blank";
                                  link.click();
                                } else {
                                  // For base64 data (fallback)
                                  const extension = upscaledImage.startsWith("data:image/jpeg") ? "jpg" : "png";
                                  const link = document.createElement("a");
                                  link.download = `upscaled-image.${extension}`;
                                  link.href = upscaledImage;
                                  link.click();
                                }
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>1. Click "Upscale Image" to enhance quality</p>
                      <p>2. Wait for AI processing to complete</p>
                      <p>3. Drag on the image to compare results</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Expansion Mode Toggle */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Expansion Mode
                      </Label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                        <button
                          onClick={() => setExpansionMode("preset")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                            expansionMode === "preset"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <RectangleHorizontal className="w-4 h-4" />
                          Preset Ratios
                        </button>
                        <button
                          onClick={() => setExpansionMode("freestyle")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                            expansionMode === "freestyle"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Move className="w-4 h-4" />
                          Freestyle
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Aspect Ratio Selection - Only show for preset mode */}
                  {expansionMode === "preset" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Aspect Ratio
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["16:9", "4:3", "1:1", "9:16"].map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                aspectRatio === ratio
                                  ? "bg-purple-50 text-purple-600 border-purple-200"
                                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <RectangleHorizontal className="w-4 h-4" />
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Freestyle Controls */}
                  {expansionMode === "freestyle" && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Move className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-purple-900 mb-1">
                              Freestyle Expansion
                            </h4>
                            <p className="text-xs text-purple-700 mb-3">
                              Drag the purple handles around the image to set
                              custom expansion bounds.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-purple-600">
                              <span>
                                Current size: {Math.round(canvasBounds.width)} ×{" "}
                                {Math.round(canvasBounds.height)}
                              </span>
                              <Button
                                onClick={resetCanvasSize}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-purple-200 text-purple-600 hover:bg-purple-100"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand Controls */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="space-y-2">
                      <Label
                        htmlFor="expand-prompt"
                        className="text-sm font-medium"
                      >
                        Describe the expanded area:
                      </Label>
                      <Textarea
                        id="expand-prompt"
                        placeholder="e.g., natural landscape, city skyline, ocean view..."
                        value={expandPrompt}
                        onChange={(e) => setExpandPrompt(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {isExpanding && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Expanding...</span>
                          <span className="text-gray-600">
                            {expandProgress}%
                          </span>
                        </div>
                        <Progress value={expandProgress} className="h-2" />
                      </div>
                    )}

                    <Button
                      onClick={processImageExpansion}
                      disabled={!expandPrompt.trim() || isExpanding}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      <Expand className="w-4 h-4 mr-2" />
                      {isExpanding ? "Expanding..." : "Expand Image"}
                    </Button>

                    <div className="text-xs text-gray-500 space-y-1">
                      {expansionMode === "preset" ? (
                        <>
                          <p>1. Select desired aspect ratio</p>
                          <p>2. Describe what should fill the new space</p>
                          <p>3. Click Expand Image</p>
                        </>
                      ) : (
                        <>
                          <p>1. Drag handles to set custom bounds</p>
                          <p>2. Describe what should fill the expanded area</p>
                          <p>3. Click Expand Image</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge
                  variant={isUpscaling || isExpanding ? "secondary" : "outline"}
                >
                  {isUpscaling
                    ? "Upscaling..."
                    : isExpanding
                    ? "Expanding..."
                    : "Ready"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Feature:</span>
                <Badge
                  variant="outline"
                  className={`${
                    activeFeature === "upscale"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-purple-50 text-purple-600 border-purple-200"
                  }`}
                >
                  {activeFeature === "upscale" ? "AI Upscaler" : "Expand Image"}
                </Badge>
              </div>
              {upscaledImage && activeFeature === "upscale" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Comparison:</span>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    {Math.round(100 - sliderPosition)}% Before
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
        isAuthenticated={!!user}
      />
    </div>
  );
}
