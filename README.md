# AutoWRX — BGSW Instance

AutoWRX is a cloud-based, rapid prototyping environment for software-defined vehicle (SDV) applications. It provides a platform for building and testing new SDV-enabled features against real-world vehicle APIs, with seamless migration to automotive runtimes like Eclipse Velocitas.

> **BGSW extension from upstream**: This fork enforces a private runtime namespace (`bgsw-runtime-*`) on the frontend so that runtimes from the public `digital.auto` playground are not visible inside this instance. See the [BGSW Runtime Isolation Guide](docs/runtime-isolation.md) for the full context, the modified files, and the exact `docker run` command to spin up a private runtime.

## Overview

AutoWRX is part of the [digital.auto](https://digital.auto) ecosystem and serves as a playground for virtual exploration of connected vehicle applications. The platform enables developers to:

- **Browse and explore** vehicle API catalogs
- **Build and test** connected vehicle app prototypes in the browser using Python, C++, or Rust
- **Visualize** real-time signal data from vehicle runtimes
- **Connect** to KUKSA Data Broker and other automotive services
- **Showcase** customer journeys and feature demos
- **Migrate** prototypes to production automotive runtimes

## Architecture

AutoWRX follows a **Core vs. Plugin** philosophy:

- **The Core**: Provides essential, universal functionality (authentication, basic page rendering) as a stable foundation
- **Plugins**: Most features are designed as optional plugins, keeping the base platform lean and allowing for flexibility and customization

The platform uses a dynamic component architecture that enables plugin-provided UI components to be seamlessly rendered within the core application, making the entire UI configuration-driven.

## BGSW Runtime Namespace Isolation

This BGSW instance ships with a frontend namespace boundary that hides runtimes belonging to the public `digital.auto` playground and only surfaces runtimes that belong to BGSW (`bgsw-runtime-*`). To make a runtime appear, run an `eclipse-autowrx/sdv-runtime` container with `RUNTIME_PREFIX="bgsw-runtime-"` (the trailing dash matters).

For the full rationale, the list of modified files, the exact `docker run` command, verification steps, common pitfalls, and the future-hardening roadmap, see the dedicated guide:

**→ [docs/runtime-isolation.md](docs/runtime-isolation.md)**

## Project Structure

This is a monorepo containing:

- **`backend/`** - Node.js/Express API server with MongoDB
  - RESTful API for authentication, models, prototypes, APIs, and more
  - Plugin management and dynamic component support
  - See [backend/README.md](backend/README.md) for details

- **`frontend/`** - React/Vite application
  - Dashboard interface for vehicle signal visualization
  - Prototype execution and debugging
  - Plugin-based UI architecture
  - See [frontend/README.md](frontend/README.md) for details

- **`docs/`** - Comprehensive documentation
  - Development guides
  - Plugin development documentation
  - Architecture and design principles
  - Deployment guides

- **`instance-setup/`** - Production deployment configuration
  - Docker Compose setup for production
  - Environment configuration examples

## Getting Started

### For Developers

If you want to set up AutoWRX for local development, see the **[Development Guide](development-guide.md)** for step-by-step instructions.

Quick overview:
1. Set up MongoDB (Docker or remote)
2. Configure backend and frontend environment variables (this BGSW instance uses **backend port `3201`** to match the Vite dev proxy in `frontend/vite.config.ts`)
3. Install dependencies and start both services (`yarn dev` in `backend/`, `yarn dev` in `frontend/`)
4. Access the application at `http://localhost:3210` (the Vite dev server, configured via `frontend/package.json`)

### For Deployment

If you want to deploy AutoWRX to production, see the **[Instance Setup Guide](instance-setup/)** for deployment instructions.

## Features

- **Vehicle API Catalogue**: Browse, explore, and enhance connected vehicle interfaces
- **Prototyping**: Build and test SDV applications using Python and Vehicle API
- **Real-time Visualization**: Monitor vehicle signal data in real-time
- **Plugin System**: Extensible architecture with dynamic plugin loading
- **User Feedback**: Collect and evaluate feedback to prioritize development
- **Containerized Execution**: Run prototype code in isolated environments

## Documentation

- **[BGSW Runtime Isolation Guide](docs/runtime-isolation.md)** - BGSW-only: how private runtimes are isolated from the public playground
- **[Development Guide](development-guide.md)** - Local development setup
- **[Plugin Development](docs/plugin/README.md)** - Creating and developing plugins
- **[Project Structure](docs/project-structure.md)** - Codebase organization
- **[Architecture Concepts](docs/concept.md)** - Core vs. Plugin philosophy
- **[Deployment Guide](docs/deployment/README.md)** - Production deployment

## Technology Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Database**: MongoDB
- **Containerization**: Docker, Docker Compose

## Contributing

This project is part of the open-source [digital.auto](https://digital.auto) initiative. Contributions are welcome!

Please review the documentation in the `docs/` directory and follow the project's coding standards and guidelines.

## License

**License: [MIT](LICENSE)**

Copyright (c) 2025 Eclipse Foundation.

This program and the accompanying materials are made available under the terms of the MIT License which is available at https://opensource.org/licenses/MIT.

SPDX-License-Identifier: MIT

## Links

- [digital.auto](https://digital.auto) - Main project website
- [Documentation](https://docs.digital.auto) - Official documentation
- [Eclipse Velocitas](https://eclipse.dev/velocitas) - Automotive runtime platform

---

**Note**: For development setup, see [development-guide.md](development-guide.md). For production deployment, see [instance-setup/](instance-setup/).
