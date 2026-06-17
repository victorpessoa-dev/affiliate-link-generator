"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RotateCcw,
  Wand2,
} from "lucide-react"
import { convertToAffiliateLink } from "@/lib/affiliate"
import { useHistory } from "@/lib/use-history"
import { truncate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HistoryList } from "@/components/history-list"
import { PlatformLogo } from "@/components/platform-logo"
import { SafeImage } from "@/components/safe-image"

export function AffiliateConverter() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [statusOk, setStatusOk] = useState(true)
  const requestController = useRef(null)
  const copiedTimer = useRef(null)
  const history = useHistory()

  useEffect(() => {
    return () => {
      requestController.current?.abort()
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  // Check affiliate status on mount
  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setStatusOk(data.status === "ok"))
      .catch(() => setStatusOk(false))
  }, [])

  async function handleConvert(event) {
    event.preventDefault()
    setError(null)
    setCopied(false)
    setIsConverting(true)
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller

    try {
      const converted = await convertToAffiliateLink(input, controller.signal)
      setResult(converted)
      history.add({
        platform: converted.platform,
        platformLabel: converted.platformLabel,
        originalUrl: converted.originalUrl,
        affiliateUrl: converted.affiliateUrl,
        redirectUrl: converted.redirectUrl,
        product: converted.product,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setResult(null)
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.")
    } finally {
      if (requestController.current === controller) {
        requestController.current = null
        setIsConverting(false)
      }
    }
  }

  async function copyResult() {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result.redirectUrl)
      setCopied(true)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar o link. Selecione e copie manualmente.")
    }
  }

  function clearInput() {
    setInput("")
    setError(null)
    setResult(null)
    setCopied(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Status Warning */}
      {!statusOk && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">IDs de Afiliado Não Configurados</p>
            <p className="text-sm text-red-700 mt-1">
              Configure SHOPEE_AFFILIATE_ID e MELI_AFFILIATE_ID no .env.local para garantir sua comissão.
            </p>
            <Link
              href="/debug"
              className="text-sm font-medium text-red-700 hover:underline mt-2 inline-block"
            >
              Verificar status →
            </Link>
          </div>
        </div>
      )}
      <Card className="converter-card overflow-visible p-5 sm:p-6">
        <form onSubmit={handleConvert} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="original-link">Link original</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="input-wrap relative flex-1">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="original-link"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Cole aqui o link da Shopee ou do Mercado Livre"
                  className="h-11 border-primary/15 bg-background/80 pl-9 pr-10 shadow-sm transition-all focus-visible:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_12%,transparent)]"
                  autoComplete="off"
                  inputMode="url"
                  spellCheck={false}
                  required
                  disabled={isConverting}
                />
                {input && !isConverting && (
                  <button
                    type="button"
                    onClick={clearInput}
                    className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Limpar campo de URL"
                    title="Limpar URL"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className="generate-button h-11 gap-2 px-5 shadow-lg shadow-primary/20"
                disabled={isConverting}
              >
                {isConverting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {isConverting ? "Gerando..." : "Gerar link"}
              </Button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {result && (
          <div
            aria-live="polite"
            className="result-enter mt-6 overflow-hidden rounded-xl border border-border bg-muted/40"
          >
            <div className="grid sm:grid-cols-[180px_1fr]">
              <div className="relative min-h-40 overflow-hidden bg-muted">
                <SafeImage
                  src={result.product?.image}
                  alt={result.product?.title || "Produto encontrado"}
                  className="h-full min-h-40 w-full object-cover transition-transform duration-500 hover:scale-105"
                  fallbackClassName="min-h-40"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-background p-1 pr-2 shadow-sm ring-1 ring-border">
                      <PlatformLogo
                        platform={result.platform}
                        platformLabel={result.platformLabel}
                        size="sm"
                        showLabel
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Link com carregamento
                    </span>
                  </div>
                  <h2 className="mt-3 text-pretty font-semibold">
                    {result.product?.title || "Link de afiliado gerado"}
                  </h2>
                  {result.product?.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {result.product.description}
                    </p>
                  )}
                  {result.product?.price && (
                    <p className="mt-3 text-lg font-bold text-primary">
                      {result.product.currency || "R$"} {result.product.price}
                    </p>
                  )}
                </div>

                <p className="break-all rounded-md bg-background px-3 py-2 font-mono text-xs">
                  {truncate(result.redirectUrl, 80)}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={copyResult}
                    variant="secondary"
                    className="action-button gap-2 sm:w-auto"
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<a href={result.redirectUrl} target="_blank" rel="noreferrer" />}
                    className="action-button gap-2 shadow-md shadow-primary/15 sm:w-auto"
                  >
                    Abrir link
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <HistoryList history={history} />
    </div>
  )
}
