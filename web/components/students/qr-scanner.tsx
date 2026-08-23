'use client';

import jsQR from 'jsqr';
import { CameraOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Stage 29 front-desk gate-scan — a small, focused decode-only library
 * (jsqr has zero dependencies, ~280KB unpacked) paired with a hand-rolled
 * getUserMedia capture loop, per design system §9's lean-bundle rule
 * (html5-qrcode/@zxing pull in several MB of UI chrome we don't need,
 * since this app already has its own camera/close UI conventions).
 */
export function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            cancelled = true;
            onScan(code.data);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError(
          "Couldn't access the camera — check permissions, or use manual entry below.",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Scan student ID</p>
        <Button variant="ghost" size="icon-sm" aria-label="Close scanner" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <CameraOff className="size-6" aria-hidden="true" />
          {error}
        </div>
      ) : (
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/70" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
