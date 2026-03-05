'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, FlipHorizontal, X } from 'lucide-react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui';

/* ============================================================
   ATLAS — CameraCapture Component
   Live webcam capture for receipt scanning
   ============================================================ */

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
        'environment'
    );
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturedImage(imageSrc);
        }
    }, []);

    const confirmCapture = useCallback(async () => {
        if (!capturedImage) return;

        // Convert base64 to File
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], `receipt-${Date.now()}.jpg`, {
            type: 'image/jpeg',
        });

        onCapture(file);
    }, [capturedImage, onCapture]);

    const retake = () => setCapturedImage(null);

    const toggleCamera = () =>
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));

    return (
        <div className="relative w-full max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-[var(--text-primary)]">
                    Camera Capture
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Camera / Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
                {capturedImage ? (
                    <img
                        src={capturedImage}
                        alt="Captured receipt"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.9}
                        videoConstraints={{
                            facingMode,
                            width: 1280,
                            height: 720,
                        }}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Camera overlay guides */}
                {!capturedImage && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-4 border-2 border-white/20 rounded-xl" />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
                            Position receipt within the frame
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
                {capturedImage ? (
                    <>
                        <Button variant="secondary" onClick={retake}>
                            Retake
                        </Button>
                        <Button onClick={confirmCapture}>
                            Use This Photo
                        </Button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={toggleCamera}
                            className="p-3 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            aria-label="Flip camera"
                        >
                            <FlipHorizontal className="h-5 w-5" />
                        </button>
                        <button
                            onClick={capture}
                            className="p-4 rounded-full bg-[var(--accent-primary)] text-white hover:brightness-110 transition-all animate-pulse-glow"
                            aria-label="Take photo"
                        >
                            <Camera className="h-6 w-6" />
                        </button>
                        <div className="w-11" /> {/* Spacer for centering */}
                    </>
                )}
            </div>
        </div>
    );
}
