export default async function handler(req, res) {
  try {
    const { base64 } = await req.json();
    if (!base64) return res.status(400).json({ ok: false, error: "NO_IMAGE" });

    const VISION_KEY = process.env.VISION_KEY;
    if (!VISION_KEY) return res.status(500).json({ ok: false, error: "MISSING_KEY" });

    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`;

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });

    const json = await resp.json();
    const text = json.responses?.[0]?.fullTextAnnotation?.text || "";
    if (!text) return res.status(200).json({ ok: false, error: "NO_TEXT" });

    res.status(200).json({ ok: true, text });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
