# BGSW Runtime Namespace Isolation

This document explains the **frontend namespace boundary** that this BGSW instance applies on top of upstream AutoWRX. Read this first if you are:

- A user of BGSW instance who needs to spin up a private runtime and have it appear in the prototype runtime selector.


---

## TL;DR

- BGSW users only see runtimes whose **runtime ID** (the `RUNTIME_PREFIX + RUNTIME_NAME` set when the runtime container is launched) starts with `bgsw-runtime-`.
- To make a runtime appear, run an `eclipse-autowrx/sdv-runtime` Docker container with `RUNTIME_PREFIX="bgsw-runtime-"` (the trailing dash matters — see [Common pitfalls](#common-pitfalls)).
- This is a **UI-level** boundary, not a network boundary. See [Future hardening](#future-hardening) for the path to a hard boundary.

---

## Why this exists

Both the public `digital.auto` playground and this BGSW playground connect, by default, to the **same** central Socket.IO broker at `https://kit.digitalauto.tech`. That broker indiscriminately broadcasts every connected runtime — including public ones (`runtime-public-*`, `runtime-shared-*`) — to any client that subscribes.

Because we cannot change the upstream broker, the simplest robust mitigation is to filter on the client side:

- BGSW users only see runtimes whose **runtime ID** starts with `bgsw-runtime-`.
- The asset editor only lets them register names inside that namespace.

This means that even if a user of BGSW instance is connected to the same broker as the public playground, the public-playground runtimes are invisible and unselectable inside the BGSW UI.

> **Important caveat**: this is a **UI-level** boundary, not a **network** boundary. Anyone with broker access can still see all runtimes by inspecting WebSocket frames in DevTools. For a hard boundary, host your own broker — see [Future hardening](#future-hardening).

---

## How it works

The boundary is implemented in three layers, all backed by a single source of truth.

### 1. Single source of truth — `frontend/src/const/runtime.ts`

This file (new in this fork) centralizes the constants and helper functions:

```ts
export const BGSW_RUNTIME_PREFIX = 'bgsw-runtime-'

export const PUBLIC_RUNTIME_PREFIXES: readonly string[] = [
  'runtime-public-',
  'runtime-shared-',
]

export const isPublicRuntime = (kitId: string | undefined | null): boolean => { ... }
export const isBgswRuntime  = (kitId: string | undefined | null): boolean => { ... }
```

Every other place in the frontend imports from here, so changing the namespace is a one-line edit.

### 2. Filter at ingest — `frontend/src/components/molecules/DaRuntimeConnector.tsx`

This component holds the live socket connection to the runtime broker (`kit.digitalauto.tech`). On every list-all-runtimes event:

- It first hard-blocks any runtime whose ID matches a `PUBLIC_RUNTIME_PREFIXES` entry, **regardless** of the caller-supplied `targetPrefix` prop. This is a defense-in-depth measure: even a future caller that forgets to set `targetPrefix` can never accidentally surface public runtimes.
- It then applies the caller's `targetPrefix` (default: `BGSW_RUNTIME_PREFIX`) to retain only matching runtimes.

The non-deploy `useEffect` that builds the dropdown list now displays **every** surviving (BGSW-namespaced) runtime; the previous public-runtime padding logic was removed, since padding with public runtimes would defeat the namespace.

### 3. Default prefix at the call site — `frontend/src/components/molecules/dashboard/DaRuntimeControl.tsx`

Both `<DaRuntimeConnector>` mount points (the custom-broker branch and the default branch) pass `targetPrefix={BGSW_RUNTIME_PREFIX}` instead of the upstream literal `"runtime-"`.

### 4. Asset-creation guardrail — `frontend/src/components/organisms/RuntimeAssetManager.tsx`

The "Add new asset" form:

- Pre-fills the input with `bgsw-runtime-`.
- Validates that the trimmed name (a) starts with `bgsw-runtime-` and (b) has at least one suffix character.
- Disables the **Add** button on invalid input and shows a red helper message explaining the expected pattern (e.g. `bgsw-runtime-dev-1`).
- Resets the input back to `bgsw-runtime-` after a successful create.

This keeps the asset list in sync with what the namespace filter is willing to show.

---

## Spinning up a BGSW runtime

A BGSW runtime is just a standard `eclipse-autowrx/sdv-runtime` Docker container started with a `RUNTIME_PREFIX` matching the namespace.

```bash
docker run -d \
  -e RUNTIME_PREFIX="bgsw-runtime-" \
  -e RUNTIME_NAME="MyRuntime" \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

By default the container connects to `https://kit.digitalauto.tech`. To use a different broker, also pass `-e SYNCER_SERVER_URL="https://your-broker"`.

To forward the Kuksa data broker port out of the container (so `kuksa-client` can reach it from your host):

```bash
docker run -d \
  -e RUNTIME_PREFIX="bgsw-runtime-" \
  -e RUNTIME_NAME="MyRuntime" \
  -p 55555:55555 \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

### Verifying it appears

1. **Container is alive**: `docker ps` — `docker run -d` returns a container ID even if the container crashes seconds later, so always verify it's actually running.
2. **Registration log line**: `docker logs <id> --tail 50` — look for a line containing your **runtime ID**, e.g. `bgsw-runtime-MyRuntime`.
3. **Broker has it**: in the browser, open **DevTools → Network → WS**, click the `kit.digitalauto.tech` socket, and search the message frames for `bgsw-runtime-MyRuntime`. If the broker is broadcasting it, the dropdown will list it after a refresh.

---

## Common pitfalls

### The trailing dash in `RUNTIME_PREFIX`

The image concatenates `RUNTIME_PREFIX + RUNTIME_NAME` literally — there is no separator inserted between them. So:

| `RUNTIME_PREFIX` | `RUNTIME_NAME` | Resulting runtime ID       | Visible in BGSW UI? |
|---|---|---|---|
| `bgsw-runtime-`  | `MyRuntime`    | `bgsw-runtime-MyRuntime`   | yes |
| `bgsw-runtime`   | `MyRuntime`    | `bgsw-runtimeMyRuntime`    | no — filtered out |
| *(unset, defaults to `Runtime-`)* | `MyRuntime` | `Runtime-MyRuntime` | no — wrong namespace |

If the dropdown stays empty after starting your container, the missing trailing dash is by far the most common cause.

### "Asset record" is not the same as "runtime is online"

Adding an asset via the **Add new asset** form only registers the name in the BGSW backend's MongoDB. It does **not** spin up a runtime container. The dropdown only lists runtimes that are actually connected to the broker.

In other words: the asset record is metadata, the running container is what populates the UI. You can register an asset for a name that doesn't exist yet, and you can have a runtime appear in the UI without ever registering an asset (as long as its runtime ID starts with `bgsw-runtime-`).

### Stale local-storage `last-rt`

If a previously selected runtime had a non-BGSW runtime ID, the connector may still try to auto-select it from `localStorage`. Clearing the `last-rt` key in DevTools fixes this on the rare occasion it matters.

---

## Files modified vs. upstream

| File | Status | Purpose |
|---|---|---|
| `backend/.env` | modified | `PORT=3201` and `MONGODB_URL=mongodb://localhost:27017/autowrx` to match the Vite dev proxy and a standard local Mongo install. |
| `frontend/.env` | modified | `VITE_SERVER_BASE_URL=http://localhost:3201` to match the backend port. |
| `frontend/src/const/runtime.ts` | **new** | Single source of truth for the namespace constants and helpers. |
| `frontend/src/components/molecules/DaRuntimeConnector.tsx` | modified | Hard-blocks public/shared runtimes at ingest, removes public-runtime padding. |
| `frontend/src/components/molecules/dashboard/DaRuntimeControl.tsx` | modified | Passes `BGSW_RUNTIME_PREFIX` to both `DaRuntimeConnector` mount points. |
| `frontend/src/components/organisms/RuntimeAssetManager.tsx` | modified | Enforces the `bgsw-runtime-<suffix>` shape on new asset creation. |

---

## Future hardening

The current implementation is a UI-level boundary. To make it stronger:

- **Self-host the runtime broker**. Stand up your own Socket.IO broker (e.g. as a service in `instance-setup/`) and point both the runtime container's `SYNCER_SERVER_URL` and the frontend's `RUNTIME_SERVER_URL` site-config (Admin → Site Config) at it. This converts the namespace into a real network boundary — public-playground runtimes literally cannot reach the BGSW broker.
- **Empty-state hint in the runtime dropdown**. When no `bgsw-runtime-*` runtime is online, render an inline tip with a click-to-copy `docker run` snippet. This prevents the most common new-user confusion ("I added an asset, why is the dropdown still empty?").
- **Server-side validation of asset names**. Currently the `bgsw-runtime-*` naming convention is enforced only in the frontend. Adding a Mongoose validator on the `assets` collection would prevent a custom client from registering off-namespace names.
- **End-to-end test**. A Playwright test that boots a `sdv-runtime` container with a `runtime-public-*` runtime ID and asserts the BGSW dropdown stays empty would lock the namespace contract in CI.

---

## Related reading

- [`development-guide.md`](../development-guide.md) — local setup for backend + frontend.
- [`docs/concept.md`](concept.md) — Core vs. Plugin architecture.
- [`docs/project-structure.md`](project-structure.md) — full codebase layout.
- Upstream runtime image: [`eclipse-autowrx/sdv-runtime`](https://github.com/eclipse-autowrx/sdv-runtime).

---

**Copyright (c) 2025 Eclipse Foundation. SPDX-License-Identifier: MIT.**
