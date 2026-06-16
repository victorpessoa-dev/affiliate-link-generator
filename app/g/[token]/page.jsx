import Link from "next/link"
import { RedirectScreen } from "@/components/redirect-screen"
import { createOfferMetadata } from "@/lib/site-metadata"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

async function getPayload(params) {
  const { token } = params
  if (typeof token !== "string") return null

  try {
    // The app now uses the affiliate URL directly. If an older /g/:token
    // contains an encoded URL, try to decode and validate it.
    const decoded = decodeURIComponent(token)
    try {
      const url = new URL(decoded)
      if (url.protocol === "http:" || url.protocol === "https:") {
        return { url: url.toString(), expiresAt: Date.now() + 1000 * 60 }
      }
    } catch {
      return null
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("decode token error", { token, error: err })
    return null
  }
}

export async function generateMetadata({ params }) {
  const payload = await getPayload(params)

  if (!payload) {
    return createOfferMetadata({
      title: "Link inválido ou expirado",
      description: "Este link não está mais disponível.",
    })
  }

  return createOfferMetadata(payload)
}

export default async function ShortRedirectPage({ params }) {
  const payload = await getPayload(params)

  if (!payload) {
    // Log invalid/expired token for debugging purposes
    // eslint-disable-next-line no-console
    console.error("Invalid or expired redirect token", { token: params?.token })
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <div className="redirect-enter max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gere um novo link para continuar.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Voltar ao gerador
          </Link>
        </div>
      </main>
    )
  }

  return <RedirectScreen payload={payload} />
}
