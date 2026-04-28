# BGSW Runtime Guide

The BGSW Playground only shows runtimes whose name starts with `bgsw-runtime-`. Public runtimes from `playground.digital.auto` are hidden so you and your team only see your own.

## Start a runtime

Run this on any machine with Docker. Replace `my-laptop` with your own suffix:

```bash
docker run -d \
  -e RUNTIME_PREFIX="bgsw-runtime-" \
  -e RUNTIME_NAME="my-laptop" \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

The result, `bgsw-runtime-my-laptop`, will appear in the **Runtime** dropdown (under the **SDV Code** tab of any prototype) after a page refresh.

> **Trailing dash matters.** `RUNTIME_PREFIX` and `RUNTIME_NAME` are concatenated as-is. `RUNTIME_PREFIX="bgsw-runtime"` (no dash) produces `bgsw-runtimemy-laptop` and gets filtered out.

To expose the in-container Kuksa data broker on your host, add `-p 55555:55555`.

## Adding to My Assets

The **Add Runtime** button opens **My Assets**, where you can save runtime names for yourself and share them with teammates. The **Runtime Code** field must start with `bgsw-runtime-`.

> Saving an asset only **records the name** — it does not start a runtime. You still need a running Docker container with the matching `RUNTIME_NAME` for the runtime to appear in the dropdown.

## Troubleshooting "No runtime available"

- `docker ps` — confirm the container is alive (`docker run -d` returns the ID even if it crashed seconds later).
- Check the trailing dash in `RUNTIME_PREFIX`.
- Refresh the page; the dropdown only polls periodically.
- Make sure outbound HTTPS to `kit.digitalauto.tech` isn't blocked by your network.

If still stuck, send `docker logs <container_id>` to the BGSW Playground administrator.

---

**Copyright (c) 2025 Eclipse Foundation. SPDX-License-Identifier: MIT.**
