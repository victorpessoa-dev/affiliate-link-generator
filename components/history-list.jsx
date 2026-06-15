"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Check, Copy, History, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlatformLogo } from "@/components/platform-logo"
import { SafeImage } from "@/components/safe-image"

export function HistoryList({ history }) {
  const { items, loaded, remove, clear } = history
  const [copiedId, setCopiedId] = useState(null)
  const copiedTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  async function copy(id, url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(null)
    }
  }

  if (!loaded) return null

  return (
    <section className="history-section flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Histórico</h2>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">({items.length})</span>
          )}
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-muted-foreground hover:text-destructive"
          >
            Limpar tudo
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-sm font-medium">Nenhum link gerado ainda</p>
          <p className="text-sm text-muted-foreground">
            Os links que você gerar aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="history-enter history-card overflow-hidden"
            >
              <div className="flex gap-4 px-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <SafeImage
                    src={item.product?.image}
                    alt={item.product?.title || ""}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <PlatformLogo
                      platform={item.platform}
                      platformLabel={item.platformLabel}
                      size="sm"
                      showLabel
                    />
                    <time className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">
                    {item.product?.title || "Link de afiliado"}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {item.shortUrl || item.redirectUrl || item.affiliateUrl}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    copy(
                      item.id,
                      item.shortUrl || item.redirectUrl || item.affiliateUrl,
                    )
                  }
                >
                  {copiedId === item.id ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedId === item.id ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={item.shortUrl || item.redirectUrl || item.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  className="gap-2"
                >
                  <ArrowUpRight className="size-3.5" />
                  Abrir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
