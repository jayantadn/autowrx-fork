---
name: sdv-automotive-codegen
description: 'Harden AI-generated SDV (Software Defined Vehicle) Python code for automotive safety, reliability, and COVESA VSS compliance. Use when generating or reviewing vehicle app code targeting Eclipse Velocitas / SDV runtime. Triggers: SDV code generation, vehicle app, VehicleApp, VSS signal, automotive Python, sdv pilot.'
argument-hint: 'Describe the vehicle use case and any signals involved'
---

# SDV Automotive Code Hardening

## When to Use
- Generating Python code for `VehicleApp` (Eclipse Velocitas / SDV runtime)
- Reviewing or improving generated vehicle application code
- Ensuring automotive-grade safety, error handling, and signal discipline

---

## Procedure

1. **Read the use case** — Identify which vehicle functions and signals are involved
2. **Search the COVESA VSS catalog** — BEFORE writing any code, look up every signal the use case requires using the steps in the [COVESA Signal Lookup](#covesa-signal-lookup) section below. Record the exact canonical dot-notation paths. **If a signal cannot be confirmed in the catalog, do NOT use it — stop and tell the user the signal was not found.**
3. **Apply the checklist below** — Every rule must be satisfied before emitting code
4. **Emit hardened code** — Use only catalog-confirmed signal paths; include all mandatory patterns; omit any unsafe constructs
5. **Self-review** — Walk through the checklist once more against the generated code before returning it

---

## COVESA Signal Lookup

Every signal path used in generated code **must** be verified against the official COVESA VSS catalog before code is written. Do not guess or invent signal paths.

### Step-by-step lookup

> **Critical:** vspec files use `#include` directives to pull in sub-branch files. Fetching a top-level branch file (e.g. `Body.vspec`) will only show `#include` lines — **not** the actual signals. You MUST follow the includes and fetch the relevant sub-branch file to find the real signal names.

1. **Fetch the top-level branch vspec** most likely to contain the signal (see table below) using `fetch_webpage`.

2. **Follow `#include` lines** — If the returned content contains `#include "SubFolder/SubFile.vspec"` lines instead of signal definitions, construct the sub-branch URL and fetch it too. Repeat until you reach a file that contains actual signal definitions (lines starting with a signal name followed by `datatype:`, `type:`, etc.).


**Rules:**
- If a segment has no `datatype:` field → it is a branch → keep descending. Never stop at a branch.
- Always copy every node name verbatim from the vspec file — never use the user's word or a synonym as the node name.

| Anti-pattern | Example | Fix |
|---|---|---|
| Guessed node name from user prompt | `Vehicle.Body.Mirrors.Driver.Tilt.Up.get()` | Copy name verbatim from vspec: `Vehicle.Body.Mirrors.DriverSide.Tilt.Up.get()` |
| `.get()` on a branch node | `Vehicle.Body.Mirrors.DriverSide.Tilt.get()` | Descend to a leaf: `Vehicle.Body.Mirrors.DriverSide.Tilt.Up.get()` |

### Worked example — HVAC / Cabin temperature lookup

**Wrong (guessed path):** `Vehicle.Cabin.HVAC.Temperature` — `HVAC` is a branch; `Temperature` is not a direct child.

**Correct lookup steps:**
1. Fetch `Cabin.vspec` → see `#include "HVAC/HVAC.vspec"`
2. Fetch `Cabin/HVAC/HVAC.vspec` → find branch `Station`, which contains branch `Row1`, which contains branch `Left`
3. Synonym: user says "driver seat" → search synonyms `Left`, `Row1Left`, `DriverSide` → vspec uses `Left` → copy verbatim
4. Inside `Left` find leaf `Temperature` with `datatype: float`, `type: actuator` ✓
5. Full confirmed path: **`Vehicle.Cabin.HVAC.Station.Row1.Left.Temperature`** (actuator — writable)

### Worked example — Vehicle speed lookup

**Wrong (guessed path):** `Vehicle.OBD.Speed` — OBD branch contains an OBD-specific duplicate; the canonical signal is on `Vehicle`.

**Correct lookup steps:**
1. Fetch `Vehicle.vspec` → search for `Speed` → find leaf `Speed` with `datatype: float`, `type: sensor` ✓ directly under `Vehicle`
2. Full confirmed path: **`Vehicle.Speed`** (sensor — read-only, do NOT write)

### Worked example — EV battery / state of charge lookup

**Wrong (guessed):** `Vehicle.Powertrain.Battery.StateOfCharge` — `Battery` is not the correct branch name.

**Correct lookup steps:**
1. Fetch `Powertrain.vspec` → see `#include "TractionBattery/TractionBattery.vspec"`
2. Fetch `Powertrain/TractionBattery/TractionBattery.vspec` → find `StateOfCharge` branch → descend to leaf `Current` with `datatype: float`, `type: sensor` ✓
3. Full confirmed path: **`Vehicle.Powertrain.TractionBattery.StateOfCharge.Current`** (sensor — read-only)

### Worked example — Cruise control lookup

**Wrong (guessed):** `Vehicle.ADAS.CruiseControl.IsActive` — `IsActive` is a sensor (read-only); speed target is a separate actuator.

**Correct lookup steps:**
1. Fetch `ADAS.vspec` → see `#include "CruiseControl/CruiseControl.vspec"`
2. Fetch `ADAS/CruiseControl/CruiseControl.vspec` → find:
   - `IsActive` — `datatype: boolean`, `type: sensor` ✓ (read-only — do NOT write)
   - `SpeedSet` — `datatype: float`, `type: actuator` ✓ (writable)
3. Confirmed paths: **`Vehicle.ADAS.CruiseControl.IsActive`** (read) and **`Vehicle.ADAS.CruiseControl.SpeedSet`** (write)

### Worked example — Door lock lookup

**Wrong (guessed):** `Vehicle.Cabin.Door.Front.Left.IsLocked` — node names differ from natural language.

**Correct lookup steps:**
1. Fetch `Cabin.vspec` → see `#include "Door/Door.vspec"`
2. Fetch `Cabin/Door/Door.vspec` → find branch `Row1`, contains branch `Left`, contains leaf `IsLocked` with `datatype: boolean`, `type: actuator` ✓
3. Synonym: user says "front left door" → `Row1` = front row, `Left` = left side — copy verbatim from vspec
4. Full confirmed path: **`Vehicle.Cabin.Door.Row1.Left.IsLocked`** (actuator — writable)

---

## Hardening Checklist

### Signal Discipline
- [ ] **Catalog lookup performed** — every signal path was verified in the COVESA VSS vspec files before code was written
- [ ] Use ONLY signals confirmed in the COVESA VSS catalog — never invent or guess signal paths
- [ ] Always `await` signal reads/writes; never call them synchronously
- [ ] Validate signal values before acting on them (range checks, null checks)
- [ ] Do not read a signal more frequently than every 500 ms unless the use case explicitly requires it

### Error Handling & Resilience
- [ ] Wrap every signal read/write in `try/except` — log the exception, do not crash the app
- [ ] On consecutive failures (≥3), log a warning and back off for at least 5 seconds before retrying
- [ ] Never propagate raw exceptions to the vehicle bus — handle locally
- [ ] Use `asyncio.sleep` for all waits; never use `time.sleep` (blocks the event loop)

### Safety Constraints
- [ ] Safety-critical actuations (brakes, steering, powertrain) must check a precondition signal before writing
- [ ] Never write to a read-only VSS signal (e.g. `IsActive`, `PedalPosition`, `StateOfCharge` are sensor outputs — do not write them)
- [ ] Include a watchdog / timeout: if a loop iteration takes > 2 seconds, log a warning
- [ ] Do not rely on signal state persisting between iterations — always read fresh values

### Code Structure
- [ ] Class inherits from `VehicleApp`; `super().__init__()` called in `__init__`
- [ ] All vehicle logic lives inside `on_start` or dedicated `async` methods — never at module level
- [ ] Async methods must be awaited; never fire-and-forget with `asyncio.create_task` unless explicitly tracked
- [ ] Use named constants for magic numbers (thresholds, timeouts, retry limits)
- [ ] Keep `on_start` readable: extract complex logic into private `async` helper methods

### Logging & Observability
- [ ] Import and use the Velocitas logger: `from sdv._internal.vehicle_app import logger` (or `logging.getLogger(__name__)` as fallback)
- [ ] Log at startup which signals the app will use
- [ ] Log every state transition or actuation with the signal name and value
- [ ] Do not log sensitive data (PII, raw user inputs)

### Imports & Dependencies
- [ ] Only import from `asyncio`, `sdv`, and `vehicle` — no external network calls from vehicle app code
- [ ] Do not import `os`, `subprocess`, `socket`, or any system-level module in vehicle app code
- [ ] Keep imports minimal — unused imports must be removed

---

## Required Code Skeleton

Every generated `VehicleApp` must follow this hardened skeleton:

```python
import asyncio
import logging
from sdv.vehicle_app import VehicleApp
from vehicle import Vehicle, vehicle

logger = logging.getLogger(__name__)

# --- Constants ---
POLL_INTERVAL_SEC = 2
MAX_CONSECUTIVE_ERRORS = 3
BACKOFF_SEC = 5


class MyApp(VehicleApp):
    def __init__(self, vehicle_client: Vehicle):
        super().__init__()
        self.Vehicle = vehicle_client
        self._error_count = 0

    async def on_start(self):
        logger.info("MyApp started — monitoring signals: <list signals used>")
        while True:
            await self._run_cycle()
            await asyncio.sleep(POLL_INTERVAL_SEC)

    async def _run_cycle(self):
        try:
            # --- Read signals ---
            value = (await self.Vehicle.SomeSignal.get()).value

            # --- Validate ---
            if value is None:
                logger.warning("SomeSignal returned None — skipping cycle")
                self._error_count += 1
            else:
                self._error_count = 0
                # --- Act ---
                await self._handle_value(value)

        except Exception as e:
            self._error_count += 1
            logger.error("Error in run cycle: %s", e)
            if self._error_count >= MAX_CONSECUTIVE_ERRORS:
                logger.warning("Too many consecutive errors — backing off %ss", BACKOFF_SEC)
                await asyncio.sleep(BACKOFF_SEC)
                self._error_count = 0

    async def _handle_value(self, value):
        logger.info("Signal value: %s", value)
        # Implement actuation logic here


async def main():
    app = MyApp(vehicle)
    await app.run()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Common Anti-Patterns to Reject

| Anti-pattern | Reason | Fix |
|---|---|---|
| `time.sleep(n)` | Blocks event loop | `await asyncio.sleep(n)` |
| Bare `except:` | Swallows all errors silently | `except Exception as e: logger.error(...)` |
| Writing to sensor signals | Sensors are read-only | Only write to actuator signals |
| Invented VSS paths (`Vehicle.My.Custom`) | Not routable on vehicle bus | Search the COVESA VSS catalog first; use only confirmed paths |
| `.get()`/`.set()` on a branch node (`Vehicle.Body.Mirrors.DriverSide.Tilt.get()`) | Branch nodes have no `datatype:` — call fails at runtime | Descend to a leaf signal with `datatype:` before calling `.get()`/`.set()` |
| Using user's word as node name (`Driver` instead of `DriverSide`) | Node name mismatch — path not found on vehicle bus | Copy every node name verbatim from the vspec file, never from the user prompt |
| Signal read outside try/except | Crash on transient failure | Always wrap in try/except |
| Hardcoded sleep `0` or `0.001` | Busy-loops the event loop | Minimum `POLL_INTERVAL_SEC = 2` |
| Global mutable state | Not thread/async safe | Keep state in `self` attributes |

---

## Signal Discovery from the Vehicle API

**Do not hardcode a fixed signal list.** Signals are resolved at runtime from the Vehicle API signal tree built by `computeVSSApi(modelId)`.

### How the signal tree is built (backend)
1. `computeVSSApi(modelId)` loads the versioned VSS JSON (`data/v5.1.json`, etc.) for the model
2. Any `ExtendedApi` entries registered for that model are merged into the tree (these are the mock/custom signals)
3. `parseCvi(tree)` flattens the tree into a list of `{ name, datatype, description }` signal objects
4. The flattened list is injected into the OpenAI system prompt so the AI only uses signals actually registered in the Vehicle API

### How to handle a signal NOT in the Vehicle API tree
If the requested signal does not exist in the VSS tree for the model:
1. `getUsedApis(code, availableSignals)` detects it as missing after code generation
2. Call `POST /generate-mock-api` with `{ code, modelId }` — this diffs used vs available signals and returns JSON `ExtendedApi` definitions for the missing ones
3. Register each missing signal as an `ExtendedApi` (it is merged into the tree on the next `computeVSSApi` call)
4. In generated Python code, `_safe_read` handles the runtime fallback automatically (see Mock API Fallback Pattern below)

### Rules
- [ ] Never hardcode a signal list — always derive from `computeVSSApi(modelId)` + `parseCvi`
- [ ] Use only signals returned by `parseCvi` for the model — do not invent paths
- [ ] If a signal is missing from the tree, generate an `ExtendedApi` definition and register it
- [ ] Read-only sensor signals must never be written; actuator signals may be read and written
- [ ] Always use `_safe_read` for every signal read — it handles not-found gracefully

---

## Mock API Fallback Pattern

When a signal read fails (signal not found, databroker unavailable, or value is `None`), fall back to a mock API so the app continues to function in simulation or non-connected environments.

### Rules
- [ ] Always attempt the real signal read first — mock is a fallback, not a default
- [ ] Log clearly when mock is active: `logger.warning("Using mock API for <signal>")`
- [ ] Mock constants must use a `MOCK_` prefix
- [ ] Do not write mock values back to the vehicle bus
- [ ] Guard with `IS_MOCK_ENABLED = True` (set `False` in production)
- [ ] Do not import `os` in vehicle app code — pass the flag via constructor or config constant

### Generic Signal Read with Mock Fallback (reusable for any signal)

Every signal read must use `_safe_read`. If the signal is not found or fails, the mock value is
returned automatically when `IS_MOCK_ENABLED = True`.

```python
import asyncio
import logging
from sdv.vehicle_app import VehicleApp
from vehicle import Vehicle, vehicle

logger = logging.getLogger(__name__)

# --- Constants ---
POLL_INTERVAL_SEC = 2
MAX_CONSECUTIVE_ERRORS = 3
BACKOFF_SEC = 5
IS_MOCK_ENABLED = True  # Set False in production

# --- Mock values (MOCK_ prefix required) ---
# IMPORTANT: Every key MUST be a signal path confirmed in the COVESA VSS catalog.
# Run the catalog lookup procedure before adding any entry here. Never invent paths.
MOCK_VALUES = {
    "Vehicle.Powertrain.CombustionEngine.IsRunning": True,         # catalog-confirmed sensor
    "Vehicle.Cabin.HVAC.Station.Row1.Left.Temperature": 22.0,      # catalog-confirmed sensor
    # Add further catalog-confirmed signals here as needed
}


class MyVehicleApp(VehicleApp):
    def __init__(self, vehicle_client: Vehicle):
        super().__init__()
        self.Vehicle = vehicle_client
        self._error_count = 0

    async def on_start(self):
        logger.info("MyVehicleApp started — signals: %s", list(MOCK_VALUES.keys()))
        while True:
            await self._run_cycle()
            await asyncio.sleep(POLL_INTERVAL_SEC)

    async def _run_cycle(self):
        # Replace the getter and signal name for whichever signal you need.
        value = await self._safe_read(
            self.Vehicle.Powertrain.CombustionEngine.IsRunning.get,
            "Vehicle.Powertrain.CombustionEngine.IsRunning",
        )
        if value is None:
            logger.error("Signal unavailable — skipping cycle")
            return
        logger.info("Signal value: %s", value)
        await self._handle_value(value)

    async def _safe_read(self, signal_getter, signal_name: str):
        """Read any VSS signal.
        If the read fails (signal not found, None value, or any exception),
        returns the configured mock value when IS_MOCK_ENABLED is True."""
        try:
            result = await signal_getter()
            value = result.value
            if value is None:
                raise ValueError("Signal returned None")
            self._error_count = 0
            return value
        except Exception as e:
            self._error_count += 1
            logger.error("Failed to read %s (attempt %d): %s", signal_name, self._error_count, e)
            if self._error_count >= MAX_CONSECUTIVE_ERRORS:
                logger.warning("Too many errors — backing off %ss", BACKOFF_SEC)
                await asyncio.sleep(BACKOFF_SEC)
                self._error_count = 0

            # --- Mock API fallback: triggered when signal is not found ---
            if IS_MOCK_ENABLED and signal_name in MOCK_VALUES:
                mock_val = MOCK_VALUES[signal_name]
                logger.warning(
                    "Signal not found — using mock API for %s (mock value: %s)",
                    signal_name, mock_val,
                )
                return mock_val

            return None  # Signal unavailable and mock is disabled or not defined

    async def _handle_value(self, value):
        logger.info("Handling value: %s", value)
        # Implement logic here


async def main():
    app = MyVehicleApp(vehicle)
    await app.run()


if __name__ == "__main__":
    asyncio.run(main())
```

**How to add a new signal with mock fallback:**
1. Add the signal getter call in `_run_cycle` (or a helper): `await self._safe_read(self.Vehicle.Some.Signal.get, "Vehicle.Some.Signal")`
2. Add its mock value to `MOCK_VALUES`: `"Vehicle.Some.Signal": <default_value>`
3. That's it — `_safe_read` handles the fallback automatically for every signal.

---

## Microsoft Graph API Signals — Python Pattern

Microsoft.Teams.* signals are NOT part of the COVESA VSS tree and cannot be accessed via
`self.Vehicle.Microsoft...` (raises AttributeError at runtime) or `api.get()` (no such
import exists in the Python vehicle app sandbox — `sdv._internal` does NOT exist).

Instead, store them as a plain dictionary in `self._ms` and expose `_ms_get` / `_ms_set`
helper methods. This is the ONLY correct pattern for Microsoft signals in Python.

FORBIDDEN (causes runtime crash):
  ❌ from sdv._internal.api import api          # module does not exist
  ❌ self.vehicle.Microsoft.Teams.Call.IsActive  # Vehicle has no Microsoft attribute
  ❌ await api.get('Microsoft.Teams.Call.IsActive') # api is not defined in Python

Required pattern:
```python
import asyncio
import logging
from sdv.vehicle_app import VehicleApp
from vehicle import Vehicle, vehicle

logger = logging.getLogger(__name__)

POLL_INTERVAL_SEC = 2


class TeamsApp(VehicleApp):
    def __init__(self, vehicle_client: Vehicle):
        super().__init__()
        self.Vehicle = vehicle_client
        # In-process mock store for Microsoft Graph signals.
        # Replace with real Graph SDK calls when available — no Python code change needed.
        self._ms = {
            'Microsoft.Teams.Call.IsIncoming': False,
            'Microsoft.Teams.Call.IsActive': False,
            'Microsoft.Teams.Call.IsMuted': False,
            'Microsoft.Teams.Call.IsOnHold': False,
            'Microsoft.Teams.Call.ParticipantCount': 0,
            'Microsoft.Teams.Call.TargetDevice': '',
            'Microsoft.Teams.Presence.Status': 'Available',
            'Microsoft.Teams.Presence.Activity': 'Available',
            'Microsoft.Teams.Calendar.NextMeeting.Title': '',
            'Microsoft.Teams.Calendar.NextMeeting.MinutesUntilStart': 99,
            'Microsoft.Teams.Calendar.NextMeeting.IsStartingSoon': False,
            'Microsoft.Teams.Contacts.CallerDisplayName': '',
            'Microsoft.Teams.Contacts.CallerEmail': '',
            'Microsoft.Teams.Chat.UnreadCount': 0,
            'Microsoft.Teams.Chat.LastMessagePreview': '',
            'Microsoft.Teams.Chat.LastSenderName': '',
        }

    def _ms_get(self, name: str):
        """Read a Microsoft Graph mock signal."""
        return self._ms.get(name)

    def _ms_set(self, name: str, value):
        """Write a Microsoft Graph mock signal."""
        self._ms[name] = value
        logger.debug("Microsoft signal set: %s = %s", name, value)

    async def on_start(self):
        logger.info("TeamsApp started")
        while True:
            await self._run_cycle()
            await asyncio.sleep(POLL_INTERVAL_SEC)

    async def _run_cycle(self):
        try:
            # Read VSS signal the normal way
            speed = (await self.Vehicle.Speed.get()).value or 0.0

            # Read Microsoft signals via _ms_get
            is_active = self._ms_get('Microsoft.Teams.Call.IsActive')

            # Write Microsoft signals via _ms_set
            if speed > 30 and is_active:
                self._ms_set('Microsoft.Teams.Call.IsMuted', True)
                logger.info("Auto-muted call at speed %.1f km/h", speed)

        except Exception as e:
            logger.error("Error in run cycle: %s", e)


async def main():
    app = TeamsApp(vehicle)
    await app.run()


if __name__ == "__main__":
    asyncio.run(main())
```
