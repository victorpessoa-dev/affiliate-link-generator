import { NextResponse } from "next/server";
import { validateAllAffiliateIds } from "@/lib/affiliate-validation";
export const runtime = "nodejs";
export async function GET() {
    try {
        const validation = validateAllAffiliateIds();
        return NextResponse.json({
            status: validation.allConfigured ? "ok" : "error",
            summary: validation.summary,
            details: {
                shopee: {
                    configured: validation.shopee.configured,
                    id: validation.shopee.configured ? validation.shopee.id : "não configurado",
                    message: validation.shopee.message,
                },
                mercadolivre: {
                    configured: validation.mercadolivre.configured,
                    id: validation.mercadolivre.configured ? validation.mercadolivre.id : "não configurado",
                    message: validation.mercadolivre.message,
                },
            },
            timestamp: new Date().toISOString(),
        }, {
            status: validation.allConfigured ? 200 : 400,
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        return NextResponse.json({
            status: "error",
            message: error instanceof Error ? error.message : "Erro ao validar IDs",
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
