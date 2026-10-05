# AI-Assisted Workflow

Use AI to increase throughput and quality while preserving originality, judgment, and factual accuracy.

## Content Pipeline

1. **Capture**
   - Source from GitHub issues, commits, Beads, logs, screenshots, demos, Obsidian notes, and repo diffs.
   - Save the source path/URL before drafting.

2. **Research**
   - Use `web-research` for current platform rules, docs, and external claims.
   - Prefer official docs for platform requirements, monetization, policy, and specs.
   - Record source URLs in the draft.

3. **Angle Selection**
   - Generate 5-10 possible angles.
   - Pick the one with the clearest audience pain and proof.
   - Reject angles that are only trend bait.

4. **Draft**
   - Generate outline, title variants, hook variants, and proof beats.
   - Keep the first draft grounded in source proof.
   - Use Joe's voice: direct, concrete, technical.

5. **Repurpose**
   - Long form -> thread -> Reddit discussion -> short-video script -> GitHub release note.
   - Short proof clip -> long-form explainer -> README section.
   - Do not cross-post identical wording blindly.

6. **Review**
   - Fact-check claims.
   - Check platform guardrails.
   - Remove filler.
   - Verify links.
   - Confirm AI assistance is not hiding behind fake personal claims.

7. **Publish**
   - Keep external posting behind explicit approval.
   - Use scheduling APIs/tools only after the user approves the exact content and destination.

8. **Measure**
   - Record hypothesis, platform, post URL, metrics, comments, and follow-up ideas.
   - Turn responses into the next content backlog.

## AI Tasks Worth Automating

- Turn a diff into a release note.
- Turn a bugfix into a "failure -> root cause -> fix" post.
- Turn a README into a launch thread.
- Generate platform variants from a canonical essay.
- Generate title/hook variants.
- Generate video chapters and captions.
- Summarize comments and identify follow-up content.
- Draft thumbnails and social-card briefs.
- Build content calendars from Beads/GitHub issues.
- Convert metrics into experiment notes.

## AI Tasks That Need Human Approval

- Posting externally.
- Replying as Joe.
- Cross-posting into Reddit communities.
- Paid promotion.
- Sponsor/affiliate claims.
- Monetization eligibility advice.
- Controversial claims about people, companies, or communities.
- Claims based on private/local data.

## Prompt Template

```text
Use ai-brand-content-system.

Source:
- [local path, URL, issue, commit, screenshot, or demo]

Goal:
- [teach/demo/launch/teardown/discuss]

Audience:
- [developer segment]

Canonical artifact:
- [Substack/Medium/YouTube/GitHub README/X thread]

Create:
- angle
- hook variants
- outline
- platform repurposing pack
- approval checklist
- claims that need verification
```

## Batch Workflow

For a weekly content batch:

1. Pull candidate sources from GitHub/Beads/recent commits.
2. Score each candidate by proof strength, audience pain, novelty, and reuse potential.
3. Pick one flagship long-form artifact and 3-5 short-form derivatives.
4. Draft everything in one batch.
5. Review manually.
6. Schedule/publish only approved pieces.
7. Log metrics after 24h, 72h, 7d, and 30d.
