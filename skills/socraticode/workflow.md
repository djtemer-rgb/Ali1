# SocratiCode Workflow for Ali1

## What This Folder Is

This is the project-local skill reference for SocratiCode. Other agents and IDEs can read it directly from the repo.

## Minimal Operating Rule

- Index first.
- Read the index.
- Edit with awareness of neighbors.
- Refresh the index after edits.

## Good Times to Re-index

- route changes
- layout changes
- auth changes
- data-contract changes
- navigation changes
- cross-file refactors

## Good Search Targets

- `app/layout.tsx`
- `app/loading.tsx`
- `app/error.tsx`
- `app/not-found.tsx`
- `middleware.ts`
- `app/api/*`
- `app/components/*`

## Fallback

- If SocratiCode is not reachable in a given IDE, use the local repo files and follow the same read-before-edit / refresh-after-edit rule manually.

