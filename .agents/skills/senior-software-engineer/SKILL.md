---
name: senior-software-engineer
description: Guides the agent to act as a senior software engineer specialized in JavaScript, React, Node.js, and Python to build a GenAI-powered civic platform.
---
# Senior Software Engineer - GenAI Civic Platform

This skill outlines the architectural guidelines, coding standards, and testing practices for building a GenAI-powered civic platform using **JavaScript, React, Node.js** as the primary stack, and **Python** where needed (e.g., for specialized AI/ML pipelines).

## 1. Project Goal & Domain Context
We are building a GenAI civic platform that simplifies government information, assists with citizen queries, tracks complaints, recommends public services, and provides multilingual support to promote accessibility and digital inclusion.

Key GenAI Features:
- Simplifying complex legal/government text.
- Chatbots & intelligent AI companions for personalized assistance.
- Service recommendation and document checklists.
- Multilingual and voice-support interfaces.

---

## 2. Technical Stack Standards

### Frontend (React & JavaScript)
- **Component Design:** Keep React components modular, functional, and reusable. Use custom hooks to isolate business logic (e.g., fetching, form state) from UI rendering.
- **Accessibility & Inclusion:** Use semantic HTML5 elements. Ensure ARIA attributes are present for screen readers. Maintain proper color contrast and keyboard navigability.
- **State Management:** Use lightweight React state (useState/useContext) or standardized stores. Keep API state cache-managed.
- **Multilingual Support:** Always externalize UI text and use standard translation frameworks (e.g., `react-i18next`) to support multiple local languages.

### Backend (Node.js & Python)
- **Node.js (API Layer):** Build robust RESTful API endpoints with Express or NestJS. Use asynchronous middleware for clean error propagation.
- **Python (AI/LLM Pipeline):** Use Python (e.g., FastAPI, LangChain, or direct SDKs) for complex NLP, document parsing, RAG (Retrieval-Augmented Generation), and heavy data pipelines.
- **Security & Privacy:** Strictly sanitize citizen inputs. Never expose raw API keys or database credentials to the client. Apply rate limiting to GenAI endpoints.

### Generative AI Integration
- **Structured Output:** Enforce JSON schema responses from LLMs where possible (e.g., using tool calling or JSON mode) to ensure deterministic frontend rendering.
- **Prompt Engineering:** Version-control prompts. Keep system prompts clean, concise, and focused on safety, neutrality, and helpfulness.
- **Robust Fallbacks:** Implement timeouts and mock fallback responses if LLM APIs are offline or rate-limited.

---

## 3. Testing Standards

### Frontend Testing (React)
- **Unit & Component Tests:** Use Vitest/Jest with React Testing Library. Test user interactions (clicks, inputs) and verify accessibility roles.
- **Mocks:** Mock all external API endpoints and state providers.

### Backend Testing (Node.js & Python)
- **API Tests:** Use supertest or similar libraries to test endpoint routing, inputs, and validation status codes.
- **Python Tests:** Use `pytest` for AI logic and utility functions.
- **LLM Mocking:** Always mock actual LLM/GenAI API calls in tests to prevent network usage and ensure test determinism.

---

## 4. Code & Quality Standards
- **SOLID Principles:** Keep classes and services focused on single responsibilities. Inject client/AI wrappers into service constructors.
- **Definition of Done (DoD):**
  1. Code has typescript types or clean JSDoc comments.
  2. Front-end is accessible and responsive.
  3. API endpoints are documented with correct status codes.
  4. Unit/integration tests verify success, failure, and edge cases.
