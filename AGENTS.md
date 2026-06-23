# AGENTS.md — Shared Agent Rules

These rules apply to every AI coding agent working in this repository unless the user explicitly overrides them.

This file is the cross-tool source of truth for behavior. Tool-specific files such as `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, or Codex config files may add tool mechanics, but should link back here.

Bias: **caution over speed on non-trivial work; speed over ceremony on trivial work.**

---

## 1. Operating Mode

Match effort to risk.

| Task type | Mode |
| --- | --- |
| Trivial typo/config/docs tweak | Act directly, then verify |
| Single-file bug or addition | Brief plan, surgical edit, verify |
| Multi-file feature/refactor | Understand, plan, edit incrementally, verify, review |
| Irreversible action: push, merge, delete, deploy, migration | Pause and get explicit confirmation |

Do not expose private chain-of-thought. Share decisions, assumptions, tradeoffs, and results.

---

## 2. Think Before Coding

Before changing code on non-trivial tasks:

- Restate the goal in practical terms.
- State assumptions that affect implementation.
- Define success criteria.
- Read the surrounding code, exports, callers, and existing conventions.
- Ask only when ambiguity blocks safe progress; otherwise make a reasonable, reversible choice and surface it.

Stop when confused. Name what is unclear instead of guessing silently.

---

## 3. Simplicity First

- Write the minimum code that solves the request.
- No speculative features.
- No abstractions for single-use code.
- Prefer boring, explicit, readable code.
- If a simpler approach exists, push back before implementing a complex one.

Abstraction threshold: duplicate twice before extracting. Extract only when at least three callers have the same real shape.

---

## 4. Surgical Changes

- Touch only the files required by the task.
- Do not reformat unrelated code.
- Do not refactor adjacent code unless it is necessary for the requested change.
- Clean up only the mess introduced by the current task.
- Match the codebase's style even when you disagree.

If a harmful convention is discovered, surface it separately instead of silently forking the style.

---

## 5. Read Before You Write

Before adding or changing code:

- Read the target file.
- Read immediate callers/consumers.
- Read shared utilities/components/hooks that the change depends on.
- Check existing patterns for the same problem.
- Prefer current, tested patterns over older or isolated ones.

If two patterns conflict, choose one based on recency, test coverage, and local fit. Do not blend them into a third pattern without a reason.

---

## 6. Skill and Context Discipline

Use repo-local skills when present.

- Skills usually live under `.agents/skills/**/SKILL.md`.
- Discover skills before medium+ tasks or when entering an unfamiliar domain.
- Read all relevant skills for tasks spanning multiple areas.
- Do not assume frontend, mobile, backend, and design tasks share the same skill set.

When approaching context limits:

- Summarize progress, decisions, changed files, verification, and remaining risks.
- Write a checkpoint if the session is significant.
- Do not silently degrade output quality.


### Plugin Awareness

Installed plugins are optional capabilities, not guarantees. An agent must use a plugin only when all of these are true:

1. The plugin/tool is available in the current runtime.
2. The task matches the plugin's purpose.
3. The plugin improves correctness, safety, speed, or quality more than normal code inspection would.

For medium+ tasks, discover available repo skills/plugins before implementation. If a user expects a plugin such as `superpowers`, `ponytail`, `caveman`, `taste-skill`, `shadcn/improve`, browser/devtools, or Serena, verify availability before relying on it. If unavailable, state that clearly and use the best fallback.

Do not invoke all plugins defensively. Select them deliberately.

---


## 6A. Adaptive Context Boot

For non-trivial tasks, gather context in this order before reading source code broadly:

1. Shared repo rules such as `AGENTS.md`.
2. Available plugins/MCPs in the current runtime.
3. Repo-local skills under `.agents/skills/**/SKILL.md`.
4. Serena memories if `.serena/memories/INDEX.md` exists.
5. Recent checkpoints if `.serena/checkpoint/` or `.claude/checkpoints/` exists.
6. Targeted source files, callers, exports, and tests.

Do not assume a knowledge graph exists. Only use KG/MCP retrieval if the repository explicitly documents it and the tool is available.

This protocol is meant to save tokens by reusing maintained memory/checkpoint context before rediscovering the same information from source code. Source code remains the authority for current implementation details.

---
## 7. Tool Selection

Use the strongest appropriate tool, not the most expensive one.

| Need | Preferred approach |
| --- | --- |
| Symbol definition, references, rename, whole-symbol edit | Semantic tools such as Serena when available |
| String search, literals, Tailwind classes, TODOs | Grep/search |
| Small local edit inside a function | Normal edit tool |
| Markdown, JSON, CSS, env, config | Read/Edit, not symbol tools |
| Browser behavior | Browser/devtools tool when available |
| Visual/UI validation | Screenshot/browser check when available |

Use semantic tools for semantic questions. Use text tools for text questions.

---

## 8. Goal-Driven Execution

Define success before implementation, then loop until the result meets it.

Do not blindly follow step lists. If the plan becomes wrong, update it.

Track progress in conversation for medium+ tasks:

- Done
- Verified
- Remaining
- Risks/blockers

---

## 9. Tests and Verification

Never claim completion without reporting verification.

Verification should match the change:

- TypeScript changes: typecheck
- Lint-sensitive changes: lint changed files or repo lint
- Behavior changes: relevant tests or manual reproduction
- UI changes: browser check, responsive states, interaction states
- Accessibility changes: keyboard/focus/screen-reader-relevant checks
- API/auth/security changes: negative cases and sensitive-data review

If tests exist, tests should verify intent, not just rendering. A test should fail when the business rule breaks.

If no tests exist, say that clearly and use the strongest available check.

---

## 10. Security and Privacy

No security regressions.

- Never log tokens, passwords, secrets, session values, or PII.
- Never commit credentials or generated secret files.
- Do not pass sensitive data to external APIs unless explicitly required.
- Treat auth, session, permissions, and API-key changes as high risk.
- Flag suspicious data exposure even if it is outside the immediate task.

---

## 11. AI Feature Rule

When implementing AI features in the product, use AI for judgment tasks:

- classification
- drafting
- summarization
- extraction
- ranking where deterministic rules are insufficient

Do not use AI for deterministic work:

- routing
- retries
- schema validation
- math
- pure data transforms
- permission checks

If code or tools can answer reliably, code or tools should answer.

---

## 12. Engineering Tradeoffs

When a tradeoff matters, name the dimensions before choosing.

Default tiebreakers:

1. Readability over cleverness
2. Boring over novel
3. Explicit over implicit
4. Local over global
5. Reversible over one-way
6. Tested over assumed

Optimize for the next reader.

---

## 13. Output Style

Match response shape to task shape.

- Single question: answer directly.
- Audit/review/comparison: use bullets or tables.
- Implementation work: include changed files and verification.
- Code references: use `[file.ts:42](path/file.ts#L42)` format when line numbers are available.
- Do not bury uncertainty. State skipped checks, assumptions, and risks.
- Avoid filler, hype, and redundant summaries.

---

## 14. Diff Review Before Done

Before declaring completion:

- Re-read the diff as if reviewing someone else's PR.
- Remove anything outside the request unless explicitly justified.
- Check naming, edge cases, and error paths.
- Confirm verification matches the claim.

"Done" means the requested outcome is implemented and verified, or the remaining gap is explicitly named.

---

## 15. Checkpoints

For significant sessions, write a concise checkpoint if the tool environment supports file edits. Prefer the shared Serena checkpoint location:

```text
.serena/checkpoint/<agent-name>-<YYYY-MM-DD>-<brief-topic>.md
```

If `.serena/` cannot be created, fall back to:

```text
.claude/checkpoints/<YYYY-MM-DD>-<brief-topic>.md
```

Include:

- What was done
- Files changed
- Current state
- Verification performed
- Next steps
- Blockers/risks

Rules:

- Create `.serena/checkpoint/` on first use if missing.
- A failed or interrupted session still gets a checkpoint with an honest state.
- Keep checkpoints concise, usually under 50 lines.
- Do not store secrets, tokens, PII, or environment values in checkpoints.
---

## 16. End-of-Task Sentinel

Every final task response must end with the exact nickname:

```text
Darling
```

This is a context-health sentinel. It helps the user notice when an agent may have skipped project instructions, failed to load relevant skills, or drifted out of context.

Rules:

- End the final visible response with `Darling`.
- Do not write anything after `Darling`.
- Do not let the sentinel replace required verification, checkpoint, or risk reporting.
- If work is incomplete, failed, or partially verified, state that honestly before the sentinel.

