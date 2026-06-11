import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, X, ShieldAlert, Upload, Check } from "lucide-react";
import { motion } from "motion/react";

interface CameraCaptureProps {
  onCapture: (base64Photo: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraState, setCameraState] = useState<"initializing" | "ready" | "error" | "captured">("initializing");
  const [activeFacingMode, setActiveFacingMode] = useState<"user" | "environment">("user");
  const [deviceErrorMsg, setDeviceErrorMsg] = useState("");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isUploadingFallback, setIsUploadingFallback] = useState(false);

  // Initialize camera stream
  const startCamera = async (facing: "user" | "environment" = "user") => {
    setCameraState("initializing");
    setDeviceErrorMsg("");

    // Stop existing stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 400 },
          height: { ideal: 400 },
          aspectRatio: { ideal: 1 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.error("Video play failed:", e));
      }
      setCameraState("ready");
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errMsg = "Unable to access the camera.";
      if (err.name === "NotAllowedError") {
        errMsg = "Camera permission was denied. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errMsg = "No camera hardware detected on this device.";
      }
      setDeviceErrorMsg(errMsg);
      setCameraState("error");
    }
  };

  useEffect(() => {
    startCamera(activeFacingMode);

    return () => {
      // Clean up stream tracks on unmount to turn off the physical camera light
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeFacingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      // Crop and size down to 250x250 square for lightweight base64 storage
      const size = 250;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the square cropped center of the video
        const videoWidth = video.videoWidth || 400;
        const videoHeight = video.videoHeight || 400;
        const minDim = Math.min(videoWidth, videoHeight);
        
        // Calculate crop parameters
        const sx = (videoWidth - minDim) / 2;
        const sy = (videoHeight - minDim) / 2;

        ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);
        
        // Compress as JPEG to keep base64 extremely lightweight
        const base64 = canvas.toDataURL("image/jpeg", 0.82);
        setCapturedDataUrl(base64);
        setCameraState("captured");
        
        // Stop camera tracks temporarily while previewing
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    } catch (err) {
      console.error("Failed to capture image frame:", err);
      setDeviceErrorMsg("Could not process the captured image frame.");
      setCameraState("error");
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera(activeFacingMode);
  };

  const handleConfirm = () => {
    if (capturedDataUrl) {
      onCapture(capturedDataUrl);
    }
  };

  const toggleFacingMode = () => {
    setActiveFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Safe file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFallback(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw file onto canvas to crop square & downscale size
        const canvas = document.createElement("canvas");
        const size = 250;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          
          const base64 = canvas.toDataURL("image/jpeg", 0.82);
          setCapturedDataUrl(base64);
          setCameraState("captured");
          setIsUploadingFallback(false);
          
          // Stop camera since file was selected
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      };
      img.onerror = () => {
        setDeviceErrorMsg("Failed to read image file.");
        setIsUploadingFallback(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
            <h4 className="text-sm font-black text-white tracking-tight">Capture Portrait Photo</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Stage */}
        <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Background overlay effects */}
          <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-950/40 z-10" />
          {/* Circle preview guide */}
          <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-dashed border-white/60 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-[196px] h-[196px] rounded-full border border-white/20" />
          </div>

          {cameraState === "initializing" && (
            <div className="text-center space-y-2 z-20">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Powering camera sensor...</p>
            </div>
          )}

          {cameraState === "error" && (
            <div className="text-center p-6 space-y-3 z-20 text-slate-300">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-white">Camera Check Failed</p>
              <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed mx-auto">
                {deviceErrorMsg}
              </p>
            </div>
          )}

          {/* Active video capture element */}
          {(cameraState === "ready" || cameraState === "initializing") && (
            <video
              ref={videoRef}
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                cameraState === "ready" ? "opacity-100" : "opacity-0"
              }`}
              playsInline
              muted
            />
          )}

          {/* Snapshot captured view */}
          {cameraState === "captured" && capturedDataUrl && (
            <img
              src={capturedDataUrl}
              alt="Profile frame preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Navigation / Action bar */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-4">
          
          {/* Capture Actions */}
          {cameraState === "ready" && (
            <div className="flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all cursor-pointer"
                title="Switch lens"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCapture}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                Take Snapshot
              </button>

              <label className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all cursor-pointer relative" title="Upload from file">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          )}

          {cameraState === "captured" && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                Save Selected Photo
              </button>
            </div>
          )}

          {cameraState === "error" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Retry Camera
                </button>
                <label className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  {isUploadingFallback ? "Loading..." : "Upload File"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute w-0 h-0 opacity-0"
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Tip: You can upload any existing portrait photo from your phone or desktop.
              </p>
            </div>
          )}

          {cameraState === "initializing" && (
            <p className="text-[10px] text-slate-400 text-center leading-none">
              Please grant camera permission if requested by your browser.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
