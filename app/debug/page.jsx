import Link from "next/link"
import { AffiliateDebugPanel } from "@/components/affiliate-debug-panel"

export const metadata = {
  title: "Status de Afiliação",
  robots: "noindex, nofollow",
}

export default function StatusPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-background via-background to-accent/5 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Status de Afiliação</h1>
          <p className="text-muted-foreground">
            Verifique o status de seus IDs de afiliado e visualize logs de conversão
          </p>
        </div>

        {/* Debug Panel */}
        <AffiliateDebugPanel />

        {/* Footer */}
        <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Voltar ao gerador
          </Link>
        </div>
      </div>
    </main>
  )
}
