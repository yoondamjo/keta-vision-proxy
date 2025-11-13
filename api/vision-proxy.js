// === K-ETA Vision Proxy (for Google Vision API) ===
// 위치: /api/vision-proxy.js

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

export default async function handler(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { base64 } = req.body || {};
    const apiKey = process.env.GOOGLE_VISION_KEY; // 🔒 프런트 key 제거, 서버 환경변수만 사용

    if (!base64) return res.status(400).json({ success: false, error: "NO_IMAGE" });
    if (!apiKey) return res.status(400).json({ success: false, error: "NO_API_KEY" });

    const body = {
      requests: [{
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["mrz", "en"] }
      }]
    };

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const text = data?.responses?.[0]?.fullTextAnnotation?.text || "";
    const tokens = data?.responses?.[0]?.textAnnotations || [];

    if (!text && (!tokens || tokens.length === 0)) {
      return res.status(200).json({ success: false, error: "NO_TEXT" });
    }

    return res.status(200).json({
      success: true,
      data: { text, tokens },
      meta: { length: text.length, tokenCount: tokens.length }
    });

  } catch (err) {
    console.error("❌ Vision Proxy Error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}
