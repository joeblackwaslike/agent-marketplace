---
name: ai-brand-content-system
description: Use when building Joe Black's AI development brand, planning original content, repurposing work across YouTube, TikTok, Instagram, X/Twitter, Reddit, Medium, Substack, GitHub, or automating AI-assisted content workflows. Covers joeblack.nyc positioning, platform playbooks, source inventory, publishing guardrails, and metrics experiments.
---

# AI Brand Content System

Use this skill to turn Joe's actual AI development work into a repeatable content engine. The default brand lane is not generic AI news. It is practical agentic development from the trenches: Claude/Codex plugins, MCP tools, AI coding workflows, agent mistakes, local automation, and hard-won engineering lessons.

## First Load

Always start with `references/source-inventory.md` to locate the current brand/site source files and related local skills.

Then load only the relevant reference:

| Task | Load |
| --- | --- |
| Brand strategy, voice, positioning, audience | `references/brand-positioning.md` |
| Content calendar, series, topics, original ideas | `references/content-pillars.md` |
| Platform-specific packaging for YouTube, TikTok, Instagram, X, Reddit, Medium, Substack, GitHub | `references/platform-playbooks.md` |
| Using AI to research, draft, edit, clip, repurpose, summarize metrics, and maintain workflow | `references/ai-assisted-workflow.md` |
| Automation, approval gates, platform safety, self-promotion, originality, disclosure | `references/publishing-guardrails.md` |
| Growth tracking, experiments, metrics, content retrospectives | `references/metrics-and-experiments.md` |

If a visual asset, social card, site mock, thumbnail direction, or brand-consistent UI is needed, also invoke `agent-marketplace-design-system`.

## Core Workflow

1. **Anchor in a real source.** Start from shipped code, a repo diff, a bug, a demo, a lesson learned, a benchmark, a design decision, a GitHub issue, or a local note. Do not manufacture expertise.
2. **Pick the content job.** Choose one: teach, demo, teardown, compare, document a mistake, launch a project, explain a workflow, or start a debate with evidence.
3. **Choose the canonical artifact.** Prefer one durable source: long-form article, YouTube video, GitHub README/tutorial, or Substack post.
4. **Repurpose deliberately.** Derive platform-native posts from the canonical artifact instead of cross-posting the same copy everywhere.
5. **Keep a human approval gate.** Drafts, scripts, clips, and schedules can be AI-assisted. External posting, replies, paid promotion, and high-volume automation require explicit user review.
6. **Record the loop.** Capture hypothesis, target audience, platform package, publish URL, initial metrics, follow-up actions, and what to reuse next time.

## Default Output Shape

For a content request, produce:

- **Angle:** one sentence explaining why this is worth attention now.
- **Source proof:** local paths, URLs, commits, issues, screenshots, or demos the content is based on.
- **Canonical artifact:** title, outline, hook, proof beats, CTA.
- **Repurposing pack:** X thread/post, Reddit discussion prompt, LinkedIn-style variant if useful, Medium/Substack framing, short-video script, YouTube title/description.
- **Approval checklist:** facts verified, claims supported, platform risks checked, links ready, next metric to watch.

## Standing Rules

- Joe's brand should sound technical, direct, useful, and field-tested. Avoid influencer filler, fake urgency, trend-chasing, and empty "AI will change everything" claims.
- Treat Reddit as community participation first and promotion second.
- Treat GitHub as proof and distribution: README quality, issue trails, changelogs, demos, social previews, and pinned repos matter.
- Treat short video as proof compression: show the tool, error, workflow, or before/after quickly.
- Treat long form as durable leverage: turn repeatable lessons into searchable essays, tutorials, and project docs.
- Cite or link official platform guidance when platform rules matter.
