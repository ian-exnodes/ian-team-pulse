# CLAUDE.md — Project Instructions

> Claude-specific operating instructions for this repository. Shared engineering behavior lives in [AGENTS.md](./AGENTS.md). Read AGENTS.md before any non-trivial task.

## Source of Truth

-   **Behavioral rules**: [AGENTS.md](./AGENTS.md)
-   **Project-specific instructions**: this file
-   **Local skills**: `.agents/skills/**/SKILL.md`
-   **Harness-registered skills**: invoke only when available in the current tool environment

If this file conflicts with AGENTS.md, follow AGENTS.md for general behavior and this file for Claude/tool-specific mechanics.

---

## Task Startup Protocol

Before coding or editing:

1. Classify the task:
    - **Trivial**: typo, single config value, tiny docs change
    - **Simple**: single-file bug fix or small addition
    - **Medium**: new component/screen/page section, behavior change across a few files
    - **Complex**: feature/refactor touching multiple domains, routing, state, API, auth, or shared abstractions
2. Read the minimum relevant context:
    - For non-trivial tasks, read [AGENTS.md](./AGENTS.md)
    - Read relevant local skills from `.agents/skills/**/SKILL.md`
    - Read exports, immediate callers, and nearby conventions before writing
3. State assumptions and success criteria when the task is ambiguous or medium+.
4. Prefer surgical changes. Do not refactor adjacent code unless required.

For trivial tasks, skip formal planning and say what was skipped and why.

---

## Adaptive Session Boot Protocol

Use this boot protocol for every non-trivial session. It is intentionally adaptive because each repository may have different plugins, MCPs, skills, and memory folders.

### Boot Order

1. **Read shared rules** — read [AGENTS.md](./AGENTS.md) for non-trivial tasks.
2. **Discover available capabilities** — identify which MCP/plugin tools are actually available in the current session. Installed plugins are not guarantees.
3. **Discover local skills** — inspect `.agents/skills/find-skills/SKILL.md` first if present; otherwise inspect relevant `.agents/skills/**/SKILL.md` names/summaries.
4. **Check Serena memory** — if `.serena/memories/INDEX.md` exists, read it before source code. Then read only the memory files relevant to the task.
5. **Check recent checkpoints** — if `.serena/checkpoint/` exists, read the most recent relevant checkpoint before source code. If only `.claude/checkpoints/` exists, read the relevant checkpoint there.
6. **Understand the task** — define assumptions, constraints, success criteria, and likely target areas.
7. **Read only relevant source files** — use Serena symbol tools for symbol navigation and Grep/Read for strings/config/docs.

Do **not** scan the whole repo or bulk-read source code at session start unless the task explicitly asks for broad audit/discovery. Existing memories and checkpoints are the first context layer; source code is the exactness layer.

### Fallback Rules

-   If `.serena/memories/` does not exist, skip Serena memory reads without treating it as an error.
-   If `.serena/checkpoint/` does not exist, create it when writing the first significant checkpoint.
-   If Serena MCP tools are unavailable, use normal search/read/edit tools and state that Serena was unavailable.
-   Do not query KG/knowledge-graph tools unless this repository explicitly documents that a KG MCP exists. This repo currently does **not** assume KG.

### Token-Saving Rule

Prefer this context order because it minimizes repeated source reads:

```text
repo rules → skills → Serena memories → checkpoints → targeted source files
```

The goal is not to avoid source code forever. The goal is to avoid reading source code repeatedly just to rediscover decisions, architecture, or prior session state.

---

## Serena Memory & Checkpoint Setup

This repository should maintain a lightweight `.serena/` knowledge layer. These files are not magic; create and update them with normal file operations (`mkdir`, `touch`, `Write`, `Edit`) or Serena memory tools when available.

### Required Serena Structure

Ensure this structure exists or create missing parts before the first significant session:

```text
.serena/
├── memories/
│   ├── INDEX.md
│   ├── core.md
│   ├── tech_stack.md
│   ├── conventions.md
│   ├── architecture.md
│   ├── api.md
│   ├── decisions.md
│   ├── suggested_commands.md
│   ├── task_completion.md
│   └── memory_maintenance.md
├── checkpoint/
│   ├── active/
│   │   └── <YYYY-MM-DD_HH-mm>_<author-or-agent>_<brief-topic>.md
│   ├── completed/
│   └── archived/
├── decisions/
│   └── ADR-001-<topic>.md
├── project.yml
└── .gitignore
```

If `.serena/memories/` already contains some files, do not overwrite useful content. Add the missing files only.

### Git Policy For `.serena/`

Commit shared knowledge, but never commit local generated cache.

Commit:

```text
.serena/memories/
.serena/checkpoint/active/      # only handoff-worthy active work
.serena/checkpoint/completed/   # useful historical handoffs
.serena/decisions/
.serena/project.yml
.serena/.gitignore
```

Ignore:

```text
.serena/cache/
.serena/**/*.pkl
.serena/project.local.yml
```

Recommended `.serena/.gitignore`:

```gitignore
cache/
**/*.pkl
project.local.yml
```

### How To Create Missing Files

Use normal shell/file operations when the files are missing:

```bash
mkdir -p .serena/memories .serena/checkpoint/active .serena/checkpoint/completed .serena/checkpoint/archived .serena/decisions
touch .serena/memories/INDEX.md
touch .serena/memories/architecture.md
touch .serena/memories/api.md
touch .serena/memories/decisions.md
cat > .serena/.gitignore <<'EOF'
cache/
**/*.pkl
project.local.yml
EOF
```

Then populate the files with the templates below. If Serena memory tools such as `write_memory` are available, prefer them for memory content; otherwise use normal file writes.

### `.serena/memories/INDEX.md` Template

```markdown
# Serena Memory Index

Use this file as the routing table for project memories. Read this file before opening individual memory files.

## core.md

Project overview and high-level purpose.

Read when:
- Starting a new session
- Onboarding to the repository
- Needing project boundaries or business context

## tech_stack.md

Frameworks, libraries, runtime assumptions, and tooling.

Read when:
- Adding or changing features
- Choosing implementation patterns
- Updating dependencies or build tooling

## conventions.md

Coding style, naming, folder conventions, component patterns, and review preferences.

Read when:
- Before editing code
- Before creating new files
- Before refactoring existing code

## architecture.md

Important module boundaries, data flow, routing structure, state ownership, and shared abstractions.

Read when:
- Working on medium+ tasks
- Changing cross-file behavior
- Touching shared components, hooks, context, services, or routing

## api.md

API client conventions, endpoint patterns, auth headers, interceptors, error handling, and request/response shapes.

Read when:
- Touching API calls
- Adding services
- Changing auth/session behavior
- Handling server errors

## suggested_commands.md

Known working commands for install, dev server, typecheck, lint, tests, build, and formatting.

Read when:
- Planning verification
- Running checks
- Debugging local tooling

## task_completion.md

Definition of Done for this repository.

Read when:
- Finishing a task
- Reporting verification
- Deciding whether checkpoint/memory updates are needed

## memory_maintenance.md

Rules for keeping memories small, accurate, and useful.

Read when:
- Creating or updating memory files
- Finishing a significant session
- Discovering durable project knowledge
```

### `.serena/memories/architecture.md` Template

```markdown
# Architecture Memory

Keep this file focused on durable architecture facts. Do not paste large source snippets.

## Project shape

- App type: <React frontend / React Native app / Node service / etc.>
- Main source folder: `<path>`
- Route entry points: `<path>`
- Shared UI location: `<path>`
- API/service layer: `<path>`
- State management: `<context/hooks/store/etc.>`

## Module boundaries

- `<area>` owns `<responsibility>`
- `<area>` should not import from `<area>` unless `<reason>`

## Data flow

- `<flow name>`: `<source>` → `<transform/state>` → `<UI/API>`

## Shared abstractions

- `<component/hook/helper>` is used for `<purpose>`
- Prefer `<existing abstraction>` before creating a new one

## Known risks

- `<risk>`
```

### `.serena/memories/api.md` Template

```markdown
# API Memory

Keep this file focused on durable API/client facts. Do not paste secrets.

## Client setup

- HTTP client: `<axios/fetch/tanstack/etc.>`
- Base client path: `<path>`
- Base URL source: `<env/config>`
- Auth mechanism: `<JWT/session/cookie/etc.>`

## Conventions

- Request naming: `<convention>`
- Response shape: `<convention>`
- Error handling: `<convention>`
- Loading/empty/error UI pattern: `<convention>`

## Important services

- `<service file>` handles `<domain>`

## Auth/session flow

- `<login/refresh/logout flow>`

## Known risks

- `<risk>`
```

### Memory Creation Rules

Create or update memory when the session discovers durable knowledge that will likely help future tasks, such as:

- architectural decisions
- module boundaries
- important data flows
- API conventions
- reusable component conventions
- verification commands that actually work
- known risks or traps

Do not create memory for one-off details, temporary debugging notes, guesses, secrets, credentials, or large pasted code.

### Memory Update Protocol

At the end of a significant session:

1. Update the relevant memory file only if durable project knowledge changed.
2. Keep each memory concise and skimmable.
3. Prefer bullets over paragraphs.
4. Add links/paths to source files instead of copying code.
5. If a memory becomes stale, correct it immediately or add a warning.
6. Update `INDEX.md` whenever a new memory file is added.

---

## Skill Loading Policy

Local skills are Markdown files on disk. Read them with `Read`; do **not** invoke them through a generic `Skill` tool unless the harness explicitly registers that skill.

### Skill Discovery

When the relevant skill is unclear, or when working in a new repo/domain, first inspect:

-   `.agents/skills/find-skills/SKILL.md` if present
-   `.agents/skills/**/SKILL.md` names and summaries
-   repo documentation such as `README.md`, `docs/**`, `.cursorrules`, `.cursor/rules/**`, `AGENTS.md`, `CLAUDE.md`

Do not assume this repo has the same skill set as another repo.

### Default Skill Routing

Read all relevant skill files when a task spans multiple areas.

| Task area                          | Read skills matching these names or topics                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| React components, hooks, state     | `react`, `hooks`, `state`, `vercel-react-best-practices`                            |
| Page composition, layouts, routing | `composition`, `routing`, `layout`, `next`, `vite`, `vercel-composition-patterns`   |
| UI design, CSS, Tailwind           | `design`, `css`, `tailwind`, `web-design-guidelines`, `tailwind-clean-architecture` |
| UI polish / UX quality             | `polish`, `interaction`, `animation`, `accessibility`, `taste-frontend-polish`      |
| React Native / mobile              | `mobile`, `react-native`, `expo`, `native`, `gesture`, `navigation`                 |
| API / data fetching                | `api`, `query`, `axios`, `tanstack`, `server-state`                                 |
| Forms / validation                 | `form`, `react-hook-form`, `zod`, `validation`                                      |
| Testing                            | `test`, `testing-library`, `vitest`, `jest`, `e2e`, `playwright`                    |
| Performance                        | `performance`, `bundle`, `render`, `memo`, `profiling`                              |
| Accessibility                      | `a11y`, `accessibility`, `keyboard`, `screen-reader`                                |
| Codebase-specific conventions      | `architecture`, `project`, `conventions`, `domain`                                  |
| Iterative implementation workflow  | `implementation-loop`, `workflow`, `verification`, `self-review`                    |

If no matching skill exists, proceed with AGENTS.md + local code conventions, and mention that no dedicated skill file was found.

---

## Plugin / MCP Capability Discovery

Installed plugins are not automatically useful unless the current Claude session exposes their tools and the instructions say when to use them. At the start of any medium+ task, and at the start of work in a new repository, do a lightweight capability check:

1. Identify available MCP/plugin tools in the current session.
2. Identify repo-local skills under `.agents/skills/**/SKILL.md`.
3. Read `find-skills` or equivalent skill index if present.
4. Pick tools/skills by task fit; do not invoke every plugin by default.
5. If an expected plugin is unavailable, continue with normal repo inspection and say the plugin was not available in this session.

### Plugin Activation Matrix

| Plugin / skill family           | Use when                                                                                               | Do not use when                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `serena`                        | Symbol navigation, references, renames, whole-symbol edits, cross-file TypeScript/JavaScript refactors | Literal/string search, docs/config edits, tiny local line edits                    |
| `superpowers`                   | Workflow discipline: brainstorming, planning, TDD, systematic debugging, verification, code review     | Trivial typo/config edits where ceremony costs more than it helps                  |
| `ponytail`                      | Tailwind class cleanup, class grouping, utility-class refactors, design-token consistency if available | Non-Tailwind styling or semantic code navigation                                   |
| `caveman`                       | Simplicity pass: reduce overengineering, inline premature abstractions, make code more obvious         | When the user explicitly asks for a generalized architecture or reusable framework |
| `taste-skill` / frontend polish | UI quality, spacing, hierarchy, interaction states, empty/loading/error states, responsive polish      | Pure business logic or backend-only changes                                        |
| `shadcn/improve`                | shadcn/ui component usage, composition, accessibility, variant cleanup, design-system alignment        | Projects not using shadcn/ui unless migrating intentionally                        |
| browser/devtools MCP            | Validate rendered UI, interactions, responsive behavior, console/network issues                        | Pure static code edits that do not affect runtime behavior                         |

### Plugin Use Reporting

For medium+ tasks, include a short final note:

-   Plugins/skills used
-   Plugins/skills expected but unavailable
-   Verification performed

Never claim a plugin was used unless a corresponding tool or skill file was actually invoked/read.

---

## Project Profile

Update this section per repository. Do not blindly copy it across projects.

| Layer        | Current value                       |
| ------------ | ----------------------------------- |
| App type     | React frontend                      |
| Framework    | React 18 + Vite + TypeScript strict |
| Styling      | Tailwind CSS + MUI                  |
| Routing      | React Router                        |
| State        | React hooks + context               |
| Forms        | React Hook Form                     |
| API          | Axios REST clients                  |
| Verification | `npx tsc --noEmit`, `npx eslint`    |

### Project Structure

```text
.
├── .agents/skills/          # Local skill files — read before coding
├── src/
│   ├── pages/               # Route-level page components
│   ├── components/          # Legacy shared components
│   ├── componentsV2/        # Current shared components; prefer for new work
│   ├── partials/            # Page-specific composition blocks
│   ├── hooks/               # Custom React hooks
│   ├── context/             # React context providers
│   ├── service/             # API clients
│   ├── utils/               # Pure helpers
│   ├── types/               # Shared TypeScript types
│   ├── routes.tsx           # Route table
│   └── App.tsx / main.tsx   # Entry points
└── public/                  # Static assets
```

When a repo differs from this profile, update this section first or defer to the repo's actual files.

---

## Serena MCP Policy

Use Serena for **semantic, symbol-level code intelligence**, especially in `.ts`, `.tsx`, `.js`, `.jsx`, and other language-server-supported files.

### Use Serena When

| Need                                            | Preferred Serena tool                          |
| ----------------------------------------------- | ---------------------------------------------- |
| Understand what symbols a file exports/contains | `get_symbols_overview`                         |
| Find a component/function/type/class definition | `find_symbol`                                  |
| Find callers/usages of a symbol                 | `find_referencing_symbols`                     |
| Rename a symbol across the codebase             | `rename_symbol`                                |
| Replace a whole function/component/method body  | `replace_symbol_body`                          |
| Insert code before/after a symbol               | `insert_before_symbol` / `insert_after_symbol` |

### Prefer Grep / Read / Edit When

-   Searching strings or patterns: Tailwind classes, TODOs, literals, env keys, copy text
-   Editing markdown, JSON, CSS, env files, lockfiles, config files
-   Making tiny in-function edits that do not require symbol-bound replacement
-   Checking whether a string exists anywhere
-   Inspecting generated files or unsupported languages

### Initial Instructions Rule

Call `mcp__plugin_serena_serena__initial_instructions` only for:

-   multi-file symbol navigation
-   cross-file refactors
-   symbol renames
-   unfamiliar codebases where semantic navigation will likely save work

Skip it for typo fixes, docs/config edits, single-file changes, and direct string searches.

### Serena Workflow

For medium+ code changes:

1. Use `get_symbols_overview` on the target file before editing.
2. Use `find_symbol` for the exact component/function/type to change.
3. Use `find_referencing_symbols` before changing public props, exported types, or shared helpers.
4. Use symbol-aware edits when replacing whole definitions.
5. Use normal Edit for small intra-symbol changes.
6. Verify with the repo's typecheck/lint/test commands.

Rule of thumb: **symbols → Serena; strings → Grep; files/docs/config → Read/Edit.**

---

## Architecture Heuristics

-   State lives where it is used. Lift only when siblings share it.
-   Use context only when prop drilling crosses 3+ levels and the value changes rarely.
-   URL state beats React state for shareable filters, tabs, pagination, and modal state.
-   Props down, events up. Prefer named handlers over passing raw setters.
-   Custom hooks own behavior; components own UI. A hook returning JSX is a smell.
-   Do not add `useMemo` / `useCallback` without a concrete reason.
-   Keep form state inside React Hook Form; avoid shadow state with `useState`.
-   Prefer existing shared components from the current recommended component directory.
-   Avoid adding dependencies unless the user asked or the benefit is clear.

---

## Workflow

| Complexity | Required workflow                                                              |
| ---------- | ------------------------------------------------------------------------------ |
| Trivial    | Implement → Verify                                                             |
| Simple     | Plan briefly → Implement → Verify                                              |
| Medium     | Understand → Plan → Implement → Verify → Self-review                           |
| Complex    | Understand → Plan → Isolate if useful → Implement → Verify → Review → Complete |

### Standard Development Loop

Use this loop for every non-trivial coding task. Keep it lightweight for simple work and stricter for medium+ work.

1. **Understand**
    - Read AGENTS.md for non-trivial tasks.
    - Load relevant skills before source code when available.
    - Check Serena memories and checkpoints before rediscovering architecture.
    - Read only the files needed to understand the task.
2. **Plan**
    - State assumptions and success criteria for ambiguous or medium+ work.
    - Identify target files and likely validation commands.
    - Prefer the smallest safe change.
3. **Implement**
    - Follow existing project conventions.
    - Avoid unrelated refactors.
    - Keep edits scoped to the requested outcome.
4. **Validate**
    - Run the repo's relevant checks.
    - At minimum, prefer typecheck and lint for changed code.
    - Run tests or browser/devtools validation when behavior/UI is affected.
5. **Fix and Re-run**
    - If validation fails, investigate the cause.
    - Fix the issue.
    - Re-run the failed validation.
    - Continue until all required checks pass or the blocker is clearly reported.
6. **Self-review**
    - Review for bugs, edge cases, regressions, unnecessary complexity, duplication, accessibility issues, and performance risks.
    - If issues are found, fix them and re-run relevant validation.
7. **Complete**
    - Summarize changes.
    - List verification performed.
    - Mention remaining risks or skipped checks honestly.
    - Write a checkpoint for significant sessions.

Do not stop after the first implementation attempt if validation fails. Iterate until the success criteria are met or a real blocker is identified.

### Loop Skill Delegation

If `.agents/skills/implementation-loop/SKILL.md`, `.agents/skills/implementation-loop.md`, or a similarly named loop skill exists, read it for medium+ implementation tasks.

Use the loop skill when the task involves:

-   new feature work
-   multi-file changes
-   UI behavior changes
-   refactors
-   bug fixes requiring investigation
-   validation failures that need iterative repair

Do not duplicate long loop instructions in this file. CLAUDE.md defines the default policy; the skill file defines the detailed execution checklist.

### Verification

Never claim completion without saying what was verified.

Default checks for this repo:

```bash
npx tsc --noEmit
npx eslint <changed-files>
```

When available and relevant:

-   Run unit/integration tests for changed behavior
-   Use browser/devtools MCP for UI behavior
-   Check responsive states for UI work
-   Check keyboard and screen-reader behavior for interactive UI

If a check cannot run, say why and what risk remains.

## Session Checkpoint Protocol

Write a checkpoint at the end of every significant session. Use Serena's checkpoint folder as the shared, cross-agent location.

### Checkpoint Directory Model

Use three lifecycle folders:

```text
.serena/checkpoint/active/      # current or interrupted work; read first
.serena/checkpoint/completed/   # completed handoffs worth keeping
.serena/checkpoint/archived/    # old checkpoints kept for history only
```

Primary path pattern:

```text
.serena/checkpoint/active/<YYYY-MM-DD_HH-mm>_<author-or-agent>_<brief-topic>.md
```

Examples:

```text
.serena/checkpoint/active/2026-06-26_09-15_ian_auth.md
.serena/checkpoint/active/2026-06-26_13-40_claude_payment.md
.serena/checkpoint/completed/2026-06-26_17-20_mary_profile.md
```

Fallback path if `.serena/` cannot be created:

```text
.claude/checkpoints/<YYYY-MM-DD_HH-mm>_<author-or-agent>_<brief-topic>.md
```

### Timestamp Rule

Always include local date and time in checkpoint filenames. This prevents collisions when multiple team members or agents work on the same day. Use 24-hour time. Prefer the user's/project's local timezone when known.

Filename format:

```text
YYYY-MM-DD_HH-mm_author_topic.md
```

### Template

```markdown
# Checkpoint: <author-or-agent> — <YYYY-MM-DD HH:mm TZ> — <topic>

Date: <YYYY-MM-DD>
Time: <HH:mm TZ>
Author/Agent: <name>
Branch: <branch-name or unknown>
Commit: <short-sha or uncommitted>
Topic: <brief topic>

## What was done

-   <bullet list>

## Files changed

-   <list>

## Current state

-   <working / broken / partial>

## Verified

-   <commands or manual checks>

## Next steps

-   <what the next session should pick up>

## Blockers / Risks

-   <anything that could block progress>
```

Rules:

-   Create checkpoint folders on first use: `mkdir -p .serena/checkpoint/active .serena/checkpoint/completed .serena/checkpoint/archived`.
-   Write before ending a significant session.
-   If interrupted or failed, still write the checkpoint and mark the state honestly.
-   Keep it under 60 lines.
-   Do not overwrite checkpoints. Create a timestamped file instead.
-   Move active checkpoints to `completed/` after the task is merged, abandoned, or superseded.
-   Periodically archive stale completed checkpoints to `archived/`.
-   Mention unavailable plugins/skills only when relevant to the session outcome.

### Checkpoint Creation Example

For a completed auth session on 2026-06-26 at 09:15 local time:

```bash
mkdir -p .serena/checkpoint/active .serena/checkpoint/completed .serena/checkpoint/archived
cat > .serena/checkpoint/active/2026-06-26_09-15_claude_auth.md <<'EOF'
# Checkpoint: claude — 2026-06-26 09:15 +07 — auth

Date: 2026-06-26
Time: 09:15 +07
Author/Agent: claude
Branch: feature/apple-login
Commit: uncommitted
Topic: Apple Sign In

## What was done

-   Implemented Apple Sign In flow
-   Updated auth service integration

## Files changed

-   src/pages/Login.tsx
-   src/context/AuthContext.tsx
-   src/service/auth.service.ts

## Current state

-   working

## Verified

-   npx tsc --noEmit
-   npx eslint src/pages/Login.tsx src/context/AuthContext.tsx src/service/auth.service.ts

## Next steps

-   Test on a real iOS device

## Blockers / Risks

-   Apple Sign In still requires real-device verification
EOF
```

---

## Completion Signal / Context Sentinel

At the end of every completed response/task, finish with the exact line:

```text
Done, Darling ✨
```

Purpose: this is a lightweight context-health sentinel. If the final response does not include this exact signal, assume the agent may have skipped these instructions, missed relevant skills, or drifted out of the project context.

Rules:

-   The final visible response must end with `Done, Darling ✨`.
-   Do not use the sentinel as a replacement for verification, checkpointing, or reporting skipped checks.
-   If the task fails or is only partially complete, clearly state the failure/partial state first, then still end with `Done, Darling ✨`.
-   Do not add extra words after the completion signal.
