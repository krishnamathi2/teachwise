// frontend/pages/api/generate.js

const DEFAULT_BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3001';

const REQUEST_TIMEOUT_MS = parseInt(
  process.env.GENERATE_TIMEOUT_MS || process.env.OPENAI_REQ_TIMEOUT_MS || '120000',
  10
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  }

  const backendUrl = new URL('/generate', DEFAULT_BACKEND_URL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = backendResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await backendResponse.json().catch((err) => {
        console.error('[GENERATE] Failed to parse backend JSON:', err);
        return { ok: false, message: 'Invalid response payload from backend.' };
      });
      return res.status(backendResponse.status).json(payload);
    }

    const text = await backendResponse.text();
    return res.status(backendResponse.status).send(text);
  } catch (error) {
    clearTimeout(timeout);
    const reason = error.name === 'AbortError' ? 'BACKEND_TIMEOUT' : 'BACKEND_UNAVAILABLE';
    console.error('[GENERATE] Proxy error:', error);
    return res.status(502).json({
      ok: false,
      code: reason,
      message:
        reason === 'BACKEND_TIMEOUT'
          ? 'Backend request timed out. Please try again.'
          : 'Backend is unavailable. Please try again shortly.',
    });
  }
}
