import { NextResponse } from "next/server";
import { getAffiliateConversionLogs } from "@/lib/affiliate-logger";
export const runtime = "nodejs";
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const count = Math.min(parseInt(searchParams.get("count") || "50"), 500);
        const logs = getAffiliateConversionLogs(count);
        return NextResponse.json({
            count: logs.length,
            logs,
            timestamp: new Date().toISOString(),
        }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Erro ao recuperar logs",
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
