import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  Camera,
  SwitchCamera,
  Send,
  RotateCcw,
  Clock,
  Eye
} from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "view_once" | "timed"
type Duration = 5 | 10 | 30

interface CameraCaptureProps {
  onCapture: (blob: Blob, viewMode: ViewMode, duration?: number) => void
  onClose: () => void
  isUploading?: boolean
}

export function CameraCapture({ onCapture, onClose, isUploading = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("view_once")
  const [duration, setDuration] = useState<Duration>(10)
  const [error, setError] = useState<string | null>(null)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasPermission(true)
      setError(null)
    } catch (err) {
      console.error("Camera error:", err)
      setHasPermission(false)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera access in your browser settings.")
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.")
        } else {
          setError("Failed to access camera. Please try again.")
        }
      }
    }
  }, [facingMode])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()

    return () => {
      // Cleanup: stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [startCamera])

  // Toggle camera facing mode
  const toggleCamera = async () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas (flip horizontally for front camera)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob)
        setCapturedImage(canvas.toDataURL("image/jpeg", 0.9))
      }
    }, "image/jpeg", 0.9)
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
    setCapturedBlob(null)
  }

  // Send photo
  const sendPhoto = () => {
    if (!capturedBlob) return
    onCapture(capturedBlob, viewMode, viewMode === "timed" ? duration : undefined)
  }

  // Handle close
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>

        {!capturedImage && hasPermission && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCamera}
            className="text-white hover:bg-white/20"
          >
            <SwitchCamera className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Camera view / Preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-8">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Camera Error</p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{error}</p>
            <Button
              onClick={startCamera}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : hasPermission === null ? (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Accessing camera...</p>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "max-w-full max-h-full object-cover",
              facingMode === "user" && "scale-x-[-1]"
            )}
          />
        )}
      </div>

      {/* Controls */}
      {!error && hasPermission && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pb-safe">
          {capturedImage ? (
            // Preview controls
            <div className="p-4 space-y-4">
              {/* View mode selector */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("view_once")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors",
                    viewMode === "view_once"
                      ? "bg-white text-black"
                      : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  View Once
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timed")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors",
                    viewMode === "timed"
                      ? "bg-white text-black"
                      : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  Timed
                </button>
              </div>

              {/* Duration selector (only for timed mode) */}
              {viewMode === "timed" && (
                <div className="flex items-center justify-center gap-2">
                  {([5, 10, 30] as Duration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm transition-colors",
                        duration === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={retakePhoto}
                  disabled={isUploading}
                  className="border-white text-white hover:bg-white/20 hover:text-white"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retake
                </Button>
                <Button
                  size="lg"
                  onClick={sendPhoto}
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Snap
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Capture button
            <div className="flex items-center justify-center p-8">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
