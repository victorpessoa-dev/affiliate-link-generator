import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { deflateRawSync, inflateRawSync } from "node:zlib"

type RedirectPayload = {
  url: string
  expiresAt: number
  title?: string | null
  description?: string | null
  image?: string | null
  platformLabel?: string | null
}

function getSecret() {
  const secret =
    process.env.REDIRECT_SECRET ||
    process.env.SHOPEE_SECRET ||
    process.env.MELI_ACCESS_TOKEN

  if (!secret) {
    throw new Error("Configure REDIRECT_SECRET no .env.local.")
  }

  return secret
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url")
}

function signShort(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest()
    .subarray(0, 10)
    .toString("base64url")
}

function isValidDestination(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function createRedirectToken(
  data: Omit<RedirectPayload, "expiresAt">,
): string {
  if (!isValidDestination(data.url)) {
    throw new Error("Não foi possível encurtar o destino.")
  }

  const payload = {
    u: data.url,
    e: Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000),
  }
  const encoded = deflateRawSync(JSON.stringify(payload)).toString("base64url")
  const value = `2.${encoded}`

  return `${value}.${signShort(value)}`
}

export function readRedirectToken(token: string): RedirectPayload | null {
  const parts = token.split(".")
  if (parts[0] === "2") {
    const [, encoded, signature] = parts
    if (!encoded || !signature) return null

    const value = `2.${encoded}`
    const expected = Buffer.from(signShort(value))
    const received = Buffer.from(signature)

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null
    }

    try {
      const payload = JSON.parse(
        inflateRawSync(Buffer.from(encoded, "base64url")).toString("utf8"),
      ) as Record<string, unknown>

      if (
        typeof payload.u !== "string" ||
        typeof payload.e !== "number" ||
        payload.e * 1000 < Date.now()
      ) {
        return null
      }

      if (!isValidDestination(payload.u)) return null

      return {
        url: payload.u,
        expiresAt: payload.e * 1000,
      }
    } catch {
      return null
    }
  }

  const [encoded, signature] = parts
  if (!encoded || !signature) return null

  const expected = Buffer.from(sign(encoded))
  const received = Buffer.from(signature)

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as RedirectPayload

    if (
      typeof payload.url !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return null
    }

    if (!isValidDestination(payload.url)) return null

    return payload
  } catch {
    return null
  }
}
