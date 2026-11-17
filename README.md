# Alpha Kids Parenting Coach

A small, safe, bilingual (English and Urdu) AI parenting coach built with Next.js, TypeScript, Tailwind CSS, and the Groq API. A parent types a concern, and the coach replies with a brief, structured, actionable plan plus a follow-up check-in.

---

## Features

- **Bilingual & Script Aware:** Responds in natural, conversational English or Urdu (Nastaliq script with proper RTL orientation and generous line-height). Also accepts Roman Urdu and replies in Urdu script.
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
│   ├── layout.tsx              # Fonts, theme initialization script (no-flash)
│   ├── page.tsx                # App layout orchestrator (Sidebar + ChatView)
│   └── globals.css             # Tailwind v4 directives, theme tokens, Urdu typography
├── components/
│   ├── Sidebar.tsx             # Collapsible/drawer sidebar with history grouping, pin & delete
│   ├── ChatView.tsx            # Main chat container, empty state, and message stream
│   ├── Composer.tsx            # Auto-growing textarea, char counter, and IME-safe send button
│   ├── CoachCard.tsx           # Structured coaching response card with quick-reply buttons
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
│   └── useConversations.ts     # Client state management, localStorage sync, abort controllers
├── tests/
│   └── safety.test.ts          # Unit tests for normalization, risk rules, and guards
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

## Limitations & Next Steps

1. **Locale-Specific Emergency Routing:** Currently, crisis responses state general emergency directives. A future iteration can detect region/country to provide exact national child helplines (e.g., 1098 in India, 112 in EU, 999 in UK/UAE, 911 in US).
2. **Streaming Responses:** Support streaming server-sent events (SSE) while preserving JSON schema safety and post-stream guard validation.
3. **Voice & Audio Support:** Voice input and spoken Urdu/English audio playback for parents with busy hands or differing literacy levels.

---

## How I Used Coding Agents

During the development of Alpha Kids Coach:
- **Scaffolding & Architecture:** Automated project initialization, strict TypeScript configuration, and Tailwind v4 setup.
- **Safety Rule Inspection & Debugging:** When running our automated test matrix against the safety assessment logic, we identified and fixed a subtle bug where soft risk matches (such as child abuse indicators in Roman Urdu) failed to elevate from `none` to `soft` due to a strict equality condition in the rule ranker. We replaced this with a mathematical `LEVEL_RANK` hierarchy (`hard: 2 > soft: 1 > none: 0`).
- **Roman Urdu Regex Expansion:** Expanded Roman Urdu verb inflection patterns (e.g. `mara`, `maara`, `marunga`, `marungi`, `peeta`, `tashaddud`) to ensure high-recall safety coverage.
- **Verification:** Ran TypeScript type checks (`npx tsc --noEmit`), ESLint checks (`npm run lint`), build optimization (`npm run build`), and automated safety unit test assertions (`npm test`).
