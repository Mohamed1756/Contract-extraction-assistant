# Contract Analysis Lite

A local-first contract assistant that runs entirely on your machine. It pairs a fast regex backbone with an LLM front-end (Mistral) so you get high-quality answers without handing your documents to a hosted service. Ideal for analysts, lawyers, or operators who live in PDF land and want reusable extraction tooling.

## Highlights
- **LLM-first pipeline**: Mistral handles nuanced phrasing; curated regex patterns step in whenever the model is uncertain or silent.
- **Local control**: All parsing happens on your workstation. Only outbound call is to the Mistral API.
- **Snappy feedback**: Typical PDF turns around in a few seconds on a laptop—great for triaging stacks of agreements.
- **Focused output**: The open-source drop surfaces four headline fields (start date, end date, renewal terms, termination notice period) with clear source labels.

## Architecture
- **Backend (`backend/`)**
  - `app.py`: Flask API exposing `/api/analyze-contract` and health endpoints.
  - `contract_extractor.py`: Windowed text splitter, Mistral prompts, and regex fallback.
  - `patterns/`: YAML definitions for the four supported fields.
  - `requirements.txt`: Python dependencies (Flask, PyMuPDF, spaCy, Mistral SDK, etc.).
- **Frontend (`src/`)**
  - Vite + React dashboard with Tailwind styling.
  - `UploadModal.tsx`: Handles PDF uploads to the backend.
  - `Dashboard.tsx`: Displays extracted values, sources, and helper copy.

## Setup

### 1. Environment variables
Copy the template and drop in your Mistral key:

```bash
cp .env.example .env
```

Then edit `.env`:

```
MISTRAL_API_KEY=sk_your_real_key
```

> The extractor hits Mistral first; without a key the regex fallback still works, but accuracy improves notably with the LLM.

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
The Flask server listens on `http://localhost:5000`.

### 3. Frontend
```bash
npm install
npm run dev
```
Vite serves the dashboard at `http://localhost:5173`.

## Usage
1. Open the dashboard, upload a contract PDF.
2. Backend streams text, calls Mistral for the four fields, and applies regex cleanup.
3. Results appear with value, source (LLM or regex), contract length, and pages analysed.

Response example:
```json
{
  "extraction_timestamp": "2025-10-02T12:00:00Z",
  "contract_type": "General Agreement",
  "contract_length": 12345,
  "analysis": {
    "start_date": {"value": "January 1, 2024", "source": "Inference"},
    "end_date": {"value": "December 31, 2024", "source": "Regex"},
    "renewal_terms": {"value": "Renews annually unless 60 days notice is given.", "source": "Inference"},
    "termination_notice_period": {"value": "30 days written notice", "source": "Regex"}
  },
  "pages_analysed": 7
}
```

## Performance & Benefits
- **Speed**: PDF parsing + Mistral call typically lands under ~3 seconds per document on a modern laptop.
- **Repeatability**: Regex library keeps outputs consistent during batch runs.
- **Privacy**: PDFs stay local; only the prompt text travels to Mistral.
- **Extensible**: Add more YAML patterns or hook in additional models if you release a fuller version later.

## Post-MVP To-Do (No Dates)
- **Dockerize deploy**: Package backend + frontend for a single-command start.
- **UX polish**: Refine dashboard layout, surface clearer errors, add file previews.
- **Audit trail**: Persist step-by-step extraction logs for traceability.
- **Batch workflow**: Improve multi-file upload with progress, consistent outputs, batch exports.
- **Tighter LLM outputs**: Trim responses so clauses stay concise instead of echoing paragraphs.
- **Reference snippets**: Link each field back to its exact PDF location or text span.
- **Field coverage**: Layer in optional clauses beyond the core four.
- **README candy**: Add badges, demo GIF, roadmap graphic, and contribution guide.

## Contributing
Pull requests welcome—especially around new pattern packs, language extensions, or UI polish.

## License
MIT (feel free to swap in your preferred OSS license before publishing).
