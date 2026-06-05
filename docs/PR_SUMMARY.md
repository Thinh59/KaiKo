# Fix Railway deployment & match_history schema

## Summary
Fixes a failed Railway deployment and hardens the `match_history` table schema migration.

## Changes
- **`backend/railway.json`** (new): adds the missing service config Railway was looking for at `/backend/railway.json`. Uses NIXPACKS builder, `uvicorn main:app` start command, and an on-failure restart policy.
- **`backend/main.py`**: extracts the `match_history` column migrations into a reusable `ensure_match_history_columns()` helper. It runs at startup and again on `GET /history/{username}`, so the `visibility`, `scores_json`, `transcript_*`, and `fallacies_list_*` columns are guaranteed to exist before history is queried (fixes missing-column errors on older DBs).
- **`backend/requirements.txt`**: `uvicorn` → `uvicorn[standard]` to include production server extras (websockets, uvloop, httptools).

## Why
- Deployment failed at Initialization → Snapshot code: `service config at '/backend/railway.json' not found`.
- Querying history on databases provisioned before these columns existed raised missing-column errors.

## Testing
- [ ] Railway redeploys successfully past the Snapshot step.
- [ ] `GET /history/{username}` returns without column errors on an existing DB.
