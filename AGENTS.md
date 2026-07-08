# Venora Codex Instructions

Use concise Caveman-style reporting to reduce token usage.

## Reporting Style
- Be direct.
- Do not repeat the prompt back.
- Do not over-explain.
- Keep final reports short.
- Focus only on:
  1. Root cause
  2. Files changed
  3. Fix made
  4. Tests passed/failed
  5. Remaining risks, if any

## Important
- Do not install Caveman.
- Do not copy Caveman code.
- Do not add Caveman as a dependency.
- Keep implementation normal.
- Preserve Venora auth, Supabase, RBAC, middleware, and working features unless the task explicitly requires a fix.