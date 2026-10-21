# Plane provider

`backlog.provider: plane`, with GitHub as the code host. The board is a self-hosted **Plane Community Edition** project; branches, pull requests and claims stay on GitHub. Experimental, and not built yet: this file holds the facts the adapter is designed on. The local test rig is described in **scripts/plane-rig/README.md**.

## Verified API facts

Checked on 2026-10-21 against Plane CE **v1.4.2** (`edition: PLANE_COMMUNITY`, latest stable self-host release at the time), started by `scripts/plane-rig/rig`, with a workspace API key (`X-API-Key`) on the public REST API `/api/v1/`. Every observation below can be replayed with `scripts/plane-rig/factcheck`, which works in a throwaway project `FC` and prints one line per check. `<P>` stands for `workspaces/<slug>/projects/<project id>`.

### Can the API create states, estimates, cycles and modules?

| Object | Through `/api/v1` | Evidence |
|---|---|---|
| States | **Yes**: create, rename, recolor, reorder, delete | `POST <P>/states/` → 201. `PATCH <P>/states/<id>/` → 200. `DELETE` → 204 for an empty, non-default state. |
| Estimates | **No** | `GET` and `POST <P>/estimates/` → 404 `Page not found`. The view exists in the source (`plane/api/urls/estimate.py`) but 1.4.2 does not mount it. The app API (`/api/workspaces/…/estimates/`) is session-only: 401 with an API key. |
| Estimate on a work item | **Yes**, by point id | `PATCH <P>/work-items/<id>/ {"estimate_point": "<point id>"}` → stored. `GET …?expand=estimate_point` returns the point object, so its value can be read back. |
| Project estimate switch | **Yes** | `PATCH <P>/ {"estimate": "<estimate id>"}` → 200. |
| Cycles | **Yes**, once enabled | `POST <P>/cycles/` without dates → 201. With the project's cycles off → 400 `Cycles are not enabled for this project`. |
| Modules | **Yes**, once enabled | `POST <P>/modules/` → 201, status `planned`. `PATCH status=completed` → 200, `POST <P>/modules/<id>/archive/` → 204. |
| Project features | **Yes** | A new project has `cycle_view` and `module_view` false. `PATCH <P>/ {"cycle_view": true, "module_view": true}` → both true. |

What this means for the adapter:

- `provision` can create the seven states, switch on cycles and modules, and turn the project estimate on. It cannot create the estimate or its `quickwin` / `medium` / `large` points. Either a human creates them once in the project settings (Estimates, type Categories), or the rig-style Django shell does it on a server the maintainer runs. The adapter must look the point ids up by value: `GET <P>/work-items/?expand=estimate_point` gives them once at least one card has a size, otherwise the ids come from settings.
- Every new project is seeded with Backlog (backlog group, **default**), Todo, In Progress, Done and Cancelled. The rig keeps Todo and Done, renames Cancelled to Canceled, deletes Backlog and In Progress, and makes Todo the default so a card created without a state lands in todo (verified: create without `state` → Todo).
- Plane bug to work around: `PATCH <state> {"default": true}` through `/api/v1` does **not** clear the previous default (the serializer gets no project context), so after it both Backlog and Todo report `default: true`. The old default must be patched to `false` before it can be deleted (`DELETE` on a default state → 400 `Default state cannot be deleted`).
- `POST <P>/states/` ignores `sequence` and appends the state at the end. Order the columns with a `PATCH` afterwards.
- Triage states (`is_triage`) are hidden from `/api/v1` and left alone.

### How does sort order behave on reorder?

`sort_order` is a float on each work item. Plane never renumbers it.

- **On create**, a card gets the highest `sort_order` in its state plus 10000, so it lands at the bottom of that column. The first card in an empty state gets 65535. Observed: FC-1 = 65535, FC-2 = 75535, FC-3 = 85535, and a fourth card created without a state = 95535.
- **On reorder**, the client writes the new value and nothing else moves. `PATCH FC-3 {"sort_order": 70535}` stored 70535, and FC-1 and FC-2 kept 65535 and 75535. Negative values are accepted (`-5` → 200).
- **The web UI** drags with the same arithmetic (checked in the 1.4.2 frontend bundle): dropping at the top writes the first card's value minus 65535, at the bottom the last card's value plus 65535, and between two cards their midpoint. Lower value means higher on the board.
- **On a state change**, `sort_order` is kept as is (Todo → Grilling: 65535 → 65535). The card lands wherever that number falls in the new column, so the adapter must set it explicitly when the contract wants a position (for example, the bottom of `grilled`).
- **Reading in priority order:** `GET <P>/work-items/?order_by=sort_order` returned `FC-1 FC-3 FC-2 FC-4`, which is the reordered sequence. Without `order_by` the list is newest first. The list does not filter by state server-side (`pql` and `filters` are refused on CE), so `list` sorts and filters client-side.
- Midpoints halve the gap on each insert between the same two cards. After about 50 inserts in one gap, floats stop separating them. The adapter should renumber a column (spaced by 65535) when a gap gets too small.

### Do relations and parent work items work?

**Yes, both.**

- `POST <P>/work-items/<b>/relations/ {"relation_type": "blocked_by", "issues": ["<a>"]}` → 201. `GET` on b lists a under `blocked_by`, and `GET` on a lists b under `blocking`. Posting the same relation again → 201 with still one entry, so `depend` is idempotent for free.
- There is **no route to remove a relation** in `/api/v1`: only `GET` and `POST` are mounted on `relations/` (`relations/remove/` → 404). The contract's `depend` only adds, so this is fine, but a dependency added by mistake has to be removed in the UI.
- `POST <P>/work-items/ {"parent": "<root id>"}` stores the parent, `PATCH {"parent": "<root id>"}` sets it on an existing card, and `PATCH {"parent": null}` clears it (200). The list has no server-side parent filter, so children are found by filtering `parent` client-side. `sub_issues_count` is not in list rows.
- Lookup by display id works: `GET workspaces/<slug>/work-items/FC-1/` → 200 with the same id. The adapter can use `WA-42` directly.
- Cycles: `POST <P>/cycles/<c>/cycle-issues/ {"issues": [...]}` adds cards. **A card is in at most one cycle.** Adding it to another cycle moves it silently (a in sprint-a: false, in sprint-b: true). `DELETE <P>/cycles/<c>/cycle-issues/<id>/` → 204.
- Modules: `POST <P>/modules/<m>/module-issues/ {"issues": [...]}`. **A card can be in several modules** (a in 1.0 and in 1.1). The adapter must enforce "one milestone per ticket" itself.
- Links: `POST <P>/work-items/<id>/links/ {"url", "title"}` → 201. The same URL again on the same card → 400, so `link-pr` must read before writing, or treat 400 as "already linked".

### Does CE ship the GitHub integration?

**No.** CE v1.4.2 has no GitHub integration to disable.

- The backend mounts no integration routes. `/api/workspaces/<slug>/workspace-integrations/`, `/api/workspaces/<slug>/integrations/` and `…/github-repository-sync/` all return **404**. An existing session-only route returns 401 to an API key, as estimates do, so 404 means the route is absent, not forbidden. In the source, `plane/app/urls/` has no integration route apart from the GPT one. Legacy `GithubRepository` models remain in the database layer, with no view using them.
- The CE compose has no integration service. Plane's commercial editions run a separate integrations service, and it is not part of the community stack.
- `is_github_enabled` in `/api/instances/` is the GitHub **OAuth sign-in** switch (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`), which does not sync issues or PRs. It is `false` on the rig.
- The web bundle still ships the integration i18n strings and a `syncGithubRepository` client call, but the backend answers 404.

So the single-writer rule holds by default on CE. Setup should still check it, because a Plane Commercial server could have the integration enabled.

### Does CE apply API rate limits?

**Yes: 60 requests per minute per API key by default, and the server admin can lift it.**

- The default comes from the `API_KEY_RATE_LIMIT` environment variable (`60/minute` in the official `variables.env` and compose). It is a Django REST Framework throttle keyed on the `X-API-Key` value (`plane/api/rate_limit.py`), so it applies to every `/api/v1` call made with that key. Each token row also has an `allowed_rate_limit` column, but 1.4.2 does not read it.
- Every response carries `X-RateLimit-Remaining` and `X-RateLimit-Reset` (a Unix timestamp).
- 100 `GET users/me/` calls in a burst got 60 × 200 and 40 × 429. The first 429 came at request 61, with `Retry-After: 59`.
- The limit has no off switch: the value goes straight into DRF's `SimpleRateThrottle`, and an empty value breaks parsing. A huge per-second rate lifts it in practice and keeps the throttle history tiny. With `API_KEY_RATE_LIMIT=1000000/second` and the API container recreated, 400 parallel calls on one key all got 200, none 429 (the variable is read at start-up, so a plain restart without recreating the container does not pick up a change).
- **The provider requires the limit lifted:** set `API_KEY_RATE_LIMIT=1000000/second` in the server's `plane.env`. The rig ships with that value. The adapter still honours `Retry-After` on a 429, so a server left at the default degrades to slow, not broken.

## Runtime footprint

Measured on the rig (macOS arm64, Docker Desktop 29.x VM with 18 CPUs and 7.7 GiB of RAM), idle, after bootstrap.

- **Containers:** 12 running services plus 1 one-shot `migrator` that exits after the migrations. The services are web, space, admin, live, api, worker, beat-worker, proxy, plane-db (Postgres 15.7), plane-redis (Valkey 7.2), plane-mq (RabbitMQ 3.13) and plane-minio (S3 storage).
- **RAM:** about **2.3 GiB** in total. `worker` alone takes 1.3 GiB, because Celery starts one process per CPU (19 processes on 18 CPUs). On a 2 to 4 core server it is a few hundred MiB, which puts the total near 1.2 to 1.5 GiB. The other services: api 173 MiB, mq 172, beat-worker 149, live 145, space 110, minio 111, db 72, proxy 31, web 13, redis 11, admin 6.
- **Disk:** about **4.6 GB** of images (plane-live 1.64 GB and plane-space 1.43 GB are the largest; layers are partly shared), plus about 80 MB of volumes on a fresh bootstrap, almost all of it Postgres.
- **CPU:** under 1 % per container when idle.
- **Self-hosted runner:** the GitHub Actions runner v2.338.0 takes 439 MB on disk once unpacked and about 110 MiB of RAM idle (`Runner.Listener`), and runs one job at a time. It polls GitHub over outbound HTTPS and reaches Plane over localhost or the private network, so Plane is never exposed to the internet.

Plane CE also needs a host with Docker Compose v2, and the upstream compose pulls images from Docker Hub. The upstream v1.4.2 compose references `minio/minio:latest`, which no longer pulls (the Docker Hub org is gone). The rig uses `pgsty/silo`, the same switch upstream made after 1.4.2 (makeplane/plane#9962). Production installs on 1.4.2 need the same fix.
