import Link from "next/link"
import { readRedirectToken } from "@/lib/redirect-token"
import { RedirectScreen } from "@/components/redirect-screen"
import { createOfferMetadata } from "@/lib/site-metadata"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata({ searchParams }) {
  const { token } = await searchParams
  const payload = typeof token === "string" ? readRedirectToken(token) : null

  if (!payload) {
    return createOfferMetadata({
      title: "Link inválido ou expirado",
      description: "Este link não está mais disponível.",
    })
  }

  return createOfferMetadata(payload)
}

export default async function RedirectPage({ searchParams }) {
  const { token } = await searchParams
  const payload = typeof token === "string" ? readRedirectToken(token) : null

  if (!payload) {
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
