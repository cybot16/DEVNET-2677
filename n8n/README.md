# n8n Workflow for CXTM Triage

n8n workflow automation for AI-powered test triage.

## Setup

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your CXTM batch IDs and other settings

# Start n8n with Docker
docker compose up -d

# Access n8n at http://localhost:5678
```

## Import the Workflow

1. Open n8n at http://localhost:5678
2. Create a new workflow
3. Click the menu (...) → Import from File
4. Select `workflow.json`
5. Configure credentials (see below)
6. Activate the workflow

## Required Credentials

Configure these in n8n Settings → Credentials:

### 1. CXTM API (HTTP Header Auth)
- **Header Name**: `X-TM2-API-KEY`
- **Header Value**: Your CXTM API key

### 2. Webex (HTTP Bearer Auth)
- **Token**: Your Webex bot token

### 3. Jira (Jira Software Cloud)
- **Email**: Your Jira email
- **API Token**: Jira API token
- **Domain**: your-org.atlassian.net

### 4. GitHub (HTTP Bearer Auth)
- **Token**: GitHub personal access token with repo scope

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CXTM_BASE_URL` | CXTM base URL | `https://cxtm.cisco.com` |
| `CXTM_INTERFACE_DIAG_BATCH_ID` | Interface diagnostic batch | `23083` |
| `CXTM_BGP_DIAG_BATCH_ID` | BGP diagnostic batch | `23082` |
| `CXTM_RESET_BATCH_ID` | Device reset batch | `23084` |
| `CXTM_FIX_JOBFILE_ID` | Fix application jobfile | `836041` |
| `GITHUB_API_URL` | GitHub API URL | `https://api.github.com` |
| `GITHUB_REPO` | Target repo for Robot code | `org/repo` |
| `JIRA_PROJECT_ID` | Jira project ID | `12345` |
| `JIRA_BASE_URL` | Jira base URL | `https://org.atlassian.net` |

## Workflow Overview

The workflow has 4 main flows triggered by different webhook actions:

1. **test_failure** - Initial AI analysis of failed test
2. **create_jira** - Create Jira ticket and run diagnostics
3. **reset_device_config** - Reset device and re-run test
4. **apply_fix** - Push AI fix to GitHub and apply via CXTM
