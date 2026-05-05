---
name: socraticode-project-index
description: Use when working inside this repo and the agent should index the codebase with SocratiCode before editing, read the index for repo orientation, and refresh the index after changes so other agents and IDEs inherit current context.
---

# SocratiCode Project Index

## Purpose

Use SocratiCode as the shared project map for this repo.

## Before Any Work

1. Check that the SocratiCode MCP server is enabled in the agent environment.
2. Index this repository if the index is missing or stale.
3. Read the index before planning edits.
4. Use the index to find:
   - entry points,
   - route clusters,
   - shared layout/navigation surfaces,
   - data/API clusters,
   - files adjacent to the change.

## While Coding

- Prefer indexed search over random file browsing.
- Check related files before patching any shared route, layout, auth, or data-contract surface.
- If the patch touches multiple surfaces, inspect the full cluster first.

## After Coding

- Refresh the SocratiCode index.
- Re-check the changed surface and its neighbors.
- If the change affected routing, auth, layout, or shared state, refresh the broader repo index, not only one file.

## Prompt Template

Use this when starting in the repo:

```text
Index this repo in SocratiCode first. Show me the current index status, the main entry points, and the related files for the area I am about to edit. After changes, refresh the index and summarize what changed.
```

## Stability Rule

- Do not rely on memory alone if SocratiCode is available.
- Do not assume the last index is current after code edits.
- Do not edit shared surfaces without checking the index and nearby files first.

