const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(bodyParser.json({ limit: '200kb' }));
app.use(rateLimit({ windowMs: 10 * 1000, max: 60 }));

// Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = process.env.BRIDGE_TOKEN || 'changeme';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', error: 'missing auth' });
  }

  const provided = authHeader.slice(7);
  if (provided !== token) {
    return res.status(403).json({ status: 'error', error: 'forbidden' });
  }

  next();
}

function ok(res, data) {
  return res.json({ status: 'ok', data });
}

function err(res, message, code = 500) {
  return res.status(code).json({ status: 'error', error: message });
}

// Health endpoint
app.get('/bridge/health', (req, res) => {
  ok(res, { uptime: process.uptime() });
});

// SendMessage
app.post('/bridge/sendMessage', auth, async (req, res) => {
  try {
    const { channel, target, message, meta } = req.body || {};

    if (!channel || !target || !message) {
      return err(res, 'missing fields', 400);
    }

    // Telegram
    if (channel === 'telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return err(res, 'telegram token not configured', 500);

      const tgRes = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: target,
          text: message,
          parse_mode: meta?.parse_mode || 'Markdown',
        },
        { timeout: 10000 }
      );

      return ok(res, { provider: 'telegram', providerResponse: tgRes.data });
    }

    // WhatsApp
    if (channel === 'whatsapp') {
      const waUrl = process.env.WHATSAPP_API_URL;
      const waKey = process.env.WHATSAPP_API_KEY;

      if (!waUrl || !waKey) return err(res, 'whatsapp not configured', 500);

      const wRes = await axios.post(
        `${waUrl}/messages`,
        {
          to: target,
          type: 'text',
          text: { body: message },
        },
        {
          headers: { Authorization: `Bearer ${waKey}` },
          timeout: 10000,
        }
      );

      return ok(res, { provider: 'whatsapp', providerResponse: wRes.data });
    }

    return err(res, 'no provider configured for channel', 500);
  } catch (e) {
    logger.error(e, 'sendMessage error');
    return err(res, e.message || 'send failed');
  }
});

// Scrape
app.post('/bridge/scrape', auth, async (req, res) => {
  try {
    const { targetUrl, type, options } = req.body || {};

    if (!targetUrl) return err(res, 'missing targetUrl', 400);

    if (process.env.SCRAPER_SERVICE_URL) {
      const sRes = await axios.post(
        process.env.SCRAPER_SERVICE_URL,
        { url: targetUrl, type, options },
        { timeout: 20000 }
      );

      return ok(res, { source: 'scraper-service', result: sRes.data });
    }

    return err(res, 'no scraping backend configured', 500);
  } catch (e) {
    logger.error(e, 'scrape error');
    return err(res, e.message || 'scrape failed');
  }
});

// Enqueue
app.post('/bridge/enqueue', auth, async (req, res) => {
  try {
    const { queue, payload, delaySeconds } = req.body || {};

    if (!queue || !payload) return err(res, 'missing fields', 400);

    if (process.env.JOBS_SERVICE_URL) {
      const r = await axios.post(
        `${process.env.JOBS_SERVICE_URL}/jobs`,
        { queue, payload, delaySeconds },
        { timeout: 5000 }
      );

      return ok(res, r.data);
    }

    return err(res, 'no queue backend configured', 500);
  } catch (e) {
    logger.error(e, 'enqueue error');
    return err(res, e.message || 'enqueue failed');
  }
});

// Scheduled tasks
app.post('/bridge/scheduled-task', auth, async (req, res) => {
  try {
    const { task, payload } = req.body || {};

    if (!task) return err(res, 'missing task', 400);

    if (task === 'daily-summary') {
      if (!process.env.REPORT_SERVICE_URL) {
        return err(res, 'report service missing', 500);
      }

      const r = await axios.post(
        `${process.env.REPORT_SERVICE_URL}/generate`,
        { payload },
        { timeout: 20000 }
      );

      return ok(res, { task, result: r.data });
    }

    return err(res, 'no scheduled backend configured', 500);
  } catch (e) {
    logger.error(e, 'scheduled-task error');
    return err(res, e.message || 'task failed');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err, 'unhandled');
  return res
    ? res.status(500).json({ status: 'error', error: err.message })
    : next();
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info({ port }, 'Middleware Bridge running');
});
