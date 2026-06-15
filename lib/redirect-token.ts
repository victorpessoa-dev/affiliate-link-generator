import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

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
  const payload: RedirectPayload = {
    ...data,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return `${encoded}.${sign(encoded)}`
}

export function readRedirectToken(token: string): RedirectPayload | null {
  const [encoded, signature] = token.split(".")
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
