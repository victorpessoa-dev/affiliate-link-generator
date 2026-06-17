import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(value: string, max = 60) {
  if (!value || typeof value !== "string") return value
  if (value.length <= max) return value

  const half = Math.floor((max - 1) / 2)
  return `${value.slice(0, half)}...${value.slice(-half)}`
}
