import httpProxy from 'http-proxy';

// Create proxy server once
const proxy = httpProxy.createProxyServer();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Forward /api/admin/* to backend admin endpoints
  const target = process.env.BACKEND_URL || 'http://localhost:3003';
  req.url = req.url.replace(/^\/api/, '');
  proxy.web(req, res, { target }, (e) => {
    console.error('Proxy error:', e);
    res.status(500).json({ error: 'Proxy error', detail: String(e) });
  });
}
