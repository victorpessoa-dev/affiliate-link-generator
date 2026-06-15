"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

export function SafeImage({
  src,
  alt = "",
  className,
  fallbackClassName = "",
}) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
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
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  )
}
