# DEVNET-2677: The Journey to Autonomous Network Excellence with AI Agentic Workflows

> **Cisco Live Amsterdam 2026**

## 👥 Authors

- **Sabry Abdellah** - Customer Delivery Architect @ Cisco CX
- **Mark Culverhouse** - Principal Architect @ Cisco CX

---

This repository contains the demo code for the DEVNET-2677 session, showcasing an AI-powered autonomous test triage system that integrates:

- **CXTM** (CX Test Management) - Cisco's test automation platform
- **n8n** - Workflow automation
- **Webex** - Team collaboration and notifications
- **Jira** - Issue tracking
- **GitHub Copilot** - AI-powered analysis and fix generation

## 🎯 What This Demo Does

1. **Detects Test Failures** - CXTM notifies a Webex bot when tests fail
2. **AI Analysis** - GitHub Copilot analyzes logs and identifies root cause
3. **Diagnostic Tests** - Automatically runs BGP and Interface diagnostics
4. **AI-Generated Fixes** - Generates Robot Framework code to fix issues
5. **Automated Remediation** - Pushes fixes to Git and triggers CXTM to apply them
6. **Jira Integration** - Creates and updates tickets throughout the process

## 📁 Repository Structure

```
├── webex-bot/              # Webex Bot (Node.js)
│   ├── index.js            # Main bot code
│   ├── package.json
│   └── .env.example        # Environment variables template
│
├── n8n/                    # n8n Workflow Automation
│   ├── workflow.json       # CXTM Triage workflow (import into n8n)
│   ├── docker-compose.yml  # n8n with Python runner
│   └── .env.example        # Environment variables template
│
├── robot/                  # Robot Framework Examples
│   └── fix.robot           # Example AI-generated fix template
│
└── docs/                   # Documentation
    └── architecture.md     # System architecture
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Webex Bot Token ([developer.webex.com](https://developer.webex.com))
- CXTM API Key
- Jira Cloud account
- GitHub repository for Robot code

### 1. Clone the Repository

```bash
git clone https://github.com/cybot16/DEVNET-2677.git
cd DEVNET-2677
```

### 2. Set Up the Webex Bot

```bash
cd webex-bot
cp .env.example .env
# Edit .env with your values
npm install
npm start
```

### 3. Set Up n8n

```bash
cd n8n
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### 4. Import the Workflow

1. Open n8n at http://localhost:5678
2. Create a new workflow
3. Import `workflow.json`
4. Configure credentials (CXTM API, Webex, Jira, GitHub)
5. Activate the workflow

## ⚙️ Configuration

### Environment Variables

See `.env.example` files in each directory for required configuration.

### n8n Credentials

You'll need to configure these credentials in n8n:

| Credential | Type | Purpose |
|------------|------|---------|
| CXTM API | HTTP Header Auth | `X-TM2-API-KEY` header |
| Webex | Bearer Token | Bot token for messages |
| Jira | Basic Auth | Jira Cloud API |
| GitHub | Bearer Token | Push Robot code |

## 🔧 Customization

### CXTM Batch IDs

Update these environment variables with your CXTM batch/jobfile IDs:

- `CXTM_INTERFACE_DIAG_BATCH_ID` - Interface diagnostic test batch
- `CXTM_BGP_DIAG_BATCH_ID` - BGP diagnostic test batch
- `CXTM_RESET_BATCH_ID` - Device reset batch
- `CXTM_FIX_JOBFILE_ID` - Fix application jobfile

### AI Prompt

The AI analysis prompt is embedded in the n8n workflow. You can customize it in the "AI Agent" nodes to match your test environment.

## 📚 Resources

- [CXTM Documentation](https://cxtm.cisco.com)
- [n8n Documentation](https://docs.n8n.io)
- [Webex Bot Framework](https://github.com/WebexCommunity/webex-node-bot-framework)
- [Robot Framework](https://robotframework.org)

## 🤝 Contributing

This is a demo repository for educational purposes. Feel free to fork and adapt for your own use cases.

## 📄 License

CISCO SAMPLE CODE LICENSE - See [LICENSE](LICENSE) for details.

---

**Cisco Live Amsterdam 2026** | Session DEVNET-2677
