# FINAL PRESENTATION METHOD (AGENT STANDARD)

## Purpose
Use this exact method to produce the complete two-layer presentation for any target business.

This is a **strict standard**. Do not improvise layout, scope, or message structure.

---

## Two-Layer Presentation System

The final presentation always consists of **exactly two layers**:

| Layer | File/Route | Purpose | Format |
|-------|-----------|---------|--------|
| **Layer 1 — Paper** | `presentation_restored.html` | Physical handout dropped in person | Printable half-sheet HTML flyer |
| **Layer 2 — Digital** | `/pitch` (Next.js route) | QR destination — full gap analysis + live demo links | Multi-section web page in the app |

The paper flyer is the door. The pitch page is the room.
The QR code on the flyer links directly to the pitch page on the deployed app.

---

## Phase 0 — Discovery (Required Before Any Build)

The presentation layers are only as strong as the research behind them. Before writing a single line of code or copy, a structured discovery process must be completed. Its output drives everything else — the PoC features, the gap cards, the evidence quotes, and the ROI figures.

### Discovery Inputs

Research the target business across all available public surfaces:

| Source | What to extract |
|--------|----------------|
| **Google Maps listing** | Star rating, review count, review recency, owner response rate, listed phone number, listed hours, photo quality |
| **Google Maps reviews** | Exact quotes mentioning missed calls, slow replies, no-shows, confusion about services, location problems — note star rating for each |
| **Website (if exists)** | Clarity of services, booking capability, mobile-friendliness, load speed, contact options |
| **Social media** | Post frequency, engagement, last active date, response to DMs |
| **Competitors (top 3)** | What they do better — hours listed, booking links, review volume, response time shown |
| **Category context** | What customers in this category typically expect (urgency, pricing transparency, availability) |

### Discovery Output — the Issues List

Produce a ranked list of **bleeding-edge issues** — the specific, observable problems that are costing the business money or reputation right now. Each issue must be:

- **Specific** — tied to a real observation ("3 reviews in 6 months mention no answer when calling")
- **Rankable** — assigned a severity (Critical / High / Medium / Revenue Upside)
- **Evidence-backed** — linked to at least one data point (a review quote, a missing feature, a competitor comparison)
- **Actionable** — something software or process can fix

Format the issues list as:

```
ISSUE [XX] — [Severity]
Observation: [What was found, where]
Evidence: "[Exact quote or data point]"
Impact: [What it costs — revenue, reputation, time]
```

### Mapping: Issues → PoC Features → Pitch Gap Cards

This is the critical chain. Every gap card on the pitch page must trace back to a discovery issue, and every PoC feature must trace back to a gap it solves.

```
Discovery Issue
  └── PoC Feature Built to Address It
        └── Pitch Page Gap Card (problem + fix + live CTA)
```

**Rules:**
- Do not build features that don't map to a discovered issue
- Do not put a gap card on the pitch page that wasn't discovered (no invented problems)
- Every CTA on a gap card must link to the actual feature that was built — the prospect must be able to verify the fix is real in real time

### Discovery → Presentation Traceability Table

Before finalizing the pitch page, complete this table and keep it in `docs/`:

```
| Gap # | Discovery Issue | PoC Feature Built | Pitch Card Title | Live CTA |
|-------|----------------|-------------------|-----------------|----------|
| 01    | [issue summary] | [feature name]    | [card title]    | [link]   |
| 02    | ...             | ...               | ...             | ...      |
```

This table is the audit trail. It proves the pitch is grounded in research, not assumptions. It also becomes the brief for future iterations — if a feature wasn't built yet, the card CTA links to the closest live proof instead.

---

## Non-Negotiable Output Format
1. Deliver exactly **one HTML file** named `presentation_restored.html` at project root (unless user requests a different filename).
2. The presentation is exactly **one half-sheet flyer**.
3. The flyer contains:
	- One headline
	- One short subtitle
	- **One paragraph only** (single paragraph body copy)
	- One prominent QR code
	- One brief scan CTA line
4. No second page. No appendix. No feature grid. No tables. No bullets.

---

## Print & Canvas Spec (Mandatory)
Use these print settings in CSS:

```css
@media print {
  @page { margin: 0.3in; size: 8.5in 5.5in; }
  body { margin: 0; }
}
```

Layout rules:
- One centered card-style section only.
- QR code on right, paragraph on left (or stacked only if extremely narrow).
- Maintain a clean, premium style with high contrast and generous spacing.
- Keep the entire design visually balanced for immediate print.

---

## Messaging Method (Mandatory Story Sequence)
The paragraph must follow this order every time:
1. **Discovery:** We found the business on Google Maps.
2. **Research:** We studied their digital footprint.
3. **Insight:** We identified a clear edge/opportunity.
4. **Proof:** We built a working prototype (not just an idea).
5. **Invitation:** Scan QR to see the live demo.

### Tone Rules
- Respectful, confident, concise.
- Curiosity-first (soft open), not hard sales.
- Must NOT imply the owner requested the work.
- Must NOT imply an existing signed engagement.

---

## Required Copy Constraints
1. Body copy is one paragraph only (no paragraph breaks).
2. Paragraph target length: **55-90 words**.
3. CTA line target length: **4-10 words**.
4. Avoid jargon overload.
5. Avoid promises like “guaranteed,” “always,” or fake numbers.

---

## QR Code Rules
1. QR must link to the live demo URL for that target.
2. Use a reliable QR image source or locally generated QR image.
3. QR must be large enough to scan from a printed half-sheet:
	- Recommended rendered size: `120px` to `150px` square.
4. Include short label under QR (example: `Prototype Preview`).

---

## HTML/CSS Build Rules
1. Keep implementation minimal and static (no JavaScript required).
2. Use semantic HTML and concise CSS.
3. Keep font stack simple (Inter is acceptable).
4. Do not add animations, carousels, or decorative extras.
5. Do not introduce additional sections beyond the required structure.

---

## Agent Execution Steps (Required)
1. Read any existing presentation file and preserve useful URL/details.
2. Rewrite to one half-sheet layout only.
3. Replace copy with required story sequence.
4. Verify single-paragraph rule.
5. Verify print CSS uses half-sheet spec.
6. Verify QR URL is correct for current target.
7. Final pass for brevity and curiosity tone.

---

## Quality Gate Checklist (Must Pass All)
- [ ] Exactly one printable half-sheet output
- [ ] Exactly one paragraph body copy
- [ ] Includes Google Maps discovery origin
- [ ] Includes digital-footprint research statement
- [ ] Includes prototype proof statement
- [ ] Includes QR + short CTA
- [ ] Does not imply prior client request or existing contract
- [ ] No extra pages, feature lists, tables, or long-form pitch

If any item fails, revise before finalizing.

---

## Reusable Copy Template (Fill-In)
Use this template and customize bracketed fields only:

"Hi [Owner Name]—while searching [category] on Google Maps, I found [Business Name], studied your digital footprint, and spotted a clear opportunity to sharpen your edge; I built a working prototype that helps capture missed customer moments while you stay focused on the work, and if this feels interesting, scan this code to see the live demo in under a minute."

CTA line examples:
- `Scan to view the live demo.`
- `See your prototype in under a minute.`

---

## Consistency Enforcement Across Targets
For every new target:
1. Keep **structure identical**.
2. Change only:
	- Owner/business identifiers
	- Category wording
	- QR/demo URL
3. Do not expand scope unless explicitly requested by user.

This guarantees a repeatable, recognizable final presentation system across all targets.

---

# LAYER 2 — DIGITAL PITCH PAGE STANDARD

## Purpose
The pitch page (`/pitch`) is the destination the QR code resolves to. It delivers the full gap analysis, evidence, ROI math, system capabilities, and a live demo CTA. It is where the prospect spends 3–10 minutes after scanning the flyer.

The pitch page **does not replace** the paper flyer. The paper flyer is the cold-open; the pitch page is the close.

---

## Route & File Convention (Mandatory)

| Item | Value |
|------|-------|
| Route | `/pitch` |
| File path | `frontend/src/app/pitch/page.tsx` |
| Framework | Next.js App Router (client component: `'use client'`) |
| Styling | Tailwind CSS using the project's design token system |
| Navigation | Linked from paper flyer QR → `/pitch` |

---

## Page Structure — Five Fixed Sections (Non-Negotiable)

The pitch page always contains exactly these five sections in this order:

### Section 00 — Header Bar
- One-line identifier: `[Business Name] · Gaps & Fixes`
- Date (month + year)
- No navigation, no logo — minimal, report-like

### Section 01 — The Gaps
- Headline follows the pattern: `"Here's what I found, then built for you."`
- Lists **all identified gaps** as numbered cards (01, 02, 03…)
- Each gap card contains:
  - **Badge**: severity level (`🔴 Critical`, `🟠 High`, `🔵 Medium`, `🟢 Revenue Upside`)
  - **Title**: one-line problem statement (the pain the customer feels)
  - **Problem**: 2–4 sentences describing the gap from the customer's perspective, using real specifics (Google Maps, reviews, exact behaviors)
  - **Fix block**: gold left-border block with `✦ The Fix` label + solution description
  - **CTAs**: 1–2 action links — always include at least one that triggers a live demo interaction (call, chat, or dashboard link)

**Badge severity guide:**
- `🔴 Critical · Revenue Impact` — direct lost revenue, discoverable on Google Maps
- `🟠 High · [label]` — conversion leaks, reputation damage
- `🔵 Medium · Operational` — time costs, FAQ load
- `🟢 Revenue Upside · [label]` — untapped upside (after hours, upsells)

### Section 02 — The Evidence
- Label: `Section 02 — The Evidence`
- Headline: `"Real words. Real customers."`
- Grid of 3–5 verbatim review quotes pulled from Google Maps (or equivalent)
- Each quote card: star rating, italic quote text, attribution line (`Google Maps Review — Gap #XX`)
- Closing blockquote: synthesize the core tension in one sentence using a real 5-star quote

### Section 03 — The Math
- Label: `Section 03 — The Math`
- Headline: `"What the gaps cost annually."`
- 3 bleed cards showing estimated annual cost:
  - Revenue lost from missed leads (formula: missed leads/wk × avg ticket profit × 52)
  - Hours lost to preventable admin
  - Review rating damage
- ROI comparison table: metric | Before | With [System Name]
- All figures labeled "conservative estimates" — never use "guaranteed" or exact promises

### Section 04 — The System
- Label: `Section 04 — The System`
- Headline: `"What [SYSTEM NAME] actually is."`
- Short clarifier: what it is NOT (chatbot, phone tree), what it IS
- Capability cards grid (2–3 columns): icon + title + 1–2 sentence description
- Required CTA: "Explore the dashboard"
- Optional CTA: "See all features" (only when `/features` exists for this target)

### Section 05 — Closing / Next Steps
- Label: `Section 05 — Next Steps`
- Headline follows pattern: `"The software is built. It's waiting for your number."`
- Short paragraph (2–3 sentences): no setup required on their end, try the demo, then decide
- 2 CTAs: primary = call demo number, secondary = open live chat
- **No pricing. No contract language. No commitment pressure.**

### Footer
- Left: `[Business Name] — Digital Gap Report · [Month Year]`
- Right: developer attribution (`Built by [Name] · [Company]`) + developer contact phone as tappable `tel:` link + nav links

---

## Data Architecture (TypeScript)

Define all page content as typed data arrays at the top of the file. Never hardcode content inline in JSX.

```typescript
// Required types
type BadgeVariant = 'critical' | 'high' | 'medium' | 'revenue'

interface GapCta {
  label: string
  href: string
  external?: boolean
  variant: 'phone' | 'primary' | 'secondary' | 'qr'
}

interface Gap {
  num: string       // '01', '02', etc.
  badge: BadgeVariant
  badgeLabel: string
  title: string
  problem: string
  solution: string
  ctas: GapCta[]
}

interface Quote {
  stars: number
  text: string
  meta: string      // 'Google Maps Review — Gap #XX'
}

interface Capability {
  icon: React.ReactNode
  title: string
  desc: string
  bg: string        // Tailwind bg class for icon container
}

interface RoiRow {
  metric: string
  before: string
  after: string
}
```

### CTA Variant Rules

| Variant | Style | Use for |
|---------|-------|---------|
| `phone` | Gold filled | Primary call CTA — tel: links only |
| `primary` | Emerald tinted border | Internal links to live demo features |
| `secondary` | Subtle white border | Secondary nav links (dashboard, features) |
| `qr` | Gold border + mini QR icon | Door QR / customer-facing entry points |

---

## Design Token Rules

Use the project Tailwind config tokens. Do not use raw hex colors:

| Token | Use |
|-------|-----|
| `emperor-black` | Page background |
| `emperor-charcoal` | Section alternating background |
| `emperor-cream` | Primary text |
| `emperor-gold` | Accents, badges, fix borders, numbers |
| `accent-emerald` | "With LINDA" column, positive CTAs |
| `accent-red` | "Before" column, cost figures |
| `font-display` | Section headings (DM Serif Display or equivalent) |
| `font-mono` | Labels, badges, metadata (DM Mono or equivalent) |
| `font-sans` | Body text, CTAs, descriptions |

---

## QR Code on Paper Flyer — Links to `/pitch`

The paper flyer QR must always resolve to the deployed pitch page URL:

```
https://[deployed-domain]/pitch
```

Use `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=[URL]` for the QR image in `presentation_restored.html`.

---

## Relationship Between Layers

```
presentation_restored.html (paper, printed)
  └── QR code → /pitch (digital, on deployed app)
                  └── CTAs → / (landing + chat demo)
                           → /features (optional full feature breakdown)
                           → /dashboard (live admin panel)
                           → tel:[DEMO_NUMBER] (live voice demo)
```

The pitch page is part of the deployed app — it shares the same design system, DynamoDB state, and live demo infrastructure. When the prospect taps a CTA on the pitch page, they are interacting with the real system.

---

## Optional Companion Artifact — Features Page (`/features`)

The Features page is optional and **not** part of the two-layer core presentation system. Use it as a companion artifact when the build is complex enough that a full implementation rundown improves clarity.

### Purpose
- Provide a complete checklist-style rundown of everything built in the app
- Support deeper technical review after the prospect sees `/pitch`
- Serve as implementation evidence when the system has many moving parts

### Decision Rule (Complexity-Based)

Create `/features` only when one or more are true:
- The PoC has many distinct capabilities that cannot be explained clearly on one pitch section
- Multiple channels are implemented (for example voice + chat + SMS + dashboard flows)
- There is value in a full feature-by-feature verification pass with the prospect

Do **not** create `/features` for simple builds where `/pitch` already communicates the full value clearly.

### Scope Requirements (When Included)
- Pure feature rundown/checklist format — no extra sales narrative
- Every listed feature must exist in the deployed app (no placeholders)
- Keep it aligned with the Discovery → PoC → Pitch traceability chain
- Link to `/features` from Section 04 on `/pitch` only when the page exists

---

## Per-Target Customization Checklist

When building the pitch page for a new target, change only these items:

- [ ] Business name and owner name throughout
- [ ] Gap titles, problems, and solutions (research the specific business)
- [ ] Review quotes (pull from Google Maps or Yelp for that business)
- [ ] ROI figures (recalculate using that business's category/volume)
- [ ] Capability descriptions (match to what the PoC actually does)
- [ ] Demo phone number and demo URL
- [ ] Developer contact number in footer
- [ ] Date in header and footer

**Do not change:**
- Section order or count
- Badge severity system
- TypeScript interface shapes
- CTA variant system
- Design token usage

---

## Quality Gate Checklist — Layer 2

Must pass all before finalizing:

- [ ] Exactly five sections in correct order
- [ ] All gaps have badge + title + problem + fix + at least one CTA
- [ ] At least one CTA per gap triggers a live demo interaction
- [ ] Review quotes sourced from real platform (not fabricated)
- [ ] ROI figures show calculation logic in comments or labels
- [ ] Closing section has no pricing, no contract language
- [ ] Footer includes developer contact with tappable `tel:` link
- [ ] QR on paper flyer resolves to `/pitch` on deployed domain
- [ ] All content defined as typed data arrays, not inline JSX strings
- [ ] No `any` types in TypeScript
- [ ] Discovery → Presentation traceability table completed and saved in `docs/`
- [ ] Every gap card traces to a real discovery issue (no invented problems)
- [ ] Every gap CTA links to the actual built feature, not a placeholder

