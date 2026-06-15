import "server-only"

import { randomBytes } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"

type ShortLink = {
  url: string
  expiresAt: number
  title?: string | null
  description?: string | null
  image?: string | null
  platformLabel?: string | null
}

type ShortLinkStore = Record<string, ShortLink>

const STORE_DIRECTORY = path.join(process.cwd(), ".data")
const STORE_FILE = path.join(STORE_DIRECTORY, "short-links.json")
const LINK_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30
const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/

let writeQueue = Promise.resolve()

function isValidDestination(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function normalizeShortLink(value: unknown): ShortLink | null {
  if (!value || typeof value !== "object") return null
  const link = value as Record<string, unknown>

  if (
    typeof link.url !== "string" ||
    !isValidDestination(link.url) ||
    typeof link.expiresAt !== "number" ||
    !Number.isFinite(link.expiresAt)
  ) {
    return null
  }

  return {
    url: link.url,
    expiresAt: link.expiresAt,
    title:
      typeof link.title === "string" ? link.title.slice(0, 180) : null,
    description:
      typeof link.description === "string"
        ? link.description.slice(0, 320)
        : null,
    image:
      typeof link.image === "string" && isValidDestination(link.image)
        ? link.image
        : null,
    platformLabel:
      typeof link.platformLabel === "string"
        ? link.platformLabel.slice(0, 40)
        : null,
  }
}

async function readStore(): Promise<ShortLinkStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("O armazenamento de links está corrompido.")
    }

    const store: ShortLinkStore = {}
    for (const [code, value] of Object.entries(data)) {
      const link = normalizeShortLink(value)
      if (CODE_PATTERN.test(code) && link) store[code] = link
    }
    return store
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {}
    }

    throw new Error(
      "Não foi possível ler o armazenamento de links. Verifique .data/short-links.json.",
      { cause: error },
    )
  }
}

async function writeStore(store: ShortLinkStore) {
  await mkdir(STORE_DIRECTORY, { recursive: true })
  const temporaryFile = `${STORE_FILE}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`
  try {
    await writeFile(temporaryFile, JSON.stringify(store), "utf8")
    await rename(temporaryFile, STORE_FILE)
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => undefined)
    throw error
  }
}

function createCode() {
  return randomBytes(6).toString("base64url")
}

export async function createShortLink(
  data: Omit<ShortLink, "expiresAt">,
): Promise<string> {
  if (!isValidDestination(data.url)) {
    throw new Error("Não foi possível encurtar o destino.")
  }

  let code = ""

  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const now = Date.now()
    const store = await readStore()

    for (const [storedCode, link] of Object.entries(store)) {
      if (link.expiresAt < now) delete store[storedCode]
      if (link.url === data.url && link.expiresAt >= now) {
        code = storedCode
      }
    }

    if (!code) {
      do {
        code = createCode()
      } while (store[code])
    }

    store[code] = {
      ...data,
      expiresAt: now + LINK_LIFETIME_MS,
    }

    await writeStore(store)
  })

  try {
    await writeQueue
  } catch (error) {
    throw new Error(
      "Não foi possível salvar o link curto no armazenamento.",
      { cause: error },
    )
  }
  return code
}

export async function readShortLink(code: string): Promise<ShortLink | null> {
  if (!CODE_PATTERN.test(code)) return null

  let store: ShortLinkStore
  try {
    store = await readStore()
  } catch {
    return null
  }
  const link = store[code]

  if (!link || link.expiresAt < Date.now() || !isValidDestination(link.url)) {
    return null
  }

  return link
}
