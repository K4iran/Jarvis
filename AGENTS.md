# Z.E.R.O. — Project Instructions for AI Coding Agents

## Project identity and scope

This repository is the Z.E.R.O. personal AI assistant website (the GitHub repository is still named `Jarvis`). The production branch is `main`; do all redesign and implementation work on the feature branch `zero/ai-overhaul`.

This is an existing, functioning project—not a blank starter template. The goal is to raise the quality of the visual design, interaction design, motion, reliability, and maintainability while preserving the features that already work.

**Do not work on the separate Hoop Central repository. Do not merge LifeOS into Z.E.R.O. Do not add a finance module.**

## Non-negotiable safety and change-control rules

1. Never edit, reveal, copy, log, or move API keys, access tokens, passwords, private credentials, signing keys, or other secrets. Never expose secrets in client-side code.
2. Do not change Supabase secrets, Edge Function secrets, environment files, OAuth credentials, or deployment settings unless the owner explicitly requests that exact change.
3. Do not rewrite the whole app, replace the existing architecture wholesale, or delete a feature because it looks unused.
4. Do not change the production `main` branch. Work only on `zero/ai-overhaul`.
5. Do not merge, deploy, or publish production changes without explicit approval.
6. Before modifying a subsystem, map its dependencies and explain the intended change. If a requirement conflicts with existing behavior or is ambiguous, preserve the existing behavior and ask.
7. Make small, reviewable changes. After each coherent change, run the available checks and report what was and was not tested. Never claim a test passed if it was not run.
8. Do not add paid services, subscriptions, dependencies, or API providers without explaining the cost, purpose, and alternatives first.
9. Never fabricate working functionality, data, integrations, or success states. If a service is unavailable, show a clear honest state.
10. Keep user data private. Preserve consent, data deletion, and privacy controls. Consider UK GDPR and the UK Data Protection Act when changing data handling.

## First task: audit before implementation

Before changing application code:

- Inspect the complete repository structure and identify the actual entry point, modules, styles, assets, external services, storage keys, and deployment assumptions.
- Build a feature inventory of what currently works, what is incomplete, and what is broken. Do not infer that something is broken merely because its implementation is unfamiliar.
- Map the relationships between `index.html`, `zero-features.js`, `orb-network.js`, `skill-tree.js`, `skill-tree.css`, the calendar folder, and the games folder.
- Identify duplicate implementations, dead code candidates, animation conflicts, performance problems, accessibility issues, mobile layout problems, and security risks. Do not delete suspected dead code during the audit.
- Review the current design in the running app if a browser/preview is available. Do not make visual judgments from source code alone.
- Produce a prioritized report with evidence, severity, proposed fix, affected files, and regression risk.
- Wait for approval of the implementation plan before any large-scale refactor or visual redesign.

## Visual direction

The intended interface is a premium, dark, futuristic technical environment: a blend of TRON-like architecture and a restrained, aggressive, Ultron-inspired HUD. It should feel deliberately art-directed and engineered—not like a generic AI-generated dashboard.

### Design principles

- Deep near-black/navy foundations with controlled depth and contrast.
- Precise angular panel geometry, clipped corners, fine technical linework, subtle grid logic, disciplined spacing, and clear information hierarchy.
- Cyan / ice-blue / cool white are the primary interface accents. Purple and green may distinguish relevant skill categories. Red is reserved for critical states or Battle Mode; do not use red as a decorative dashboard accent.
- Use glow sparingly as a signal, not as a substitute for hierarchy.
- Prefer custom, purposeful HUD compositions over repetitive rounded cards and generic dashboard grids.
- Typography should be crisp and highly legible, with restrained technical micro-labels. Micro-detail must support meaning and never become visual noise.
- Keep the interface readable on Android phone screens as well as larger displays. Mobile is a first-class layout, not a compressed desktop layout.
- Make controls discoverable and accessible; maintain clear focus states, readable contrast, and sensible touch targets.

### Avoid the appearance of generic AI-generated UI

Do not use:
- Repetitive cards for every section, oversized gradients, excessive glassmorphism, random floating decorations, gratuitous glow, meaningless data readouts, or decorative labels that do not communicate anything.
- Excessive pill buttons, badges, borders, nested panels, or inconsistent corner radii.
- Constantly moving backgrounds, random particles, gratuitous scanlines, or animations that compete with the content.
- Placeholder charts, fake metrics, or controls that look functional but do nothing.

Every visual element must have a clear purpose. Fewer, stronger details are better than more decoration.

## Motion and animation standards

- Motion should communicate state, hierarchy, cause and effect, or spatial continuity.
- Use a small, consistent motion vocabulary with intentional timing and easing.
- Avoid continuous idle motion unless it is essential to the identity of the element.
- Avoid stacking several animations on the same element.
- Avoid excessive particles and visual noise, especially around small skill-tree orbs.
- Respect `prefers-reduced-motion`, avoid flashing, and keep animations performant on mid-range Android devices.
- Preserve the current main Z.E.R.O. orb. The owner has explicitly chosen to keep it; do not redesign, replace, or remove it. Work on the surrounding interface and its integration only unless specifically asked otherwise.

## Existing functionality to preserve

The following are important project requirements. Verify their current implementation and status before touching them.

### Core assistant and voice

- Preserve the existing voice-first assistant experience and its working conversation flow.
- The current backend uses the Supabase Edge Function `jarvis-chat`; Gemini is the default brain.
- Keep the model/provider layer replaceable so alternative providers can be added later without rewriting the assistant UI or exposing credentials.
- Keep provider credentials server-side. Never put provider keys in browser code.
- Preserve the existing Fish Audio voice integration and user-selected voice configuration.
- Keep listening, thinking, speaking, interruption, error, and idle states distinct and reliable.
- Do not change wake-word behavior or voice behavior casually; test it and document regressions.

### Main orb

- Keep the existing orb implementation and its recognizable shape/identity.
- Do not introduce a replacement orb or a singularity/black-hole redesign.
- Keep the orb's state transitions and audio-reactive behavior intact unless a specific bug fix is approved.

### Skill Tree

- Preserve the 3D skill-tree experience, draggable camera, category zoom, and 2D toggle.
- Keep the large central Z.E.R.O. orb visually prominent.
- Locked skills should remain visually distinct and clearly locked; unlocked skills should have a restrained discovery animation and a temporary “new” indicator where implemented.
- Avoid stray particles around small skill orbs. Particle effects may be appropriate for the main orb or major category atmosphere, not every small node.
- Preserve category color meaning and existing game/utility launches.
- Hangman should retain voice-first interaction and a usable tap/type fallback.
- Sudoku, Weather, and Happy News should retain their intended launch and interaction flows.

### Zen Mode

- Preserve the holographic breathing-tree identity and existing Zen interactions.
- Preserve saved affirmations and their local persistence.
- Music selection should continue to use the user's chosen music destination or local/user-supplied audio approach. Do not reintroduce a Spotify dependency or replace user-supplied audio with a Spotify-only flow.
- Keep Zen visuals calm and deliberate; avoid particle clutter.

### Battle Mode

- Preserve the Battle Mode entry experience and helmet transition.
- Objectives are visual, not spoken aloud.
- Preserve local/user-supplied audio playback behavior and ducking while Z.E.R.O. speaks.
- Do not invent audio assets or replace the existing audio approach without approval.
- Do not turn placeholder controls such as Focus into fake working features.

### Calendar

- Google Calendar is the chosen calendar integration.
- Preserve the existing Google Calendar connection and its read/create/edit/delete capability.
- Any create, edit, or delete action must require the intended user confirmation/approval flow.
- Preserve the current calendar panel and transformation/transition behavior unless a specific improvement is approved.
- Do not switch the project back to Samsung Calendar.

### Separate products

- LifeOS is a separate connected experience/page; do not merge its XP systems into the Z.E.R.O. assistant.
- Hoop Central is a separate GitHub repository and product; do not modify it during this project.

## Architecture and engineering

- The current entry point is a large `index.html` with supporting modules, including `zero-features.js`, `orb-network.js`, `skill-tree.js`, `skill-tree.css`, and calendar scripts.
- Do not assume a framework migration is necessary. First understand the current architecture and deployment model.
- Prefer extracting cohesive, well-bounded modules over creating a new framework or duplicating existing systems.
- Keep CSS scoped to the relevant feature; avoid global selectors that accidentally alter unrelated screens.
- Keep state, event listeners, timers, observers, and audio contexts lifecycle-safe. Avoid duplicate listeners and orphaned animation loops.
- Preserve existing local-storage keys and data formats unless a safe migration is explicitly designed and tested.
- Do not add dependencies simply to solve a small problem that can be solved with existing browser APIs.
- Test on a narrow Android viewport and a desktop viewport whenever preview tooling is available.

## Required delivery format for each implementation phase

For every phase, report:

1. What changed and why.
2. Exact files changed.
3. Features intentionally left untouched.
4. Tests actually run and their results.
5. Visual checks performed, including viewport sizes.
6. Known limitations and remaining risks.
7. How to revert the phase if necessary.

Start with an audit and proposed phased plan. Do not begin a wholesale redesign before that report is reviewed.
