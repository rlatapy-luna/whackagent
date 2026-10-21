# Plane rig

A local Plane Community Edition for whackagent maintainers, started on demand, plus the private playground repository whose Actions jobs run on a self-hosted runner on your Mac. This is maintainer tooling, not shipped behavior. The Plane API facts it was used to check are in `providers/plane/README.md`.

Requirements: Docker Desktop (Compose v2), Python 3, and `gh` logged in as `rlatapy-luna` for the runner and playground commands.

## Files

| File | Role |
|---|---|
| `rig` | the single entry script (Python 3 stdlib) |
| `docker-compose.yml` | upstream Plane CE v1.4.2 compose, vendored; local changes listed in its header |
| `plane.env` | non-secret settings, committed: pinned release `APP_RELEASE=v1.4.2`, port, rate limit |
| `.env.local` | **gitignored**, mode 600: generated Django and live-server secrets, admin password, and the bootstrap results (API key, project id) |
| `factcheck` | replays the API fact checks in a throwaway project `FC` |
| `plane-ping.yml` | smoke-test workflow for the playground repository |
| `payloads/` | recorded GitHub event payloads, replayed with `wa-backlog hook --event <name> --payload <file>` |

## Plane

```sh
scripts/plane-rig/rig up            # start (first run generates secrets, pulls about 4.6 GB of images)
scripts/plane-rig/rig bootstrap     # idempotent: admin, workspace, project, states, estimate, API key
scripts/plane-rig/rig status        # containers, version, bootstrap check, runner state
scripts/plane-rig/rig down          # stop, keep data
scripts/plane-rig/rig reset --yes   # stop and wipe every volume (the API key dies with it)
eval "$(scripts/plane-rig/rig env)" # export PLANE_URL PLANE_WORKSPACE PLANE_PROJECT_ID PLANE_API_KEY
```

- Plane listens on **http://localhost:8390**, bound to 127.0.0.1 only. The admin console is at `/god-mode/`. To change the port, edit `LISTEN_HTTP_PORT`, `WEB_URL` and `CORS_ALLOWED_ORIGINS` in `plane.env`.
- Sign in as `admin@whackagent.local`, with the password from `PLANE_ADMIN_PASSWORD` in `.env.local`.
- Bootstrap creates or repairs the following. A second run prints `nothing to do`.
  - The instance admin (setup marked done, telemetry off).
  - The workspace `whackagent`.
  - The project `WA`, with cycles and modules switched on.
  - The seven states in board order: Todo (unstarted, default), Grilling, Grilled, Coding and Review (started), Done (completed), Canceled (cancelled). Plane's seed states Backlog and In Progress are deleted, and Cancelled is renamed.
  - The `Size` estimate (Categories) with points `quickwin`, `medium`, `large`, turned on for the project.
  - An API key labelled `whackagent-rig`.
- The public API covers the project, its features and the states. The rest goes through `python manage.py shell` in the `api` container: the admin user, the workspace and the API key, because the API cannot create them, and the estimate, because 1.4.2 does not mount `/api/v1` estimates. Details are in `providers/plane/README.md`.
- The key never leaves `.env.local`, apart from the playground secret below. Never commit it. After `reset`, bootstrap makes a new key: run `rig playground` again.
- The Plane rate limit is lifted to `1000000/second` (`API_KEY_RATE_LIMIT` in `plane.env`), the setting the provider requires; the upstream default is 60 requests per minute per key. `factcheck` waits out a limit around its 100-request probe (`--skip-rate` skips the probe).
- To upgrade Plane, fetch `deployments/cli/community/docker-compose.yml` at the new tag, reapply the changes listed in the compose header, bump `APP_RELEASE`, then run `rig up`, `rig bootstrap` and `factcheck`, and update the provider README.

## Playground repository and runner

The playground is `rlatapy-luna/whackagent-playground-plane` (private). Never use `rlatapy-luna/whackagent-playground`: it now redirects to a real team repository. Every `rig` command that writes to GitHub first checks `gh api repos/rlatapy-luna/whackagent-playground-plane --jq .full_name` and refuses on any other answer. Do the same check by hand before any other live write.

```sh
scripts/plane-rig/rig playground        # secret WA_PLANE_API_KEY + variables WA_PLANE_URL WA_PLANE_WORKSPACE WA_PLANE_PROJECT_ID
scripts/plane-rig/rig runner register   # once: download runner, register it with label whackagent-plane
scripts/plane-rig/rig runner start      # background ./run.sh, log in ~/actions-runner-whackagent/rig-run.log
scripts/plane-rig/rig runner stop
scripts/plane-rig/rig runner status
```

- The runner lives in `~/actions-runner-whackagent`. It is named `<hostname>-whackagent` and carries the labels `self-hosted` and **`whackagent-plane`**. Jobs target it with `runs-on: [self-hosted, whackagent-plane]`.
- `register` fetches a one-hour registration token with `gh api -X POST repos/rlatapy-luna/whackagent-playground-plane/actions/runners/registration-token` and passes it to `./config.sh --unattended`. The token is never stored. Rerunning `register` on a registered runner does nothing. To re-register, run `./config.sh remove --token <new token>` in the runner folder first.
- The runner is **not** installed as a service. Start it only while testing and stop it afterwards. Queued jobs wait (up to 24 hours) until a runner with the label comes online.
- The job runs on the host, so it reaches Plane at `http://localhost:8390`. Plane is never exposed beyond localhost.
- Smoke test: `plane-ping.yml` is installed in the playground as `.github/workflows/plane-ping.yml`. With the runner started, `gh workflow run plane-ping -R rlatapy-luna/whackagent-playground-plane`, then `gh run watch`. The job reads project `WA` and its states through the API key secret.

## Hooks on the playground

The whackagent remote is not pushed while a hook change is under test, so the playground cannot call `rlatapy-luna/whackagent/.github/workflows/board-plane.yml@<ref>` with new code. Instead, its `main` holds:

- `.github/workflows/board-plane.yml`, a copy of the reusable workflow;
- `.github/workflows/whackagent-board-plane.yml`, the caller template with `uses: ./.github/workflows/board-plane.yml`;
- `.github/board/wa-backlog`, the script under test (the workflow runs it from the default branch);
- `.whackagent/config.md` with `backlog.provider: plane`.

The repository variable `WA_RUNNER_LABEL=whackagent-plane` sends the job to the rig runner. Copy the three files again after each change. A ticket branch must fork from a `main` that already holds the caller: GitHub runs push workflows from the pushed commit's tree.

- **Replay, no runner.** From a playground clone holding `.whackagent/config.md`, with `eval "$(scripts/plane-rig/rig env)"`: make a throwaway card, claim it, push a task file on `wa/<id>-<slug>`, set `ref` and `after` in a copy of `payloads/push-task-file.json`, then run `wa-backlog hook --event push --payload <copy>`. `push-task-file-empty-criteria.json` and `push-other-branch.json` are the no-op cases.
- **End to end.** `rig runner start`, push a spec on a ticket branch, watch `gh run list --workflow whackagent-board-plane.yml -R rlatapy-luna/whackagent-playground-plane`, check the card with `wa-backlog get`, then `rig runner stop`. With the runner stopped, a push leaves its run `queued`; it runs once the runner starts again.
- Cancel the throwaway cards (`wa-backlog cancel <id>`) and delete their branches afterwards.
