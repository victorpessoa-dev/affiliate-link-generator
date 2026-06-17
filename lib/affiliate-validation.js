import "server-only";
export function validateAffiliateId(platform) {
    const shopeeId = process.env.SHOPEE_AFFILIATE_ID ||
        process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_ID ||
        "";
    const meliId = process.env.MELI_AFFILIATE_ID ||
        process.env.NEXT_PUBLIC_MELI_AFFILIATE_ID ||
        "";
    if (platform === "shopee") {
        const isValid = shopeeId.length > 0 && !shopeeId.startsWith("SEU_ID");
        return {
            isValid,
            platform,
            id: shopeeId,
            configured: isValid,
            message: isValid
                ? `✓ ID Shopee configurado: ${shopeeId}`
                : "✗ ID Shopee não configurado. Configure SHOPEE_AFFILIATE_ID no .env.local",
        };
    }
    if (platform === "mercadolivre") {
        const isValid = meliId.length > 0 && !meliId.startsWith("SEU_ID");
        return {
            isValid,
            platform,
            id: meliId,
            configured: isValid,
            message: isValid
                ? `✓ ID Mercado Livre configurado: ${meliId}`
                : "✗ ID Mercado Livre não configurado. Configure MELI_AFFILIATE_ID no .env.local",
        };
    }
    return {
        isValid: false,
        platform,
        id: "",
        configured: false,
        message: `Plataforma desconhecida: ${platform}`,
    };
}
export function validateAllAffiliateIds() {
    const shopeeValidation = validateAffiliateId("shopee");
    const meliValidation = validateAffiliateId("mercadolivre");
    const allConfigured = shopeeValidation.configured && meliValidation.configured;
    return {
        shopee: shopeeValidation,
        mercadolivre: meliValidation,
        allConfigured,
        summary: `${allConfigured ? "✓" : "✗"} IDs de afiliado: ${[shopeeValidation.message, meliValidation.message].filter((m) => m).join(" | ")}`,
    };
}
/**
 * Verifica se uma URL contém os parâmetros de afiliado esperados
 */
export function hasAffiliateParams(url, platform) {
    try {
        const urlObj = new URL(url);
        if (platform === "shopee") {
            // Shopee pode usar af_siteid, utm_campaign, ou outros parâmetros
            return (urlObj.searchParams.has("af_siteid") ||
                urlObj.searchParams.has("utm_campaign") ||
                urlObj.searchParams.has("utm_source"));
        }
        if (platform === "mercadolivre") {
            // Mercado Livre usa matt_word ou tracking_id
            return (urlObj.searchParams.has("matt_word") ||
                urlObj.searchParams.has("tracking_id"));
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * Extrai o ID de afiliado de uma URL
 */
export function extractAffiliateId(url, platform) {
    try {
        const urlObj = new URL(url);
        if (platform === "shopee") {
            return urlObj.searchParams.get("af_siteid") || urlObj.searchParams.get("utm_campaign") || null;
        }
        if (platform === "mercadolivre") {
            return urlObj.searchParams.get("matt_word") || null;
        }
        return null;
    }
    catch {
        return null;
    }
}
