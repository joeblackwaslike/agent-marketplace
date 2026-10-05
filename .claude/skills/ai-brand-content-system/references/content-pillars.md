# Content Pillars

## Pillar 1: Shipped Tools

Turn every plugin, MCP server, bot, or local tool into:

- Launch post: what it does, who it is for, install path, demo.
- Build log: key decisions, tradeoffs, problems, surprising constraints.
- Teardown: architecture diagram, key files, why it is shaped that way.
- Demo clip: before/after workflow in 15-60 seconds.
- README/social preview upgrade: GitHub is the proof surface.

Good sources:

- `/Users/joe/github/joeblackwaslike/agent-marketplace`
- `/Users/joe/github/joeblackwaslike/personal-agent-skills`
- `/Users/joe/github/joeblackwaslike/agent-skills`

## Pillar 2: Agent Mistakes And Recovery

This is one of Joe's strongest differentiators. Package failures as useful lessons:

- "The agent kept doing X. I built Y to stop it."
- "This failure mode cost me an hour. Here is the guardrail."
- "What AI coding agents forget after compaction."
- "Why tool output needs receipts."

Preferred format:

1. Symptom.
2. Root cause.
3. Failed attempts.
4. Durable fix.
5. Reusable checklist or skill.

## Pillar 3: Agentic Workflow Architecture

Explain the systems around the models:

- Skills as progressive disclosure.
- Beads as task state.
- Obsidian as durable knowledge.
- MCP servers as tool boundaries.
- GitHub bots as review surfaces.
- Local automation as compounding leverage.

Make the content concrete with diagrams, paths, and commands.

## Pillar 4: AI-Assisted Creation

Show the meta-workflow:

- Research with citations.
- Turn repo diffs into scripts.
- Turn long form into clips.
- Generate outlines, titles, thumbnails, captions, and platform variants.
- Keep humans in the approval loop.

This should be framed as "AI helps produce better technical content faster", not "AI engagement farm."

## Pillar 5: Opinionated Stack Decisions

Use stack decisions to attract the right audience:

- TypeScript for agents, APIs, tools, bots, MCP servers, Claude plugins, GitHub apps, and web apps.
- Python when local model inference, HuggingFace/torch, pydantic-ai, or Python-only libraries justify it.
- Progressive-disclosure skills over giant global prompts.
- Structured APIs and parsers over ad hoc text manipulation.

## Repeatable Series

- "Agentic Stack Notes" - weekly practical lesson.
- "I Built This Because The Agent Failed" - failure-to-tool stories.
- "MCP Tool Teardown" - one tool boundary at a time.
- "Skill Of The Week" - useful private/public skill walkthrough.
- "Context Window Crimes" - examples of context waste and fixes.
- "From Bug To Guardrail" - every bug becomes a reusable rule.
- "Shipping Log" - short launch/update notes for every repo change.

## Content Atom Template

Use this for any new idea:

- Source:
- Audience:
- Pain:
- Hook:
- Proof:
- Artifact:
- Canonical format:
- Short-form angle:
- Discussion prompt:
- CTA:
- Risk/claim to verify:
