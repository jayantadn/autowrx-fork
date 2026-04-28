# BGSW Runtime Guide

This guide explains how runtimes work in the **BGSW Playground** and how to make sure your own runtime shows up in the **Runtime** dropdown when you run a prototype.

It's written for people who use the BGSW Playground day-to-day — not for the developers maintaining its source code.

---

## The naming rule

The BGSW Playground only shows runtimes whose name starts with `bgsw-runtime-`. Public runtimes from `playground.digital.auto` are deliberately hidden — you cannot see them or select them here.

So the rule is simple:

> Every runtime you start, and every runtime you register through **Add Runtime**, must have a name that starts with `bgsw-runtime-` followed by a unique suffix of your choice.

| Runtime name              | Shows up in the BGSW Playground? |
|---|---|
| `bgsw-runtime-my-laptop`  | yes |
| `bgsw-runtime-team-alpha` | yes |
| `bgsw-runtime-demo`       | yes |
| `Runtime-MyKit`           | no — wrong prefix |
| `runtime-public-demo`     | no — public runtime, hidden by design |

---

## Two things you do, in order

To get your runtime into the **Runtime** dropdown, you do two things:

1. **Start a runtime** (a Docker container) on a machine you control.
2. **Open a prototype** in the BGSW Playground and pick the runtime from the **Runtime** dropdown.

Optionally, you can also register the name in **My Assets** so you and your teammates can find it again later.

---

## Starting a runtime

Run the runtime container on any machine that has Docker (your laptop, a VM, or a Raspberry Pi). The container connects itself to the BGSW Playground.

```bash
docker run -d \
  -e RUNTIME_PREFIX="bgsw-runtime-" \
  -e RUNTIME_NAME="my-laptop" \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

Replace `my-laptop` with whatever suffix you want. The full runtime name will be `bgsw-runtime-my-laptop` and that's what will appear in the **Runtime** dropdown.

### The trailing dash matters

The image just glues `RUNTIME_PREFIX` and `RUNTIME_NAME` together with no separator in between. So **`RUNTIME_PREFIX` must end with a dash** — otherwise the runtime name comes out as one word and the BGSW Playground won't show it.

| `RUNTIME_PREFIX` | `RUNTIME_NAME` | Resulting runtime name     | Shows up? |
|---|---|---|---|
| `bgsw-runtime-`  | `my-laptop`    | `bgsw-runtime-my-laptop`   | yes |
| `bgsw-runtime`   | `my-laptop`    | `bgsw-runtimemy-laptop`    | no — runs together |
| *(unset)*        | `my-laptop`    | `Runtime-my-laptop`        | no — wrong prefix |

If the dropdown stays empty after starting your container, the missing dash is by far the most common cause.

### Optional: forward the Kuksa data broker port

If you also need to talk to the in-container Kuksa data broker from your host (using `kuksa-client` or similar), expose port `55555`:

```bash
docker run -d \
  -e RUNTIME_PREFIX="bgsw-runtime-" \
  -e RUNTIME_NAME="my-laptop" \
  -p 55555:55555 \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

---

## Selecting your runtime in a prototype

1. Open any prototype in the BGSW Playground.
2. Switch to the **SDV Code** tab.
3. Find the **Runtime** dropdown at the top of the right-hand panel.
4. Pick your runtime (e.g. `bgsw-runtime-my-laptop`).
5. Press **Run** to execute the prototype on that runtime.

If you don't see your runtime, refresh the page first (the dropdown only refreshes itself periodically), then jump to [Troubleshooting](#troubleshooting-no-runtime-available).

---

## Registering a runtime name in **My Assets**

Next to the **Runtime** dropdown you'll see an **Add Runtime** button. Clicking it opens the **My Assets** dialog, which lets you save runtime names so you (and the people you share with) can find them later.

In the **Add new asset** section:

- The **Runtime Code** field is pre-filled with `bgsw-runtime-`.
- The **Add** button stays disabled until you type a suffix after the prefix (for example, `bgsw-runtime-my-laptop`).
- Once the name follows the rule, click **Add** and it appears in the asset list below.

From the asset list you can:

- **Share** an asset with another user (share icon).
- **Delete** an asset (trash icon).

> **Important:** Adding an asset only **saves the name**. It does **not** start a runtime. You still need to run the Docker container from the previous section using the same `RUNTIME_NAME` for the runtime to actually appear in the **Runtime** dropdown.

You can also use the **Runtime** dropdown without ever opening **My Assets** — any runtime whose name starts with `bgsw-runtime-` and is currently online will show up automatically.

---

## Troubleshooting: "No runtime available"

If the **Runtime** dropdown stays empty after starting your container:

1. **Is the container actually running?**
   On the machine where you ran `docker run`:
   ```bash
   docker ps
   docker logs <container_id> --tail 50
   ```
   `docker run -d` returns a container ID even if the container crashed seconds later — make sure it's still listed in `docker ps` and the logs don't show errors.

2. **Did you include the trailing dash in `RUNTIME_PREFIX`?**
   Re-check: it must be `RUNTIME_PREFIX="bgsw-runtime-"` (with the dash). If not, stop the container and start a fresh one with the corrected value.

3. **Does the runtime name actually start with `bgsw-runtime-`?**
   Look in the container logs for the line confirming the runtime's name. It must read `bgsw-runtime-<your-suffix>`. Anything else (for example `Runtime-…`, which is what you get if you forget to set `RUNTIME_PREFIX`) will be hidden.

4. **Refresh the page.**
   The **Runtime** dropdown only refreshes periodically — a fresh page load is the fastest way to pick up a newly started runtime.

5. **Network restrictions?**
   The runtime container needs outbound HTTPS access to `kit.digitalauto.tech` to register itself. If your corporate network or firewall blocks that, the container will run locally but never appear in the BGSW Playground.

If none of the above helps, contact the BGSW Playground administrator with the output of `docker logs <container_id>`.

---

## Choosing a good runtime name

The part after `bgsw-runtime-` is up to you. Pick something that helps you and your teammates recognize the runtime quickly. Suggested patterns:

- **Per developer:** `bgsw-runtime-<your-shortname>` (e.g. `bgsw-runtime-tyj2kor`).
- **Per machine:** `bgsw-runtime-<machine-name>` (e.g. `bgsw-runtime-laptop-01`).
- **Per project or demo:** `bgsw-runtime-<project>-<env>` (e.g. `bgsw-runtime-xuv700-dev`).

Avoid generic suffixes like `bgsw-runtime-test` — if two people run that name at the same time, only one runtime will be visible at any moment.

---

## Why the BGSW Playground filters runtimes

By default, the public `playground.digital.auto` runtime registry shows every runtime running anywhere in the world to every connected user. The BGSW Playground filters that list down to runtimes whose name starts with `bgsw-runtime-`, so you and your team only see — and only run prototypes against — runtimes that you started yourselves.

This is a display-level filter. If you have stricter requirements — for example, runtimes that should never reach the public registry at all — please contact the BGSW Playground administrator about a fully private setup.

---

## Need help?

- Container running but not appearing → see [Troubleshooting](#troubleshooting-no-runtime-available).
- Naming question → see [The naming rule](#the-naming-rule).
- Anything else → reach out to the BGSW Playground administrator.

---

**Copyright (c) 2025 Eclipse Foundation. SPDX-License-Identifier: MIT.**
