# Webex Bot for CXTM Triage

Node.js Webex bot that bridges CXTM test notifications with the n8n automation workflow.

## Features

- Listens for @mentions with test results from CXTM
- Handles Adaptive Card button clicks (Create Jira, Apply Fix, Reset Device)
- Forwards actions to n8n webhooks

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Run the bot
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOTTOKEN` | Webex bot access token |
| `WEBHOOKURL` | Public URL for webhooks (e.g., ngrok) |
| `PORT` | Port to listen on (default: 3001) |
| `N8N_WEBHOOK_URL` | n8n webhook for test failures |

## Development

For local development, use ngrok to expose the bot:

```bash
ngrok http 3001
```

Then set `WEBHOOKURL` to the ngrok URL.
