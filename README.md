# Bridge Middleware - Deploy no Render

Este middleware é a ponte entre a Base 44 e serviços externos (Telegram, WhatsApp, scraping, filas).

## Endpoints principais
- GET  /bridge/health
- POST /bridge/sendMessage
- POST /bridge/scrape
- POST /bridge/enqueue
- POST /bridge/scheduled-task

## Variáveis de ambiente mínimas
- BRIDGE_TOKEN (obrigatório)
- SELF_URL (ex.: https://bridge-seunome.onrender.com) — atualize após deploy
- TELEGRAM_BOT_TOKEN (opcional)
- WHATSAPP_API_URL (opcional)
- WHATSAPP_API_KEY (opcional)
- SCRAPER_SERVICE_URL (opcional)
- JOBS_SERVICE_URL (opcional)
- SQS_QUEUE_URL / AWS_REGION (opcional se usar SQS)
- REPORT_SERVICE_URL (opcional)

## Testes rápidos
1. Health:
