# Cross-AI Panel

> A unified AI workspace that brings conversations from multiple AI platforms into one place.

## Overview

As the use of AI tools grows, we often use different platforms for different tasks. ChatGPT, Claude, and Gemini each have their own interfaces and separate conversation histories.

This means switching between multiple tabs and platforms just to find an old conversation or continue previous work.

**Cross-AI Panel** was built to solve this problem by providing a unified interface for accessing and managing conversations across different AI platforms.

Currently, the project supports:

* ChatGPT
* Claude
* Gemini

More platforms and features will be added in future versions.

---

## Features

* Unified conversation history across supported AI platforms
* ChatGPT, Claude, and Gemini integration
* Chrome extension for quick access
* Centralized backend API
* Conversation management
* Clean and simple interface
* Scalable architecture for adding more AI platforms

---

## Architecture

```text
AI Platforms
     │
     ├── ChatGPT
     ├── Claude
     └── Gemini
            │
            ▼
     Chrome Extension
            │
            ▼
       Backend API
         FastAPI
            │
            ▼
         Database
            │
            ▼
      Cross-AI Panel UI
```

The Chrome extension communicates with the backend API, which handles conversation-related operations and provides a unified format for the frontend.

---

## Tech Stack

### Frontend

* React
* JavaScript
* HTML/CSS

### Backend

* Python
* FastAPI
* REST APIs

### Extension

* Chrome Extension APIs
* JavaScript

### Database

* SQL

### Deployment

* Render

---

## Project Structure

```text
Cross-AI-Panel/
│
├── frontend/
│   ├── src/
│   └── ...
│
├── backend/
│   ├── ...
│   └── ...
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   └── ...
│
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Cross-AI-Panel
```

### 2. Backend Setup

```bash
cd backend

python -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Chrome Extension Setup

1. Open Chrome.
2. Go to:

```text
chrome://extensions
```

3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the extension folder.
6. The Cross-AI Panel extension should now be available in Chrome.

---

## Current Integrations

### ChatGPT

Conversation integration and unified history support.

### Claude

Conversation integration and unified history support.

### Gemini

Conversation integration and unified history support.

---

## Future Plans

Cross-AI Panel is an ongoing project.

Planned improvements include:

* Add more AI platforms
* Improve conversation synchronization
* Add more powerful search and filtering
* Add AI-powered conversation organization
* Introduce cross-platform comparison features
* Add unique productivity features for AI users
* Improve performance and scalability
* Improve authentication and security
* Expand the unified AI workspace experience

---

## Why I Built This

The goal of Cross-AI Panel is not to replace existing AI platforms.

Instead, it is to make working with multiple AI platforms **simpler, more organized, and more efficient**.

As AI tools continue to evolve, users will increasingly work with multiple models rather than relying on a single platform. Cross-AI Panel is an attempt to build infrastructure around that workflow.

---

## Project Status

**Current Status:** Active Development

Currently supporting:

**ChatGPT + Claude + Gemini**

More integrations and unique features are coming soon.

---

## Contributing

Contributions, suggestions, and ideas are welcome.

If you find a bug or have an idea for a feature, feel free to open an issue.

