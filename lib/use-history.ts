"use client"

import { useCallback, useEffect, useState } from "react"
import type { Platform, ProductMetadata } from "@/lib/affiliate"

const STORAGE_KEY = "affiliate-history"
const MAX_HISTORY_ITEMS = 50

export interface HistoryItem {
  id: string
  platform: Platform
  platformLabel: string
  originalUrl: string
  affiliateUrl: string
  redirectUrl?: string
  shortUrl?: string
  product?: ProductMetadata | null
  createdAt: number
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false

  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function sanitizeHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== "object") return false
      const record = item as Record<string, unknown>

      return (
        typeof record.id === "string" &&
        (record.platform === "shopee" ||
          record.platform === "mercadolivre") &&
        typeof record.platformLabel === "string" &&
        isHttpUrl(record.originalUrl) &&
        isHttpUrl(record.affiliateUrl) &&
        typeof record.createdAt === "number" &&
        Number.isFinite(record.createdAt)
      )
    })
    .map((item) => {
      const rawProduct =
        item.product && typeof item.product === "object"
          ? (item.product as Record<string, unknown>)
          : null
      const product: ProductMetadata | null = rawProduct
        ? {
            title:
              typeof rawProduct.title === "string"
                ? rawProduct.title.slice(0, 180)
                : null,
            description:
              typeof rawProduct.description === "string"
                ? rawProduct.description.slice(0, 320)
                : null,
            image: isHttpUrl(rawProduct.image) ? rawProduct.image : null,
            price:
              typeof rawProduct.price === "string"
                ? rawProduct.price.slice(0, 40)
                : null,
            currency:
              typeof rawProduct.currency === "string"
                ? rawProduct.currency.slice(0, 10)
                : null,
          }
        : null

      return {
        id: item.id as string,
        platform: item.platform as Platform,
        platformLabel: item.platformLabel as string,
        originalUrl: item.originalUrl as string,
        affiliateUrl: item.affiliateUrl as string,
        redirectUrl: isHttpUrl(item.redirectUrl)
          ? item.redirectUrl
          : undefined,
        shortUrl: isHttpUrl(item.shortUrl) ? item.shortUrl : undefined,
        product,
        createdAt: item.createdAt as number,
      }
    })
    .slice(0, MAX_HISTORY_ITEMS)
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const sanitized = sanitizeHistory(JSON.parse(raw))
        setItems(sanitized)
      }
    } catch {
      // Ignora dados corrompidos.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Armazenamento indisponível.
    }
  }, [items, loaded])

  const persist = useCallback((update: (current: HistoryItem[]) => HistoryItem[]) => {
    setItems(update)
  }, [])

  const add = useCallback(
    (item: Omit<HistoryItem, "id" | "createdAt">) => {
      const entry: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      }
      const entryKey = item.shortUrl || item.affiliateUrl
      persist((current) =>
        [
          entry,
          ...current.filter(
            (existing) =>
              (existing.shortUrl || existing.affiliateUrl) !== entryKey,
          ),
        ].slice(0, MAX_HISTORY_ITEMS),
      )
    },
    [persist],
  )

  const remove = useCallback(
    (id: string) => {
      persist((current) => current.filter((item) => item.id !== id))
    },
    [persist],
  )

  const clear = useCallback(() => {
    persist(() => [])
  }, [persist])

  return { items, loaded, add, remove, clear }
}
