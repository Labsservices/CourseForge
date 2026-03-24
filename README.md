🛠 CourseForge: Phase 1 Research Gatherer

CourseForge is an industrial-grade research tool designed to automate the first phase of course creation. By aggregating high-authority human expertise from YouTube, it creates a factual foundation that eliminates AI hallucinations and significantly reduces the manual labor required for material gathering.

🧠 The Strategic Philosophy: "Consensus = Truth"

This app was built to solve the "hallucination problem" in AI course generation. By extracting transcripts from 10-20 top-performing videos on a single topic, we create a consensus-based dataset.

Fact-Checking via Volume: If 18 out of 20 experts mention a specific concept, the AI can treat it as a factual "Core Module."

Outlier Detection: Unique ideas from a single video are flagged as "creative insights" rather than foundational facts.

🚀 Setup Instructions for Jorn

This guide assumes you are starting from scratch on a Mac. Follow these steps exactly to mirror the development environment.

1. Prerequisites (The Engines)

You need two "engines" installed on your Mac to run the backend logic and the frontend interface.

Node.js (Frontend Engine):

Open Terminal and type node -v.

If not found: Download the "LTS" version from nodejs.org.

Python 3 (Logic Engine):

Open Terminal and type python3 --version.

If not found: Download from python.org.

2. Download the Project

Navigate to your Desktop in the Terminal and clone the repository:

cd ~/Desktop
git clone [https://github.com/](https://github.com/)[YOUR_USERNAME]/courseforge.git
cd courseforge


3. Setup the Logic Engine (Backend)

The backend handles the heavy lifting of searching YouTube and parsing transcripts.

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt


Important: Setup Backend Credentials

Create a file in the backend folder named .env.

Paste: YOUTUBE_API_KEY=AIzaSyAmkVHIhKSKlLJEe4jvD8Ds6I-jBlL8e4M

Save and close.

4. Setup the Interface (Frontend)

The frontend is the visual dashboard where you perform your searches.

cd ../frontend
npm install


Important: Setup Frontend Credentials

Create a file in the frontend folder named .env.

Paste: VITE_YOUTUBE_API_KEY=AIzaSyAmkVHIhKSKlLJEe4jvD8Ds6I-jBlL8e4M

Save and close.

🛠 How to Run the App

You will need two terminal windows open (one for the backend, one for the frontend).

Terminal 1 (Backend):

cd ~/Desktop/courseforge/backend
source venv/bin/activate
uvicorn main:app --reload


Terminal 2 (Frontend):

cd ~/Desktop/courseforge/frontend
npm run dev


Access the tool at: http://localhost:5173

💎 Key Strategic Features

📊 The Consensus Matrix

This engine cross-references all selected transcripts to identify recurring themes. It visually highlights topics that appear across multiple sources, providing the "overlapping truth" required for a factual, high-quality curriculum.

✨ Golden Nugget Extractor

An algorithmic scanner that hunts for high-signal declarative statements (e.g., "The most important thing to remember is...") and extracts them as ready-made quotes for your final course formatting.

🛡️ Hallucination Guardrails

English-Only Enforcement: Search parameters are hardcoded to prioritize English metadata to ensure source quality.

Educational Filters: Built-in toggles to automatically exclude YouTube Shorts (<3m) and long fluff-filled podcasts (>1h).

📈 Quota Tracking

A real-time credit tracker in the header monitors your monthly balance for the transcript extraction service (1,000 credits/mo), ensuring you stay within your $10/mo budget.

📁 The 3-Step Pipeline

CourseForge serves as the Phase 1: Research & Gathering engine:

Gather (CourseForge): Aggregate bulk transcripts and extract the Consensus Matrix.

Curation (Claude/NotebookLM): Feed the compiled document into an AI project for human+AI condensing.

Format (Course Formatter): Use the final curated insights to publish the completed course.