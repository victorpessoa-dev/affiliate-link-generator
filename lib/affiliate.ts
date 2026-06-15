export type Platform = "shopee" | "mercadolivre"

export interface ConversionResult {
  platform: Platform
  platformLabel: string
  originalUrl: string
  resolvedUrl: string
  affiliateUrl: string
  redirectUrl: string
  shortUrl: string
  method: "api" | "params"
  product: ProductMetadata | null
}

export interface ProductMetadata {
  title: string | null
  description: string | null
  image: string | null
  price: string | null
  currency: string | null
}

type ConversionError = {
  error?: string
}

export async function convertToAffiliateLink(
  rawUrl: string,
  signal?: AbortSignal,
): Promise<ConversionResult> {
  const response = await fetch("/api/affiliate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: rawUrl }),
    signal,
  })

  const data = (await response.json().catch(() => ({}))) as
    | ConversionResult
    | ConversionError

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : "Não foi possível gerar o link.")
  }

  return data as ConversionResult
}
