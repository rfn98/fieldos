# FIELDOS

### AI operating system for field workers

**Moss retrieves context · AI reasons over evidence**

FieldOS helps field workers investigate operational problems by turning fragmented field data into grounded, actionable answers.

Instead of asking an AI to guess from a generic knowledge base, FieldOS first retrieves relevant **incidents, maintenance records, work orders, and SOPs** using [Moss](https://www.moss.dev/), then gives that evidence to an LLM for reasoning.

> **Retrieve the right context. Reason over the evidence. Make the decision.**

---

## Why FieldOS?

Field workers often have access to the data they need — but finding the right information at the right moment is the problem.

An equipment issue may require information spread across:

* Incident reports
* Maintenance history
* Standard operating procedures
* Work orders
* Equipment records
* Technician notes

Searching these manually slows down investigation and can make it difficult to connect related events.

FieldOS turns that workflow into a single operational investigation:

**Field question → Moss retrieval → Evidence → AI reasoning → Grounded answer**

---

## What it does

A technician can ask a question about an asset, for example:

> **"Why did P-204 fail before?"**

FieldOS retrieves relevant operational records and produces an evidence-grounded explanation.

For example, an investigation of **P-204 — Cooling Water Pump** can connect:

* `INC-2026-001` — abnormal vibration caused by partial intake-filter obstruction
* `INC-2026-002` — unexpected shutdown following heavy intake-filter contamination
* `MNT-2026-002` — related maintenance activity
* `SOP-014` — intake-filter inspection procedure
* `SOP-015` — startup procedure

The result is not just an answer. FieldOS also exposes the underlying evidence and retrieval trace.

---

## Moss Integration

Moss is the retrieval layer of FieldOS.

Operational documents are transformed into searchable records and indexed in a custom Moss index.

### Retrieval flow

```text
Field Question
      │
      ▼
Generate query embedding
      │
      ▼
┌───────────────────────┐
│    Moss Retrieval     │
│ fieldos-knowledge-    │
│ custom                │
└───────────┬───────────┘
            │
            ▼
   Relevant Evidence
            │
            ▼
      AI Reasoning
            │
            ▼
    Grounded Answer
```

The application deliberately separates **retrieval** from **reasoning**.

Moss does not generate the final answer.

Instead:

> **Moss finds the operational context. The AI reasons over that context.**

This makes the evidence chain visible and reduces the risk of unsupported answers.

---

## Retrieval Performance

FieldOS exposes the actual retrieval trace for each investigation.

Example:

```text
MOSS RETRIEVAL

Provider       Moss
Index          fieldos-knowledge-custom
Evidence       5 records
Retrieval      3 ms

Reasoning

Model          gpt-oss:20b
LLM latency    2836 ms
Total          2905 ms
```

Retrieval latency varies by request and environment. The application displays the measured runtime rather than simulated telemetry.

---

## Voice Interaction

FieldOS also supports browser-based voice input for field scenarios.

```text
Technician speaks
       ↓
Browser Speech Recognition
       ↓
FieldOS investigation
       ↓
Moss retrieval
       ↓
AI reasoning
       ↓
Grounded answer
       ↓
Browser text-to-speech
```

The voice layer is intentionally additive: it uses the same investigation pipeline as text input.

This means voice does not introduce a separate reasoning or retrieval path.

---

## Architecture

```text
┌─────────────────────────────────────────────┐
│                  FieldOS UI                 │
│                                             │
│ Asset Console · Investigation · Evidence    │
│ Voice Input · Retrieval Trace               │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Next.js API    │
              │ Investigation  │
              └───────┬────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐
 │      Moss       │     │    PostgreSQL   │
 │    Retrieval    │     │ Source of Truth │
 └────────┬────────┘     └─────────────────┘
          │
          ▼
 ┌─────────────────┐
 │  gpt-oss:20b    │
 │ AI Reasoning    │
 └────────┬────────┘
          │
          ▼
   Grounded Answer
   + Evidence
   + Trace
```

### Data flow

1. PostgreSQL stores the operational source of truth.
2. Relevant operational records are indexed into Moss.
3. A technician asks a question about an asset.
4. FieldOS generates an embedding for the query.
5. Moss retrieves the most relevant records.
6. The retrieved evidence is passed to the reasoning model.
7. The model is instructed to reason only from the supplied evidence.
8. FieldOS returns the answer, evidence, and retrieval trace.

---

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* GSAP

### Backend

* Next.js API Routes
* Prisma
* PostgreSQL

### Retrieval

* Moss
* Custom 384-dimensional embeddings
* `Xenova/all-MiniLM-L6-v2`

### AI

* Ollama Cloud
* `gpt-oss:20b`

### Voice

* Browser Web Speech API
* Speech Recognition
* Speech Synthesis

---

## Project Structure

```text
fieldos/
├── app/
│   ├── api/
│   │   ├── assets/
│   │   └── investigate/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── AssetSidebar.tsx
│   ├── AssetHeader.tsx
│   ├── InvestigationPanel.tsx
│   ├── EvidencePanel.tsx
│   ├── RetrievalTrace.tsx
│   ├── StatusBadge.tsx
│   └── VoiceControl.tsx
│
├── lib/
│   ├── embedding.ts
│   ├── investigate.ts
│   ├── llm.ts
│   ├── moss.ts
│   └── prisma.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── scripts/
    └── index-moss-custom.ts
```

---

## Getting Started

### Requirements

* Node.js 22+
* PostgreSQL
* A Moss project
* Ollama Cloud access

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env`:

```env
DATABASE_URL=your_postgresql_connection_string

MOSS_PROJECT_ID=your_moss_project_id
MOSS_PROJECT_KEY=your_moss_project_key
MOSS_CUSTOM_INDEX_NAME=fieldos-knowledge-custom

OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key
OLLAMA_MODEL=gpt-oss:20b
```

### 3. Prepare the database

```bash
npx prisma migrate dev
```

Then seed the demo data:

```bash
npx prisma db seed
```

### 4. Build the Moss index

```bash
npm run moss:index:custom
```

The indexing script creates the custom FieldOS knowledge index and verifies that it is ready.

### 5. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Example Investigation

Select:

**P-204 — Cooling Water Pump**

Then ask:

> Why did P-204 fail before?

FieldOS retrieves the relevant operational evidence and produces a grounded explanation.

You can also ask:

> What should I check first?

or:

> What maintenance history matters?

---

## Design Principles

### Evidence before reasoning

The AI should reason over retrieved operational evidence rather than inventing context.

### Retrieval and reasoning are separate

Moss is responsible for finding relevant context.

The reasoning model is responsible for interpreting that context.

### Operational, not conversational

FieldOS is designed as an operational console rather than a generic chatbot.

The interface prioritizes:

* Asset context
* Investigation
* Evidence
* Traceability
* Latency

### Honest telemetry

Latency shown in the interface comes from actual runtime measurements.

No simulated retrieval or reasoning metrics are used.

---

## Current Limitations

This is an MVP focused on demonstrating the core investigation workflow.

Current limitations include:

* Voice input currently relies on the browser Web Speech API.
* Voice availability and recognition quality depend on the browser and microphone.
* The current demo dataset is intentionally small.
* LiveKit realtime voice has not been added to the MVP.
* The system is currently demonstrated around industrial maintenance workflows.

The architecture is designed so the voice layer can later be replaced or extended with a dedicated realtime voice infrastructure without changing the core retrieval and investigation pipeline.

---

## Hackathon

Built for the **YC Fall 2026 × Moss — The Zero Latency Builder Sprint**.

FieldOS explores the idea of an AI operating system for the physical world: software that can give field workers immediate access to operational context while keeping the reasoning grounded in real evidence.

### Core idea

```text
Physical-world problem
        ↓
Field question
        ↓
Fast contextual retrieval
        ↓
Evidence-grounded reasoning
        ↓
Actionable operational answer
```

---

## Demo

**Demo:** https://rfn-fieldos.vercel.app

**Demo Video:** https://youtu.be/UnPbzcbDL-o

---

## License

This project is built as a hackathon prototype.
