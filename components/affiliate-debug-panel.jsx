"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function AffiliateDebugPanel() {
  const [status, setStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/debug/logs?count=20"),
      ])

      if (!statusRes.ok || !logsRes.ok) {
        throw new Error("Erro ao buscar dados")
      }

      const statusData = await statusRes.json()
      const logsData = await logsRes.json()

      setStatus(statusData)
      setLogs(logsData.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 10000) // Atualizar a cada 10s
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando informações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Status dos IDs de Afiliado</h2>
          <Button
            onClick={refreshData}
            disabled={loading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {status && (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-3 rounded-lg p-4 ${
                status.status === "ok"
                  ? "bg-green-50 text-green-900"
                  : "bg-red-50 text-red-900"
              }`}
            >
              {status.status === "ok" ? (
                <CheckCircle2 className="size-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="size-5 flex-shrink-0" />
              )}
              <span className="font-medium">{status.summary}</span>
            </div>

            {/* Platform Details */}
            <div className="grid gap-3 sm:grid-cols-2">
              {status.details.shopee && (
                <div
                  className={`rounded-lg border p-3 ${
                    status.details.shopee.configured
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">Shopee</p>
                      <p
                        className={`text-sm ${
                          status.details.shopee.configured
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {status.details.shopee.message}
                      </p>
                      {status.details.shopee.configured && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ID: <code className="font-mono">{status.details.shopee.id}</code>
                        </p>
                      )}
                    </div>
                    {status.details.shopee.configured && (
                      <button
                        onClick={() => copyToClipboard(status.details.shopee.id)}
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        title="Copiar ID"
                      >
                        <Copy className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {status.details.mercadolivre && (
                <div
                  className={`rounded-lg border p-3 ${
                    status.details.mercadolivre.configured
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">Mercado Livre</p>
                      <p
                        className={`text-sm ${
                          status.details.mercadolivre.configured
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {status.details.mercadolivre.message}
                      </p>
                      {status.details.mercadolivre.configured && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ID: <code className="font-mono">{status.details.mercadolivre.id}</code>
                        </p>
                      )}
                    </div>
                    {status.details.mercadolivre.configured && (
                      <button
                        onClick={() => copyToClipboard(status.details.mercadolivre.id)}
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        title="Copiar ID"
                      >
                        <Copy className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Recent Logs */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Logs Recentes</h2>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 text-sm ${
                  log.level === "error"
                    ? "border-red-200 bg-red-50"
                    : log.level === "warn"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium hover:underline">
                          Detalhes
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-2 text-xs">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded px-2 py-1 text-xs font-semibold uppercase ${
                      log.level === "error"
                        ? "bg-red-200 text-red-900"
                        : log.level === "warn"
                          ? "bg-yellow-200 text-yellow-900"
                          : "bg-blue-200 text-blue-900"
                    }`}
                  >
                    {log.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50/50">
        <h3 className="mb-3 font-semibold">Como garantir a comissão</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Ambos os IDs devem estar configurados (status verde)</li>
          <li>✓ Cada link gerado incluirá automaticamente seu ID de afiliado</li>
          <li>✓ Monitore os logs para confirmar que o ID está sendo adicionado</li>
          <li>✓ Compartilhe apenas links gerados por esta ferramenta</li>
        </ul>
      </Card>
    </div>
  )
}
