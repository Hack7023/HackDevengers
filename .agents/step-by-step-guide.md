# Step-by-Step Implementation & Verification Guide

This document details the components created for the GenAI-powered Civic Platform and provides step-by-step instructions to run, verify, and test the entire ecosystem.

---

## 1. System Components Summary

The project consists of three major tiers:
1. **Frontend (React)**: Accessible, responsive layout utilizing `react-i18next` for English/Hindi multilingual toggles, an AI companion chat panel, public issue reporter with map parameters, and a complaints tracker dashboard.
2. **Backend Gateway (Node.js)**: Orchestrator connecting database storage for citizen accounts and issue submissions, proxying AI requests, and running tests with Jest.
3. **AI Service (Python)**: Retrieval Augmented Generation (RAG) system utilizing FastAPI, ChromaDB local vector indexes, and Google Gemini API integration.

---

## 2. Step-by-Step Execution Guide

### Step 2.1: Database Setup
Ensure that **MongoDB** is running locally or provide a connection URI:
```bash
# Default local database address
mongodb://localhost:27017/civic_platform
```
If using a custom MongoDB connection string, set it in `backend/.env` as:
```env
MONGODB_URI=mongodb://your-username:your-password@host:port/database
```

### Step 2.2: Launch the Node.js Backend Gateway
Open a terminal in the `/backend` directory:
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the gateway in development mode:
   ```bash
   npm run dev
   ```
   *The server will initialize on port 5000: `http://localhost:5000`*

### Step 2.3: Launch the Python RAG AI Service
Open a terminal in the `/ai-service` directory:
1. Set up the virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the environment:
   * **Windows**: `venv\Scripts\activate`
   * **macOS/Linux**: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set your Google Gemini API key:
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY="your-api-key-here"
   # Linux/macOS
   export GEMINI_API_KEY="your-api-key-here"
   ```
5. Start the service:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The AI engine will listen on port 8000: `http://localhost:8000`*

### Step 2.4: Launch the React Frontend
Open a terminal in the `/frontend` directory:
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run Vite local dev server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be available at `http://localhost:5173`*

---

## 3. Testing and Verification Guide

### 3.1: Running Gateway Tests (Node.js)
Execute unit and mock integration tests in `/backend`:
```bash
npm run test
```
*Expected output: All 5 mock endpoint tests pass successfully.*

### 3.2: Running AI Service Tests (Python)
Execute service logic and endpoint mock tests in `/ai-service`:
```bash
pytest
```
*Expected output: Core RAG routing and model invocation tests pass successfully.*

---

## 4. Manual Verification Scenarios

1. **Multilingual Toggle**: Click the language toggle button in the header. The application UI must instantly translate between English and Hindi.
2. **AI Document Simplification**: Go to the *Public Services* tab. Click **Simplify Docs** on a service card. The AI companion returns a clear bulleted checklist of required documents.
3. **Issue Reporting**: Under the *Report Issue* tab, fill in the forms and hit submit. Go to *Track Complaints* to observe the new status logging.
