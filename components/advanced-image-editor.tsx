"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brush,
  Eraser,
  Download,
  Sparkles,
  ArrowLeft,
  Expand,
  RectangleHorizontal,
  Move,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AdvancedImageEditorProps {
  imageUrl: string;
}

export default function AdvancedImageEditor({
  imageUrl,
}: AdvancedImageEditorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeFeature, setActiveFeature] = useState<"fill" | "expand">("fill");
  const [expandPrompt, setExpandPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandProgress, setExpandProgress] = useState(0);
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
  const [, setMousePos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setOriginalImage(img);
      initializeCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const cursorCanvas = cursorCanvasRef.current;
    if (!canvas || !maskCanvas || !cursorCanvas) return;

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

  const startDrawing = useCallback(
    (e: React.MouseEvent) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      setIsDrawing(true);
      setLastPos({ x, y });

      // Draw initial dot
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (tool === "brush") {
        // Create a flat mask - areas are either selected (1) or not (0)
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(239, 68, 68, 1)"; // Full opacity
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
    [tool, brushSize]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !lastPos) return;

      const canvas = maskCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

      // Calculate distance to prevent overlapping circles
      const distance = Math.sqrt(
        Math.pow(currentX - lastPos.x, 2) + Math.pow(currentY - lastPos.y, 2)
      );

      // Only draw if we've moved enough to prevent overlap
      if (distance < brushSize * 0.1) return;

      if (tool === "brush") {
        // Create flat binary mask - painting over doesn't increase opacity
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(239, 68, 68, 1)"; // Full opacity for clean mask
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      } else {
        // Erase smooth line between points
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      }

      setLastPos({ x: currentX, y: currentY });
    },
    [isDrawing, tool, brushSize, lastPos]
  );

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the entire mask canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const updateCursor = useCallback(
    (e: React.MouseEvent) => {
      const canvas = cursorCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      setMousePos({ x, y });

      // Draw cursor outline
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (showCursor) {
        ctx.strokeStyle = tool === "brush" ? "#ef4444" : "#6b7280";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [brushSize, tool, showCursor]
  );

  const handleMouseEnter = () => setShowCursor(true);
  const handleMouseLeave = () => {
    setShowCursor(false);
    const canvas = cursorCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const pollPrediction = async (
    predictionId: string,
    onProgress?: (progress: number) => void
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max (2 seconds * 120)

      const poll = async () => {
        try {
          const response = await fetch(
            `/api/poll-prediction?id=${predictionId}`
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
          console.log(
            `Poll attempt ${attempts + 1}:`,
            prediction.status,
            prediction
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
            reject(new Error("Prediction failed"));
          } else {
            // Still processing, poll again
            attempts++;
            if (attempts >= maxAttempts) {
              reject(new Error("Prediction timed out"));
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

  const processGenerativeFill = async () => {
    if (!originalImage || !prompt.trim()) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      // Create a proper mask - convert red overlay to white mask
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = maskCanvas.width;
      tempCanvas.height = maskCanvas.height;
      const tempCtx = tempCanvas.getContext("2d");

      if (tempCtx) {
        // Get the red overlay data
        const imageData = maskCanvas
          .getContext("2d")!
          .getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;

        // Convert red areas to white mask
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            // Red area exists, make it white in mask
            data[i] = 255; // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
            data[i + 3] = 255; // A
          } else {
            // No red area, make it black in mask
            data[i] = 0; // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 255; // A
          }
        }

        tempCtx.putImageData(imageData, 0, 0);
      }

      // Convert canvases to base64
      const imageBase64 = canvas.toDataURL("image/png");
      const maskBase64 = tempCanvas.toDataURL("image/png");

      // Start the prediction
      const response = await fetch("/api/generative-fill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: prompt.trim(),
        }),
      });

      console.log("Generative fill response:", response);
      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);

      // Log response body regardless of status
      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || "Unknown error" };
        }
        console.log("Error data:", errorData);
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to start generative fill`
        );
      }

      const responseData = JSON.parse(responseText);
      const { predictionId } = responseData;

      // Poll for completion
      const prediction = await pollPrediction(predictionId, (progress) => {
        setProgress(progress);
      });

      if (prediction.output && prediction.output[0]) {
        const resultImg = new Image();
        resultImg.crossOrigin = "anonymous";
        resultImg.onload = () => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);
          }
        };
        resultImg.src = prediction.output[0];
      }
    } catch (error) {
      console.error("Generative fill failed:", error);
      alert("Failed to process generative fill. Please try again.");
    } finally {
      setIsProcessing(false);

      setTimeout(() => setProgress(0), 2000);
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
    if (!originalImage || !expandPrompt.trim()) return;

    setIsExpanding(true);
    setExpandProgress(0);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Convert canvas to base64
      const imageBase64 = canvas.toDataURL("image/png");
      
      // Debug logging
      console.log("Canvas dimensions:", canvas.width, canvas.height);
      console.log("Image base64 length:", imageBase64.length);
      console.log("Expand prompt:", expandPrompt.trim());
      console.log("Aspect ratio:", aspectRatio);

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

      // Start the prediction
      const response = await fetch("/api/reframe-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to start image expansion`
        );
      }

      const responseData = await response.json();
      console.log("Reframe success response:", responseData);
      const { predictionId } = responseData;

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
        resultImg.onload = () => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            if (expansionMode === "freestyle") {
              // For freestyle mode, crop the result to custom bounds
              canvas.width = canvasBounds.width;
              canvas.height = canvasBounds.height;

              // Calculate center crop from the expanded image
              const imgAspect = resultImg.width / resultImg.height;
              const canvasAspect = canvasBounds.width / canvasBounds.height;

              let drawWidth, drawHeight, drawX, drawY;

              if (imgAspect > canvasAspect) {
                // Image is wider, fit height and crop width
                drawHeight = canvasBounds.height;
                drawWidth = drawHeight * imgAspect;
                drawX = (canvasBounds.width - drawWidth) / 2;
                drawY = 0;
              } else {
                // Image is taller, fit width and crop height
                drawWidth = canvasBounds.width;
                drawHeight = drawWidth / imgAspect;
                drawX = 0;
                drawY = (canvasBounds.height - drawHeight) / 2;
              }

              ctx.drawImage(resultImg, drawX, drawY, drawWidth, drawHeight);
            } else {
              // For preset mode, just resize canvas to fit the result
              canvas.width = resultImg.width;
              canvas.height = resultImg.height;
              ctx.drawImage(resultImg, 0, 0);
            }
          }
        };
        resultImg.src = prediction.output;
      }
    } catch (error) {
      console.error("Image expansion failed:", error);
      alert("Failed to process image expansion. Please try again.");
    } finally {
      setIsExpanding(false);
      setTimeout(() => setExpandProgress(0), 2000);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL();
    link.click();
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
                    className={`absolute top-0 left-0 ${
                      activeFeature === "fill"
                        ? "pointer-events-auto"
                        : "pointer-events-none"
                    }`}
                    style={{
                      cursor: activeFeature === "fill" ? "none" : "default",
                      width: `${originalBounds.width}px`,
                      height: `${originalBounds.height}px`,
                      maxWidth: "800px",
                      maxHeight: "600px",
                      opacity: activeFeature === "fill" ? 0.4 : 0,
                      display: activeFeature === "fill" ? "block" : "none",
                    }}
                    onMouseDown={
                      activeFeature === "fill" ? startDrawing : undefined
                    }
                    onMouseUp={
                      activeFeature === "fill" ? stopDrawing : undefined
                    }
                    onMouseMove={
                      activeFeature === "fill"
                        ? (e) => {
                            draw(e);
                            updateCursor(e);
                          }
                        : undefined
                    }
                    onMouseEnter={
                      activeFeature === "fill" ? handleMouseEnter : undefined
                    }
                    onMouseLeave={
                      activeFeature === "fill"
                        ? () => {
                            stopDrawing();
                            handleMouseLeave();
                          }
                        : undefined
                    }
                  />
                  <canvas
                    ref={cursorCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                      width: `${originalBounds.width}px`,
                      height: `${originalBounds.height}px`,
                      maxWidth: "800px",
                      maxHeight: "600px",
                      display: activeFeature === "fill" ? "block" : "none",
                    }}
                  />
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
                onClick={() => setActiveFeature("fill")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeFeature === "fill"
                    ? "bg-blue-50 text-blue-600 border-blue-500"
                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Generative Fill
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
              {activeFeature === "fill" ? (
                <div className="space-y-6">
                  {/* Brush Tools */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Select Tool
                      </Label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                        <button
                          onClick={() => setTool("brush")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                            tool === "brush"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Brush className="w-4 h-4" />
                          Brush
                        </button>
                        <button
                          onClick={() => setTool("eraser")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                            tool === "eraser"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Eraser className="w-4 h-4" />
                          Eraser
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="brush-size"
                        className="text-sm font-medium"
                      >
                        Brush Size: {brushSize}px
                      </Label>
                      <Input
                        id="brush-size"
                        type="range"
                        min="5"
                        max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearMask}
                      className="w-full"
                    >
                      Clear Selection
                    </Button>
                  </div>

                  {/* Fill Controls */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="space-y-2">
                      <Label htmlFor="prompt" className="text-sm font-medium">
                        Describe what to fill:
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="e.g., a beautiful sunset sky, green grass, modern building..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Processing...</span>
                          <span className="text-gray-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <Button
                      onClick={processGenerativeFill}
                      disabled={!prompt.trim() || isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isProcessing ? "Processing..." : "Generate Fill"}
                    </Button>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>1. Paint over the area you want to fill</p>
                      <p>2. Describe what should appear there</p>
                      <p>3. Click Generate Fill</p>
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
                  variant={
                    isProcessing || isExpanding ? "secondary" : "outline"
                  }
                >
                  {isProcessing
                    ? "Filling..."
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
                    activeFeature === "fill"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-purple-50 text-purple-600 border-purple-200"
                  }`}
                >
                  {activeFeature === "fill"
                    ? "Generative Fill"
                    : "Expand Image"}
                </Badge>
              </div>
              {activeFeature === "fill" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tool:</span>
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-gray-700 border-gray-200"
                  >
                    {tool === "brush" ? "Brush" : "Eraser"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
