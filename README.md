# Orion — Customer Intelligence Platform

**An AI-powered, multi-agent platform for customer analytics, churn intelligence, and data-driven business decisions.**

Orion transforms customer data into actionable business insights through a full-stack analytics dashboard, a multi-agent intelligence pipeline, and natural-language interaction powered by Groq.

Built with **Python, FastAPI, React, TypeScript, SQLite, machine learning, and Groq**.

---

## Overview

Businesses generate customer data across purchases, subscriptions, support interactions, feedback, and marketing campaigns. However, these data sources often remain disconnected, making it difficult to understand customer behavior, identify churn risks, and prioritize retention efforts.

**Orion — Customer Intelligence Platform** brings these capabilities together in a single workspace-based application. It combines data processing, analytical agents, machine learning, and LLM-assisted explanations to help users understand customer behavior and make informed decisions.

The platform supports both synthetic demo scenarios and custom customer datasets uploaded through CSV files.

## Key Features

### Workspace Management
- Create isolated workspaces for different companies or business scenarios.
- Generate synthetic customer datasets or import existing customer profiles.
- Manage workspace access and regenerate or delete workspaces.
- Keep workspace data isolated using separate SQLite databases.

### Customer Intelligence
- **Customer 360:** Explore individual customer profiles and behavioral information.
- **Segmentation:** Identify customer groups based on relevant behavioral and business attributes.
- **Churn & Retention:** Analyze churn risk and identify customers who may need intervention.
- **Sentiment & Support:** Explore support interactions, customer feedback, and sentiment indicators.
- **Recommendations:** Surface actionable retention and engagement recommendations.
- **Agent Audit:** Inspect analytical outputs and available audit information.

### AI-Powered Ask Orion
Ask Orion provides a natural-language interface for supported customer analytics questions.

Users can ask questions about customer segments, revenue, churn, and other available workspace metrics. Supported query handlers retrieve or calculate relevant results, while Groq can assist with supported intent routing and natural-language explanations.

Orion combines deterministic analytics with LLM-assisted interaction rather than relying on an LLM to calculate every metric.

### CSV Data Ingestion
- Import UTF-8 customer CSV files.
- Normalize supported customer fields.
- Validate uploaded customer data.
- Generate supporting synthetic activity data to enable the existing analytics pipeline.
- Analyze imported customers alongside generated subscriptions, orders, behavioral events, support tickets, feedback, and campaigns.

The current import interface accepts files containing 100–10,000 rows, subject to validation and available system resources.

### Dataset Export
Download the datasets associated with a completed workspace from the Executive Overview.

The export can include available source tables and derived intelligence outputs as CSV files packaged in a ZIP archive, together with a manifest describing the exported tables and row counts.

This allows users to inspect the generated data, validate analytical results, and reuse synthetic datasets for further experimentation.

---

## System Architecture

```text
                 USER
                  |
                  v
      React + TypeScript + Vite
                  |
          REST API Requests
                  |
                  v
          FastAPI Backend
                  |
       Workspace Management
                  |
                  v
       Workspace Data Layer
                  |
       +----------+----------+
       |                     |
       v                     v
 Workspace Metadata     Workspace SQLite
       Database          Databases
                             |
                             v
                    Customer Data Pipeline
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
     Data Processing    ML / Analytics     Intelligence
                                            Agents
          |                  |                  |
          +------------------+------------------+
                             |
                             v
                    Computed Insights
                             |
                +------------+------------+
                |                         |
                v                         v
          Analytics Dashboard        Ask Orion
                                          |
                                          v
                                     Groq API
                              (supported LLM tasks)
```

### Architecture Principles

- **Workspace isolation:** Each workspace maintains its own SQLite database.
- **Separation of concerns:** API routes, business logic, analytical agents, database models, and frontend components are separated.
- **Deterministic analytics:** Metrics and analytical outputs are calculated from available data using application logic and statistical or machine-learning methods.
- **LLM-assisted interaction:** Groq supports selected natural-language tasks; it does not replace the underlying data processing pipeline.
- **Data traceability:** Exportable tables and audit information help users inspect the inputs and outputs of the analytical workflow.

See [ARCHITECTURE.md](ARCHITECTURE.md) for more implementation details.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| UI & Visualization | Tailwind CSS, Recharts, Lucide React |
| State & Data Fetching | TanStack Query, React Router |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| ORM & Validation | SQLAlchemy, Pydantic |
| Database | SQLite |
| Data Processing | Pandas, NumPy |
| Machine Learning | scikit-learn, SHAP |
| AI Integration | Groq API |
| Testing | pytest, pytest-asyncio, frontend test scripts |
| Deployment | Docker, Railway-compatible configuration |

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/pushpakkk-creates/Orion-Customer-Intelligence-Platform.git
cd Orion-Customer-Intelligence-Platform
```

If you are using a different repository URL, replace the URL above with your repository's clone URL.

### 2. Configure Environment Variables

From the project root, create the backend environment file:

**Windows PowerShell**

```powershell
Copy-Item .env.example backend\.env
```

Open `backend/.env` and configure the following values:

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

ADMIN_API_TOKEN=

APP_ENV=development
LOG_LEVEL=INFO

MAX_WORKSPACES=25
MAX_DEMO_WORKSPACES=25
MAX_CONCURRENT_GENERATIONS=1
```

Replace the Groq key placeholder with your actual key from the [Groq Console](https://console.groq.com/keys).

Keep API keys and other secrets private. Never commit `.env` files or expose backend API keys in frontend code.

For the default local owner workflow, leave `ADMIN_API_TOKEN` empty and configure owner access through the application's Workspaces screen. Set it only when using the advanced deployment-level admin-token configuration.

### 3. Start the Backend

Open a terminal in the project root:

```powershell
cd backend

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -e ".[dev]"

python -m uvicorn app.main:app --reload --port 8000
```

On macOS or Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

The backend API is available at:

- API: http://localhost:8000
- Interactive API documentation: http://localhost:8000/docs
- Health endpoint: http://localhost:8000/api/health

Keep the backend terminal running.

### 4. Start the Frontend

Open a second terminal from the project root:

```bash
cd frontend

npm install
npm run dev
```

Open the application at:

**http://localhost:5173**

During local development, the Vite configuration proxies API requests to the backend.

### 5. Explore Orion

You can now:

1. Start a demo workspace to explore the application.
2. Enter Owner Mode to manage workspaces.
3. Generate a synthetic customer dataset or upload a supported CSV.
4. Explore the dashboard and customer intelligence modules.
5. Ask Orion supported natural-language questions.
6. Download available datasets after generation completes.

---

## Using Your Own Customer Data

Orion supports custom customer datasets through the workspace creation screen.

The CSV importer expects a UTF-8 file with supported customer fields. Common fields may include:

- Customer ID and customer name
- Email and company information
- Industry and region
- Signup date and subscription tier
- Revenue and order-related fields
- Customer status and churn indicators
- Engagement and satisfaction attributes

The exact fields used by the application depend on its normalization and validation logic.

**Important:** Imported customer profiles and generated activity records are different data sources. Orion can generate synthetic supporting records for an imported customer dataset so the existing analytics pipeline can run. These generated records should not be mistaken for real historical transactions or support interactions.

A sample synthetic dataset is available at:

`examples/orion_indian_customers_1500.csv`

Use it to test the CSV import workflow without uploading real customer information.

---

## How Groq Is Used

Groq provides the LLM integration for supported natural-language tasks in Ask Orion.

The intended workflow is:

1. A user asks a question in natural language.
2. Orion identifies a supported query intent.
3. The application retrieves or calculates relevant information from the workspace.
4. Groq assists with supported language-processing or explanation tasks.
5. Orion presents the resulting answer in the interface.

Not every operation requires an LLM call. Dashboard metrics, database queries, statistical calculations, and other deterministic processing remain part of the application backend.

If no Groq key is configured, mock LLM behavior may be used for supported interactions. A successful dashboard load alone does not establish that a live Groq request was made.

Groq API usage is subject to the provider's model availability, rate limits, and account policies.

---

## Security and Data Handling

Orion includes several security mechanisms:

- Per-workspace access tokens for protected workspace data.
- Owner authentication for workspace management.
- Optional deployment-level admin token configuration.
- Explicit CORS configuration.
- Security response headers.
- Parameterized query handling and controlled query templates.
- Workspace database isolation.
- Git-ignored environment files and runtime databases.

### Security Recommendations

- Never commit API keys, admin tokens, workspace tokens, or real customer data.
- Use synthetic data when demonstrating the application publicly.
- Restrict CORS origins to trusted frontend domains in production.
- Configure strong authentication for private deployments.
- Back up persistent workspace data before deployment changes.
- Review exported CSV files before sharing them.

See [SECURITY.md](SECURITY.md) for the security policy.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Backend Groq API authentication |
| `GROQ_MODEL` | Groq model identifier |
| `ADMIN_API_TOKEN` | Optional deployment-level owner/admin secret |
| `CORS_ORIGINS` | Allowed frontend origins |
| `APP_ENV` | Application environment |
| `LOG_LEVEL` | Logging threshold |
| `MAX_WORKSPACES` | Owner workspace quota |
| `MAX_DEMO_WORKSPACES` | Public demo workspace quota |
| `MAX_CONCURRENT_GENERATIONS` | Concurrent generation limit |
| `PUBLIC_SYNTHETIC_ACCESS` | Controls public synthetic demo access |

The exact defaults and supported options are defined by the application's configuration. Do not assume an environment variable is active merely because it appears in an example file.

---

## Testing and Verification

### Backend

From the `backend` directory, activate the virtual environment and run:

```bash
python -m pytest
```

### Frontend

From the `frontend` directory, run:

```bash
npm run lint
npm test
npm run build
```

These commands check backend tests, frontend linting, application tests, and the production build.

A successful local startup does not guarantee that every feature or deployment configuration has been verified. Test CSV imports, generation, workspace access, Ask Orion, and dataset exports before publishing a production deployment.

---

## Deployment

Orion includes a root-level `Dockerfile` and a `railway.toml` file for Railway-compatible backend deployment.

### Backend Deployment

The Dockerfile builds the Python backend and starts Uvicorn using the port provided by the hosting platform.

For a Railway deployment:

1. Connect the GitHub repository to a Railway project.
2. Configure the backend environment variables.
3. Set `CORS_ORIGINS` to the deployed frontend origin.
4. Configure persistent storage for `/app/data`.
5. Verify the `/api/health` endpoint.
6. Test workspace creation, generation, and database persistence.

**Persistent storage is important:** the workspace metadata and per-workspace SQLite databases are stored on disk. Without a persistent volume, redeployments or instance replacement can result in data loss.

### Frontend Deployment

The frontend can be hosted separately as a static React application.

Configure `VITE_API_BASE_URL` to point to the deployed backend before building the frontend. The backend must allow the frontend's origin through `CORS_ORIGINS`.

Do not configure `VITE_ADMIN_API_TOKEN` for a public frontend. Frontend environment variables prefixed with `VITE_` are exposed to the browser bundle.

Deployment requires configuration in the relevant hosting accounts; having deployment files in the repository does not mean the application is already publicly hosted.

---

## Project Structure

```text
Orion-Customer-Intelligence-Platform/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── security/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── frontend/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       ├── types/
│       └── utils/
├── examples/
│   ├── sample_customers.csv
│   └── orion_indian_customers_1500.csv
├── scripts/
├── data/
├── ARCHITECTURE.md
├── SECURITY.md
├── Dockerfile
├── railway.toml
├── .env.example
└── README.md
```

Runtime databases, local environments, frontend build outputs, and secret configuration files should remain untracked.

---

## Future Improvements

Potential areas for further development include:

- More robust handling of large CSV imports and generation workloads.
- Improved progress reporting and generation error diagnostics.
- Additional customer analytics and forecasting models.
- Richer context-aware follow-up questions in Ask Orion.
- More extensive automated integration tests.
- Enhanced export filtering and dataset validation.

---

## License

See [LICENSE](LICENSE) for the terms governing the use and distribution of this project.

---

**Orion — Customer Intelligence Platform**  
*Turning customer data into actionable intelligence.*
