import "server-only"

import type {
  ConversionResult,
  Platform,
  ProductMetadata,
} from "@/lib/affiliate"

const REQUEST_TIMEOUT_MS = 8_000
const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 600_000
const METADATA_CACHE_TTL_MS = 1000 * 60 * 10
const MAX_METADATA_CACHE_ITEMS = 200

const metadataCache = new Map<
  string,
  { value: ProductMetadata | null; expiresAt: number }
>()

const PLATFORM_LABELS: Record<Platform, string> = {
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
}

const AFFILIATE_CONFIG = {
  shopee: {
    id:
      process.env.SHOPEE_AFFILIATE_ID ||
      process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_ID ||
      "",
    params: (id: string) => ({
      utm_source: "affiliate",
      utm_medium: "link",
      utm_campaign: id,
      af_siteid: id,
    }),
  },
  mercadolivre: {
    id:
      process.env.MELI_AFFILIATE_ID ||
      process.env.NEXT_PUBLIC_MELI_AFFILIATE_ID ||
      "vicpe0011",
    params: (id: string) => ({
      matt_word: id,
      matt_tool: "63517227",
      forceInApp: "true",
    }),
  },
} as const

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()

  if (!trimmed) {
    throw new Error("Cole um link para converter.")
  }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    throw new Error("O link informado não é uma URL válida.")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use um link iniciado por http:// ou https://.")
  }

  url.protocol = "https:"
  url.username = ""
  url.password = ""
  url.hash = ""

  return url
}

function isHost(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function detectPlatform(url: URL): Platform | null {
  const host = url.hostname.toLowerCase().replace(/\.$/, "")

  if (
    isHost(host, "shopee.com.br") ||
    isHost(host, "shopee.com") ||
    isHost(host, "shope.ee")
  ) {
    return "shopee"
  }

  if (
    isHost(host, "mercadolivre.com.br") ||
    isHost(host, "mercadolivre.com") ||
    isHost(host, "mercadolibre.com") ||
    isHost(host, "produto.ml")
  ) {
    return "mercadolivre"
  }

  return null
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  })
}

async function resolveRedirect(url: URL, platform: Platform): Promise<URL> {
  let currentUrl = url

  for (let redirectCount = 0; redirectCount < MAX_REDIRECTS; redirectCount += 1) {
    let response: Response

    try {
      response = await fetchWithTimeout(currentUrl.toString(), {
        method: "HEAD",
        redirect: "manual",
      })

      if (response.status === 405 || response.status === 501) {
        response = await fetchWithTimeout(currentUrl.toString(), {
          method: "GET",
          redirect: "manual",
        })
        await response.body?.cancel()
      }
    } catch {
      return currentUrl
    }

    if (response.status < 300 || response.status >= 400) {
      return currentUrl
    }

    const location = response.headers.get("location")
    if (!location) return currentUrl

    const nextUrl = normalizeUrl(new URL(location, currentUrl).toString())
    if (detectPlatform(nextUrl) !== platform) {
      throw new Error("O link redirecionou para um domínio não reconhecido.")
    }

    currentUrl = nextUrl
  }

  throw new Error("O link possui redirecionamentos demais.")
}

function addParamsFallback(url: URL, platform: Platform) {
  const config = AFFILIATE_CONFIG[platform]

  if (!config.id || config.id.startsWith("SEU_ID")) {
    throw new Error(
      `Configure o ID de afiliado da ${PLATFORM_LABELS[platform]} no .env.local.`,
    )
  }

  const finalUrl = new URL(url)
  const params = config.params(config.id)

  for (const [key, value] of Object.entries(params)) {
    finalUrl.searchParams.set(key, value)
  }

  return finalUrl.toString()
}

function readAffiliateUrl(data: unknown, keys: string[]) {
  if (!data || typeof data !== "object") return null

  const record = data as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value !== "string") continue

    try {
      return normalizeUrl(value).toString()
    } catch {
      continue
    }
  }

  return null
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function limit(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null
  const normalized = decodeHtml(value)
  return normalized ? normalized.slice(0, maxLength) : null
}

function readTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? ""
  }

  return attributes
}

function readMetaTags(html: string) {
  const metadata = new Map<string, string>()

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readTagAttributes(match[0])
    const key = (attributes.property || attributes.name || "").toLowerCase()
    if (key && attributes.content && !metadata.has(key)) {
      metadata.set(key, attributes.content)
    }
  }

  return metadata
}

function findProductJsonLd(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const product = findProductJsonLd(item)
      if (product) return product
    }
    return null
  }

  const record = value as Record<string, unknown>
  const type = record["@type"]
  if (
    type === "Product" ||
    (Array.isArray(type) && type.includes("Product"))
  ) {
    return record
  }

  for (const child of Object.values(record)) {
    const product = findProductJsonLd(child)
    if (product) return product
  }

  return null
}

function readJsonLd(html: string) {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const product = findProductJsonLd(JSON.parse(match[1]))
      if (product) return product
    } catch {
      continue
    }
  }

  return null
}

function readOffer(product: Record<string, unknown> | null) {
  if (!product) return null
  const offers = Array.isArray(product.offers)
    ? product.offers[0]
    : product.offers

  return offers && typeof offers === "object"
    ? (offers as Record<string, unknown>)
    : null
}

function titleFromProductPath(url: URL) {
  const slug = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/-i\.\d+\.\d+.*$/i, "")

  if (!slug) return null

  const title = slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return title
    ? title.charAt(0).toUpperCase() + title.slice(1)
    : null
}

function readNestedUrl(value: unknown) {
  if (!value || typeof value !== "object") return null
  const url = (value as Record<string, unknown>).url
  return typeof url === "string" ? url : null
}

async function extractRenderedPreview(
  url: URL,
): Promise<ProductMetadata | null> {
  if (process.env.PREVIEW_FALLBACK === "false") return null

  const endpoint =
    process.env.PREVIEW_API_URL || "https://api.microlink.io/"

  try {
    const previewUrl = new URL(endpoint)
    previewUrl.searchParams.set("url", url.toString())
    previewUrl.searchParams.set("meta", "true")
    previewUrl.searchParams.set("screenshot", "true")

    const response = await fetchWithTimeout(previewUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) return null

    const payload = (await response.json()) as Record<string, unknown>
    const data =
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : null
    if (!data) return null

    const rawImage =
      readNestedUrl(data.image) || readNestedUrl(data.screenshot)
    let image: string | null = null

    if (rawImage) {
      try {
        const imageUrl = new URL(rawImage)
        image =
          imageUrl.protocol === "https:" || imageUrl.protocol === "http:"
            ? imageUrl.toString()
            : null
      } catch {
        image = null
      }
    }

    const metadata: ProductMetadata = {
      title: limit(data.title, 180),
      description: limit(data.description, 320),
      image,
      price: null,
      currency: null,
    }

    return Object.values(metadata).some(Boolean) ? metadata : null
  } catch {
    return null
  }
}

function mergeMetadata(
  primary: ProductMetadata | null,
  fallback: ProductMetadata | null,
): ProductMetadata | null {
  if (!primary && !fallback) return null

  return {
    title: primary?.title || fallback?.title || null,
    description: primary?.description || fallback?.description || null,
    image: primary?.image || fallback?.image || null,
    price: primary?.price || fallback?.price || null,
    currency: primary?.currency || fallback?.currency || null,
  }
}

async function readLimitedHtml(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return ""

  const chunks: Uint8Array[] = []
  let total = 0

  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    const remaining = MAX_HTML_BYTES - total
    chunks.push(value.slice(0, remaining))
    total += Math.min(value.length, remaining)
  }

  await reader.cancel().catch(() => undefined)

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }

  return new TextDecoder().decode(bytes)
}

async function extractProductMetadata(url: URL): Promise<ProductMetadata | null> {
  const cacheKey = url.toString()
  const now = Date.now()
  const cached = metadataCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached.value

  let directMetadata: ProductMetadata | null = null

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AffiliateLinkPreview/1.0; +https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    const contentType = response.headers.get("content-type") || ""
    if (response.ok && contentType.includes("text/html")) {
      const html = await readLimitedHtml(response)
      const meta = readMetaTags(html)
      const product = readJsonLd(html)
      const offer = readOffer(product)
      const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      const jsonImage = Array.isArray(product?.image)
        ? product.image[0]
        : product?.image

      const rawImageValue =
        meta.get("og:image") ||
        meta.get("twitter:image") ||
        jsonImage
      const rawImage =
        typeof rawImageValue === "string" ? rawImageValue : null

      let image: string | null = null
      if (rawImage) {
        try {
          const imageUrl = new URL(rawImage, url)
          image =
            imageUrl.protocol === "https:" || imageUrl.protocol === "http:"
              ? imageUrl.toString()
              : null
        } catch {
          image = null
        }
      }

      const metadata: ProductMetadata = {
        title: limit(
          meta.get("og:title") ||
            meta.get("twitter:title") ||
            product?.name ||
            titleTag,
          180,
        ),
        description: limit(
          meta.get("og:description") ||
            meta.get("description") ||
            product?.description,
          320,
        ),
        image,
        price: limit(
          meta.get("product:price:amount") ||
            meta.get("og:price:amount") ||
            offer?.price,
          40,
        ),
        currency: limit(
          meta.get("product:price:currency") ||
            meta.get("og:price:currency") ||
            offer?.priceCurrency,
          10,
        ),
      }

      directMetadata = Object.values(metadata).some(Boolean)
        ? metadata
        : null
    }
  } catch {
    directMetadata = null
  }

  const pathTitle = titleFromProductPath(url)
  const pathMetadata: ProductMetadata | null = pathTitle
    ? {
        title: pathTitle,
        description: null,
        image: null,
        price: null,
        currency: null,
      }
    : null
  const partialMetadata = mergeMetadata(directMetadata, pathMetadata)

  const metadata = partialMetadata?.image
    ? partialMetadata
    : mergeMetadata(
        partialMetadata,
        await extractRenderedPreview(url),
      )

  if (metadataCache.size >= MAX_METADATA_CACHE_ITEMS) {
    const oldestKey = metadataCache.keys().next().value
    if (oldestKey) metadataCache.delete(oldestKey)
  }
  metadataCache.set(cacheKey, {
    value: metadata,
    expiresAt: now + METADATA_CACHE_TTL_MS,
  })

  return metadata
}

async function convertShopeeViaApi(url: URL): Promise<string | null> {
  const apiUrl = process.env.SHOPEE_API_URL
  const appId = process.env.SHOPEE_APP_ID
  const secret = process.env.SHOPEE_SECRET

  if (!apiUrl || !appId || !secret) return null

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": appId,
        "X-Secret": secret,
      },
      body: JSON.stringify({ original_url: url.toString() }),
    })

    if (!response.ok) return null

    return readAffiliateUrl(await response.json(), ["affiliate_url", "short_link"])
  } catch {
    return null
  }
}

async function convertMercadoLivreViaApi(url: URL): Promise<string | null> {
  const apiUrl = process.env.MELI_API_URL
  const token = process.env.MELI_ACCESS_TOKEN

  if (!apiUrl || !token) return null

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: url.toString() }),
    })

    if (!response.ok) return null

    return readAffiliateUrl(await response.json(), ["affiliate_url", "tracking_url"])
  } catch {
    return null
  }
}

export async function convertAffiliateLink(rawUrl: string): Promise<ConversionResult> {
  const originalUrl = normalizeUrl(rawUrl)
  const originalPlatform = detectPlatform(originalUrl)

  if (!originalPlatform) {
    throw new Error("Link não reconhecido. Use Shopee ou Mercado Livre.")
  }

  const resolvedUrl = await resolveRedirect(originalUrl, originalPlatform)
  const platform = detectPlatform(resolvedUrl)

  if (!platform || platform !== originalPlatform) {
    throw new Error("O link redirecionou para um domínio não reconhecido.")
  }

  const [affiliateUrl, product] = await Promise.all([
    platform === "shopee"
      ? convertShopeeViaApi(resolvedUrl)
      : convertMercadoLivreViaApi(resolvedUrl),
    extractProductMetadata(resolvedUrl),
  ])

  return {
    platform,
    platformLabel: PLATFORM_LABELS[platform],
    originalUrl: originalUrl.toString(),
    resolvedUrl: resolvedUrl.toString(),
    affiliateUrl: affiliateUrl || addParamsFallback(resolvedUrl, platform),
    redirectUrl: "",
    shortUrl: "",
    method: affiliateUrl ? "api" : "params",
    product,
  }
}
