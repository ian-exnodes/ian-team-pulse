# Serena Memory Index

Routing table for project memories. Read this file first; then read only the entries relevant to the task.

## core.md

Project overview, source map, layer responsibilities, project-wide invariants (Next.js 16 caveats, derived status rule, RLS rules, env split).

Read when:
- Starting any non-trivial session
- Onboarding to the repository
- Needing business context or boundary rules

## tech_stack.md

Frameworks, libraries, version pins, runtime assumptions, tooling.

Read when:
- Adding or changing dependencies
- Choosing implementation patterns
- Debugging build or config issues

## conventions.md

TypeScript style, component/lib split, optimistic-mutation pattern, Tailwind v4 token usage, SQL migration conventions, comment density.

Read when:
- Before editing any source file
- Before creating a new component or lib module
- Before writing a migration

## architecture.md

Module boundaries, data flow, realtime/optimistic model, shared abstractions, known risks.

Read when:
- Working on medium+ tasks
- Touching Dashboard, lib/, supabase/, or cross-file behavior
- Adding new shared hooks or context

## api.md

Supabase client factories and usage patterns, Jira OAuth + REST integration, auth/session flow, RLS interaction model.

Read when:
- Touching any Supabase query or mutation
- Working on Jira import flow
- Changing auth/session behavior
- Adding new API routes under app/api/

## suggested_commands.md

Dev server, build, lint, test, type-check, Supabase CLI, Darwin/BSD caveats.

Read when:
- Running verification
- Debugging local tooling
- Writing new CI steps

## task_completion.md

Definition of Done — required checks before declaring any coding task complete.

Read when:
- Finishing a task
- Deciding what to verify
- Schema changes

## memory_maintenance.md

Rules for keeping memories accurate, dense, and small.

Read when:
- Writing or updating any memory file
- End of a significant session
