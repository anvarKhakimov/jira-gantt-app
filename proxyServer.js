const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PROXY_PORT = process.env.REACT_APP_PROXY_PORT;
const PROXY_HOST = process.env.REACT_APP_PROXY_HOST;
const JIRA_URL = process.env.REACT_APP_JIRA_URL;

console.log('Настройки прокси-сервера:');
console.log(`PROXY_PORT: ${PROXY_PORT}`);
console.log(`PROXY_HOST: ${PROXY_HOST}`);
console.log(`JIRA_URL: ${JIRA_URL}`);

// Проверяем, что все необходимые переменные окружения определены
if (!JIRA_URL) {
  console.error('Ошибка: JIRA_URL не указан в переменных окружения');
  process.exit(1);
}

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
