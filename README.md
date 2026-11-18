# Alpha Kids Parenting Coach

A small, safe, bilingual (English and Urdu) AI parenting coach built with Next.js, TypeScript, Tailwind CSS, and the Groq API. A parent types a concern, and the coach replies with a brief, structured, actionable plan plus a follow-up check-in.

---

## Features

- **Bilingual & Script Aware:** Responds in natural, conversational English or Urdu (Nastaliq script with proper RTL orientation and generous line-height). Also accepts Roman Urdu and replies in Urdu script.
- **Voice & Audio Input / Output:**
  - **Microphone Dictation:** Parents can tap the mic in the composer to speak verbally with real-time live preview and Groq Whisper (`whisper-large-v3-turbo`) transcription.
  - **Read-Aloud Response:** Tap "Listen" on any coach reply to have the guidance read aloud in English or Urdu via speech synthesis.
- **Structured Coaching Output:** Every turn includes an empathetic understanding sentence, 3–4 practical immediate steps, a follow-up check-in question, and suggested quick-reply buttons.
- **Three-Layer Safety Architecture:**
  - **Layer 1 (Server pre-check):** Hard pattern matching intercepts self-harm and medical emergencies before calling the model, returning instant, vetted crisis support.
  - **Layer 2 (System prompt & risk hints):** Model classifies concerns into `normal`, `emergency`, `abuse`, or `self_harm`, strictly constrained from diagnosing or prescribing medicine.
  - **Layer 3 (Output guard):** Post-generation scan intercepts dosages, medications, psychiatric diagnoses, or legal action recommendations.
- **Persistent Local History:** Conversations are saved to browser `localStorage` and grouped by date (Pinned, Today, Yesterday, Previous 7 days, Older) with automatic titles, pinning, and deletion.
- **Dual-Tone Theme:** Clean Light and Dark modes with persistent theme preference, no flash on reload, and smooth transitions that respect `prefers-reduced-motion`.
- **Accessible & Responsive:** Collapsible desktop sidebar, mobile drawer overlay, WCAG AA compliant contrast, keyboard navigation (Escape to dismiss menus/drawers), and live screen-reader regions.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| **Framework** | Next.js 15 (App Router) & React 19 |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS v4 & CSS custom properties |
| **LLM Provider** | Groq API (`groq-sdk`) |
| **Validation** | Zod (Request, Response & JSON schema validation) |
| **Icons** | Lucide React |
| **Typography** | `next/font/google` (Outfit, Nunito Sans, DM Sans, Noto Nastaliq Urdu) |

---

## Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+ (developed & verified on Node v24)
- npm or pnpm

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Groq API key:
https://console.groq.com/keys
```bash
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```
*(You can also use any general-purpose chat model supported on your Groq tier, such as `llama-3.3-70b-versatile` or `mixtral-8x7b-32768`.)*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests & Lint
```bash
# Run unit & safety test suite
npm test

# Run ESLint
npm run lint

# Run TypeScript type check
npx tsc --noEmit

# Production build
npm run build
```

---

## How Safety Works

Safety is the cornerstone of Alpha Kids Coach. Rather than relying on the LLM alone, the application enforces defense-in-depth across three tiers:

```
User Message
     │
     ▼
[ Layer 1: Server Pre-Check (lib/safety.ts) ]
     ├─► Hard match (Emergency / Self-harm) ──► Fixed Crisis Reply (No LLM called)
     └─► Normal / Soft Risk (Abuse hint)
             │
             ▼
[ Layer 2: Groq LLM + System Prompt (lib/prompt.ts) ]
     ├─ Mode classification ("normal", "emergency", "abuse", "self_harm")
     ├─ Strict JSON schema validation via Zod
     └─ Retry mechanism on schema or parse failure
             │
             ▼
[ Layer 3: Output Guard (lib/guard.ts) ]
     ├─ Regex scans for forbidden dosages, diagnosis, and legal directives
     └─ Replaces any violation with a safe professional referral
             │
             ▼
Guarded Response Delivered to Client
```

1. **Layer 1: Normalization & Pre-Check (Server, Zero LLM)**
   - Normalizes text: strips diacritics, tatweel, maps Arabic character variants (ي ى -> ی, ك -> ک) to Urdu forms, and normalizes Eastern digits.
   - Evaluates hard risk rules in English, Roman Urdu, and Urdu script for self-harm and acute physical emergencies (e.g. choking, unconsciousness, battery swallowing).
   - If a hard match is detected, the API immediately returns a vetted, fixed crisis reply with zero model tokens and zero hallucinations.
   - If a soft risk is detected (e.g., suspected abuse or parent losing control), a risk hint is attached to the system prompt to instruct the model to adopt an escalated safety-first posture.

2. **Layer 2: Prompting & Classification**
   - The model is instructed never to diagnose or suggest medical or legal remedies.
   - Outputs strictly structured JSON parsed by Zod: `mode`, `language`, `understanding`, `plan`, `followUp`, `quickReplies`, and optional `title`.

3. **Layer 3: Output Guard**
   - After the model generates a reply, regex guards check for forbidden terms (e.g. milligram dosages, specific medications like paracetamol/ibuprofen, diagnostic claims like "your child has ADHD", or litigation directives like "sue for custody").
   - Any violation triggers an immediate, neutral safety fallback advising consultation with a pediatrician or professional.

---

## Project Structure

```text
├── app/
│   ├── api/coach/route.ts      # POST: pre-check, Groq inference, validation & output guard
│   ├── api/transcribe/route.ts # POST: audio speech-to-text with Groq Whisper API
│   ├── layout.tsx              # Fonts, theme initialization script (no-flash)
│   ├── page.tsx                # App layout orchestrator (Sidebar + ChatView)
│   └── globals.css             # Tailwind v4 directives, theme tokens, Urdu typography
├── components/
│   ├── Sidebar.tsx             # Collapsible/drawer sidebar with history grouping, pin & delete
│   ├── ChatView.tsx            # Main chat container, empty state, and message stream
│   ├── Composer.tsx            # Typing bar with mic audio recorder, char counter, and send button
│   ├── CoachCard.tsx           # Structured coaching response card with quick-reply & listen buttons
│   ├── CrisisCard.tsx          # High-priority red-tinted alert card for emergency/crisis replies
│   ├── ThemeToggle.tsx         # Sun/Moon animated theme toggle
│   └── Disclaimer.tsx          # Medical & legal guidance disclaimer
├── lib/
│   ├── types.ts                # Zod schemas, data contracts, and client message interfaces
│   ├── safety.ts               # Normalization, risk pattern rules, and fixed crisis templates
│   ├── guard.ts                # Output validation filter for forbidden advice
│   ├── prompt.ts               # Dynamic system prompt generator with safety rules
│   ├── conversations.ts        # Storage keys, date grouping, and title helpers
│   └── lang.ts                 # Script analysis & RTL detection
├── hooks/
│   ├── useConversations.ts     # Client state management, localStorage sync, abort controllers
│   └── useAudioRecorder.ts     # Audio recording, live Web Speech API dictation & Whisper sync
├── tests/
│   ├── safety.test.ts          # Unit tests for normalization, risk rules, and guards
│   └── audio.test.ts           # Unit tests for audio transcription validation
├── .env.example
├── package.json
└── README.md
```

---

## Design & Typography

- **Pairing A (Warm and Supportive):**
  - Headers / Titles: **Outfit**
  - Message Body: **Nunito Sans**
  - Buttons / Chips: **DM Sans**
  - Urdu Script: **Noto Nastaliq Urdu** with customized line-height (`2.1`) for authentic Urdu legibility.
- **Theme Variables:** CSS custom properties (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--accent`, `--primary`, `--danger-*`) allow instant theme transitions without re-rendering component trees.

---

## Safety Audit, Hardening & Known Gaps (Review Resolution)

Following an in-depth technical and product review, our safety architecture underwent rigorous hardening across all tiers:

1. **Stem-Based Emergency & Self-Harm Recall (P0-1 Resolved):**
   - Normalized typographic apostrophes (`’`, `‘`) and quotes in `normalize()`, preventing keyboard-variant bypasses (e.g., `can’t breathe`).
   - Replaced fixed phrase lists with flexible stem-based regexes (`kill\w* myself`, `hurt\w* myself`, `end\w* (my|it|all)`, `limp\b.*won't wake`).
2. **Subject-Aware Self-Harm Handling (P0-2 Resolved):**
   - Added explicit patterns and prompt instructions for child/teenager self-harm disclosures (`My 12-year-old said she wants to die`), directing parents to stay calm, never leave the child alone, secure the environment, and call crisis lines immediately.
3. **Abuse Disambiguation & Shaken-Baby Detection (P0-3 Resolved):**
   - Hardcoded immediate crisis escalation for shaken-baby disclosures (`shook baby really hard`).
   - Differentiated parental loss of control (de-escalation, immediate pause, calling partner/stress lines) from third-party/domestic abuse disclosures (child protection, legal safeguarding, never leaving child with abuser).
   - Added negative lookarounds `(?<![\u0600-\u06FF])` to eliminate false positives on common words like `ہمارا` (our) matching `مارا`.
4. **Crisis Precedence in Output Guard (P0-4 Resolved):**
   - Reordered `guardReply()` so emergency and self-harm modes **always** return fixed crisis templates first. Mentions of medical terms (e.g., "do not give 5 ml") are never downgraded to generic normal fallbacks.
5. **Trilingual Output Guard (P0-5 Resolved):**
   - Extended Layer 3 post-generation regex scanning to **Urdu script** (`ملی گرام`, `پیراسیٹامول`, `اے ڈی ایچ ڈی`, `عدالت جائیں`) and **Roman Urdu** (`paracetamol`, `custody ka case`).
6. **False-Positive Suppression Matrix:**
   - Context-aware negation regexes suppress false alarms for past history ("had a seizure last year"), general queries ("is grape a choking hazard"), and benign idioms ("poison ivy", "overdose of screen time", "sexual education").
7. **Production Boundaries & Security (P1 Items Resolved):**
   - Sliding-window in-memory rate limiting per IP on `/api/coach` and `/api/transcribe`.
   - Audio payload caps: 4 MB size limit and strict MIME validation (`audio/*`).
   - Client-side history slicing (`slice(-14)`) and `max(50)` validation limit, preventing conversation cap failure on turn 11.
   - Clean retry re-issuance without duplicating the user's message.
   - AbortController lifecycle checks in `useConversations` preventing abort race conditions.

---

## Emergency & Crisis Directives

Crisis guidance directs parents directly to their local services without embedding fragile or geographic-specific phone numbers:
- Emergency directives advise immediate connection to local emergency services.
- Crisis & self-harm directives instruct: *"Call a local crisis helpline or emergency services if you feel you might act on these thoughts."*

---

## Limitations & Next Steps

1. **IP Geolocation for Emergency Routing:** Automatically detect client country to emphasize local crisis numbers while keeping universal alternatives visible.
2. **Streaming Responses:** Support streaming server-sent events (SSE) while preserving JSON schema safety and post-stream guard validation.
3. **WhatsApp Channel Integration:** Extract `lib/safety.ts`, `guard.ts`, and `prompt.ts` into a standalone service capable of powering both the web app and a WhatsApp Business API webhook.

---

## How I Used Coding Agents

During the development of Alpha Kids Coach:
- **Scaffolding & Architecture:** Automated project boilerplate, strict TypeScript configuration, and Tailwind v4 setup.
- **Safety Rule Inspection & Debugging:** When running our automated test matrix against the safety assessment logic, we identified and fixed a subtle bug where soft risk matches failed to elevate from `none` to `soft`. We replaced this with a mathematical `LEVEL_RANK` hierarchy (`hard: 2 > soft: 1 > none: 0`).
- **Human Verification & Audit:** While agents assisted with regex scaffolding and test fixtures, every safety regular expression, Unicode boundary lookaround, and client state-machine transition was personally reviewed, independently audited against real-world adversarial probes, and verified via `npm test`, `npx tsc --noEmit`, and `npm run lint`.
