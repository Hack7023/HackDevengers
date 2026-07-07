# 🏛️ CivicGuard AI — GenAI-Powered Civic Platform

> **Team:** HackDevengers · **Event:** Hackathon 2026 · **Repo:** [github.com/Hack7023/HackDevengers](https://github.com/Hack7023/HackDevengers)

---

## 📌 The Problem

Millions of citizens interact with government services every day — but the experience is:

| Pain Point | Impact |
|---|---|
| 🔤 **Complex legal / bureaucratic language** | Citizens cannot understand what documents they need |
| 📞 **No 24/7 assistance** | Queries go unanswered outside office hours |
| 📋 **Opaque complaint tracking** | No visibility into whether issues have been actioned |
| 🌐 **Language barriers** | English-only portals exclude non-English speakers |
| 📍 **Manual location reporting** | Citizens struggle to accurately report civic issues |

> **Result:** Frustrated citizens, under-reported civic issues, and low trust in local government.

---

## 💡 The Solution — CivicGuard AI

**CivicGuard AI** is a full-stack, GenAI-powered civic platform that puts an intelligent assistant in every citizen's pocket. It:

- 📄 **Simplifies** complex government documents into plain-language summaries
- 🤖 **Answers** citizen queries 24/7 using a Retrieval-Augmented Generation (RAG) chatbot
- 📍 **Accepts** geolocated civic issue reports and tracks their resolution lifecycle
- 🌏 **Speaks** both **English and Hindi** — with instant in-app toggle

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CITIZEN BROWSER                       │
│         React (Vite + TypeScript + react-i18next)        │
└──────────────────────┬──────────────────────────────────┘
                       │  REST API (port 5000)
┌──────────────────────▼──────────────────────────────────┐
│              NODE.JS BACKEND GATEWAY                     │
│          Express · Mongoose · TypeScript                 │
│   ┌──────────────┬────────────┬─────────────────────┐   │
│   │ /api/users   │/api/compla-│    /api/chat         │   │
│   │  CRUD        │   ints     │  Proxy → AI Service  │   │
│   └──────┬───────┴──────┬─────┴──────────┬──────────┘   │
│          │              │                │               │
│       MongoDB        MongoDB        HTTP Fetch           │
└──────────┼──────────────┼────────────────┼───────────────┘
           │              │                │ (port 8000)
    ┌──────▼──────────────▼─┐    ┌─────────▼──────────────┐
    │     MongoDB Atlas /   │    │  PYTHON AI SERVICE      │
    │     Local MongoDB     │    │  FastAPI + ChromaDB     │
    │   civic_platform DB   │    │  Google Gemini (RAG)    │
    └───────────────────────┘    └────────────────────────┘
```

---

## 🧰 Technology Stack

### Frontend
| Technology | Role |
|---|---|
| **React 19 + Vite** | Modern component-based UI with hot reload |
| **TypeScript** | Static typing for maintainable code |
| **react-i18next / i18next** | English ↔ Hindi multilingual support |
| **Lucide React** | Accessible icon library |
| **Glassmorphism CSS** | Premium dark-mode visual design |
| **Vitest + Testing Library** | 40-test component test suite |

### Backend Gateway
| Technology | Role |
|---|---|
| **Node.js + Express** | RESTful API server |
| **TypeScript** | Type-safe route and model definitions |
| **Mongoose + MongoDB** | Citizen and complaint data persistence |
| **Jest + Supertest** | API integration test suite |
| **Native fetch** | Proxy layer to Python AI service |

### AI Service
| Technology | Role |
|---|---|
| **Python 3.11 + FastAPI** | High-performance async AI endpoint |
| **Google Gemini API** | LLM generation (gemini-2.5-flash) + embeddings (embedding-001) |
| **ChromaDB** | Local persistent vector database for RAG |
| **Retrieval-Augmented Generation** | Grounds LLM responses in real civic documents |
| **pytest** | 14-test AI logic test suite |

---

## 🌟 Key Features

### 1. 📄 AI Document Simplifier
Citizens click **"Simplify Docs"** on any service card. The platform:
1. Sends the complex legal/bureaucratic text to the backend proxy
2. Backend forwards to the Python RAG service
3. Gemini LLM returns a clear, plain-language summary + document checklist
4. Results rendered instantly in the UI with an animated card

> *"Pursuant to Article IX, Section 4.2..."* → **"You need: Proof of address, Tax clearance, Architectural blueprint"**

---

### 2. 🤖 Intelligent AI Companion (Chatbot)
- RAG pipeline retrieves relevant civic documents from ChromaDB vector store
- Gemini generates a contextual, grounded answer
- Response includes: **answer text**, **confidence score (%)**, **source documents cited**
- Graceful fallback if LLM is unavailable — never crashes the UI
- Input disabled with animated typing indicator during loading

---

### 3. 📍 Civic Issue Reporter
Citizens can report potholes, sanitation issues, infrastructure failures:
- **Auto-geolocation** via browser `navigator.geolocation` API
- Manual lat/lng coordinate override
- Category selection (Sanitation, Infrastructure, Utilities, Other)
- Complaint ID generated and stored in MongoDB with citizen linkage

---

### 4. 📊 Complaint Status Tracker
Real-time dashboard showing all complaints filed in the session:

| Status Badge | Meaning |
|---|---|
| 🟡 **Pending** | Complaint received, queued for review |
| 🔵 **In Progress** | Assigned and being actioned |
| 🟢 **Resolved** | Issue closed |

Includes complaint ID, title, category, submission date, and full update history.

---

### 5. 🌐 Multilingual Support (EN ↔ HI)
- One-click language toggle in the header
- All UI text — nav labels, form fields, status messages — switches instantly
- Full Hindi translation via react-i18next resource bundles
- AI companion can respond in the citizen's preferred language

---

## 🧪 Testing Strategy

> **"Every critical path is covered. No surprises in production."**

### Frontend — 40 Tests (Vitest + React Testing Library)
- Session initialization (success + network failure)
- Tab navigation (Services / Report / Track / Companion)
- Language toggle (EN → HI → EN)
- Document simplification (success, loading state, API error)
- Report form (validation, geolocation success/failure/unsupported, submit success/error)
- Complaint tracker (empty state, Pending / In Progress / Resolved badges, table columns)
- AI Chatbot (message send, loader, confidence score, sources, error fallback, whitespace guard)

### Backend — API Tests (Jest + Supertest)
- User creation, retrieval, 404 handling
- Complaint POST (required field validation, citizenId check)
- Complaint GET (with/without filter), update flow
- AI Chat proxy (success, missing query 400, service offline fallback)
- Error middleware (500 status + JSON format)
- Database connection (success, failure, ready-state skip)

### AI Service — 14 Tests (pytest)
- RAG Engine init (env vars, custom paths, model name)
- Embedding generation (query vs document task type, API fallback)
- Document ingest (chunking, ChromaDB insertion, metadata)
- Query pipeline (empty validation, empty DB, success, LLM fallback)
- FastAPI endpoints (/health, /query 400/500, /ingest 500)

---

## 📁 Project Structure

```
HackDevengers/
├── frontend/                   # React + Vite UI
│   ├── src/
│   │   ├── App.tsx             # Main app with all tabs + handlers
│   │   ├── App.test.tsx        # 40 Vitest component tests
│   │   ├── i18n.ts             # EN + HI translation resources
│   │   └── vitest.setup.ts     # Test environment config
│   ├── vite.config.ts          # Vite + Vitest configuration
│   └── package.json
│
├── backend/                    # Node.js Express gateway
│   ├── src/
│   │   ├── app.ts              # Routes: users, complaints, chat proxy
│   │   ├── models/             # Mongoose schemas (User, Complaint)
│   │   └── __tests__/
│   │       └── app.test.ts     # Jest + Supertest API tests
│   └── package.json
│
├── ai-service/                 # Python FastAPI + RAG
│   ├── main.py                 # /health, /query, /ingest endpoints
│   ├── rag_engine.py           # CivicDocRAGEngine (Gemini + ChromaDB)
│   ├── test_main.py            # 14 pytest unit tests
│   ├── requirements.txt
│   └── chroma_db/              # Persistent local vector store
│
└── .agents/
    ├── AGENTS.md               # Agent behavioral rules
    ├── step-by-step-guide.md   # Manual verification guide
    └── skills/                 # Custom AI agent skill definitions
```

---

## 🚀 Running the Platform

```bash
# 1. Start MongoDB (local or Atlas)
# Set MONGODB_URI in backend/.env

# 2. Backend Gateway (port 5000)
cd backend && npm install && npm run dev

# 3. Python AI Service (port 8000)
cd ai-service
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 4. React Frontend (port 5173)
cd frontend && npm install && npm run dev

# 5. Run all tests
cd backend  && npm test          # Jest
cd ai-service && pytest -v       # pytest  (14 tests)
cd frontend && npm test          # Vitest  (40 tests)
```

---

## 🔭 Future Enhancements

### 🗣️ Voice Interface
- Add **speech-to-text** input for the AI companion (Web Speech API)
- Enable **text-to-speech** responses for accessibility
- Support regional language voice commands (Tamil, Bengali, Kannada)

### 🗺️ Interactive Map Integration
- Replace lat/lng text inputs with a **Leaflet.js / Google Maps** picker
- Heatmap visualization of civic issue clusters by locality
- Route-optimized assignment suggestions for civic workers

### 📲 Progressive Web App (PWA)
- Offline-capable complaint drafting
- Push notifications for complaint status updates
- App-store installable on Android/iOS

### 🔐 Citizen Authentication
- OTP-based mobile authentication (Aadhaar / phone)
- Persistent session with complaint history across devices
- Role-based access for civic officials to manage and update complaints

### 📚 Knowledge Base Expansion
- Admin panel to ingest new government documents into ChromaDB
- Auto-crawling of government portals (data.gov.in, state websites)
- Document versioning with change tracking

### 📈 Analytics Dashboard
- Real-time metrics: complaints by category, average resolution time
- AI confidence score trends over time
- Language usage statistics for regional planning

### 🌍 Expanded Language Support
- Add support for Tamil, Kannada, Bengali, Marathi, Telugu
- Language auto-detection based on browser locale
- LLM prompt localization for regional nuances

### 🔄 Automated Status Updates
- Webhook integration with civic department ticketing systems
- Email/SMS notifications to citizens on status change
- SLA-based escalation alerts for overdue complaints

### 🧩 Recommendation Engine
- "Citizens like you also needed..." service suggestions
- Proactive reminders for document renewals (driving license, business permits)
- Contextual service discovery based on complaint location + type

---

## 🎯 Impact Summary

| Metric | Before CivicGuard AI | After CivicGuard AI |
|---|---|---|
| Time to understand a permit | 2–3 days (lawyers/agents) | **< 30 seconds** (AI simplification) |
| Complaint submission | In-person / phone | **Web, anytime, geolocated** |
| Status visibility | None | **Real-time tracker** |
| Language accessibility | English only | **English + Hindi (more coming)** |
| 24/7 citizen support | No | **Yes — AI Companion** |

---

> *"CivicGuard AI transforms the citizen-government relationship — from opaque and frustrating to transparent, intelligent, and inclusive."*

---

**Built with love by HackDevengers** | [GitHub](https://github.com/Hack7023/HackDevengers)
