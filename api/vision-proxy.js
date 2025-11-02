// === K-ETA Vision Proxy (for Google Vision API) ===
// 위치: /api/vision-proxy.js

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } } // 대용량 여권 이미지 허용
};

export default async function handler(req, res) {
  // --- CORS 허용 (워드프레스 도메인만 추가 권장) ---
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- 요청 검증 ---
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { base64, key } = req.body || {};
    const apiKey = process.env.GOOGLE_VISION_KEY || key;

    if (!base64) return res.status(400).json({ success: false, error: "NO_IMAGE" });
    if (!apiKey) return res.status(400).json({ success: false, error: "NO_API_KEY" });

    // --- Vision API 요청 본문 ---
    const body = {
      requests: [{
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["mrz", "en"] }
      }]
    };

    // --- Vision API 호출 ---
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

    // --- 성공 반환 ---
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
