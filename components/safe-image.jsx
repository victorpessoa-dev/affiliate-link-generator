"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

export function SafeImage({
  src,
  alt = "",
  className,
  fallbackClassName = "",
  fallbackSrc = "",
}) {
  const [failedSrc, setFailedSrc] = useState(null)
  const imageSrc = src && failedSrc !== src ? src : fallbackSrc && failedSrc !== fallbackSrc ? fallbackSrc : ""

  if (!imageSrc) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-muted ${fallbackClassName}`}
      >
        <ImageIcon className="size-8 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(imageSrc)}
    />
  )
}
