"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function Qr({ texto, size = 180 }: { texto: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !texto) return;
    // La librería fija su propio tamaño en CSS; después lo volvemos a ajustar.
    QRCode.toCanvas(cv, texto, { width: size * 2, margin: 0, errorCorrectionLevel: "M" })
      .then(() => { cv.style.width = size + "px"; cv.style.height = size + "px"; });
  }, [texto, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-label="Código QR" />;
}
