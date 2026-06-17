export async function convertToAffiliateLink(rawUrl, signal) {
    const response = await fetch("/api/affiliate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: rawUrl }),
        signal,
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Não foi possível gerar o link.");
    }
    return data;
}
