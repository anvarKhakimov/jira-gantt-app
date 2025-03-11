const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_HOST = process.env.PROXY_HOST;
const JIRA_URL = process.env.JIRA_URL;

app.use('/api', (req, res, next) => {
  console.log('\nReceived request:', req.method, req.url);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use('/api', createProxyMiddleware({
  target: JIRA_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/rest/api/2', // Перенаправляем /api на /rest/api/2
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request to:', proxyReq.path);
    console.log('Request method:', proxyReq.method);
    console.log('Request headers:', proxyReq.getHeaders());
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,OPTIONS,POST,PUT';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    console.log('Response status code from target:', proxyRes.statusCode);
    console.log('Response headers from target:', proxyRes.headers);
    proxyRes.on('data', (data) => {
      console.log('Response data from target:', data.toString('utf-8'));
    });
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
}));

app.listen(PROXY_PORT, () => {
  console.log(`Proxy server is running on http://${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`Proxying requests to: ${JIRA_URL}`);
});
