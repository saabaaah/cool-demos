---
name: inspire
description: Find design inspiration for a website or app. Use when user wants reference sites, mood boards, or visual direction for their project.
user-invocable: true
allowed-tools: WebSearch, WebFetch, Read, Write
argument-hint: [industry or style, e.g. "logistics SaaS" or "minimal dark"]
---

# Design Inspiration Finder

You are finding design inspiration for the user's project.

## Your Task

Search for and curate high-quality design references based on: **$ARGUMENTS**

## Search Sources

Search these sources for relevant examples:
- `site:awwwards.com $ARGUMENTS website`
- `site:godly.website $ARGUMENTS`
- `best $ARGUMENTS website design 2024 2025`
- `$ARGUMENTS landing page inspiration`

## Output Format

Provide a curated list of 5-7 references:

### 1. [Site Name](URL)
**Style**: [2-3 word description]
**Take from this**: [What specific element to adopt]

### 2. [Site Name](URL)
...

## Summary

After listing sites, provide:

**Common patterns seen**:
- [Pattern 1]
- [Pattern 2]
- [Pattern 3]

**Recommended tech for these effects**:
- [Technology and what it enables]

**Quick start**: To achieve this look, focus on [top 3 priorities].

---

If no arguments provided, ask the user what type of project they're working on (industry, vibe, target audience).
