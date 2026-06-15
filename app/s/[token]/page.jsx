import Link from "next/link"
import { cache } from "react"
import { RedirectScreen } from "@/components/redirect-screen"
import { readShortLink } from "@/lib/short-links"
import { createOfferMetadata } from "@/lib/site-metadata"

export const dynamic = "force-dynamic"
export const revalidate = 0

const getShortLink = cache(readShortLink)

export async function generateMetadata({ params }) {
  const { token } = await params
  const payload = await getShortLink(token)

  if (!payload) {
    return createOfferMetadata({
      title: "Link curto inválido ou expirado",
      description: "Este link curto não está mais disponível.",
    })
  }

  return createOfferMetadata({
    ...payload,
    canonicalPath: `/s/${token}`,
  })
}

export default async function ShortLinkPage({ params }) {
  const { token } = await params
  const payload = await getShortLink(token)

  if (!payload) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <div className="redirect-enter max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Link curto inválido ou expirado</h1>
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
