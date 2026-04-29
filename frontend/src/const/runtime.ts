// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Frontend-only namespace boundary for the BGSW playground.
//
// The shared digital.auto socket server (https://kit.digitalauto.tech) broadcasts
// every connected runtime, including public ones (runtime-public-*, runtime-shared-*).
// We can't change that server, so we enforce the boundary client-side: BGSW users
// only see runtimes whose kit_id starts with BGSW_RUNTIME_PREFIX, and the asset
// editor only lets them register names inside that prefix.
export const BGSW_RUNTIME_PREFIX = 'bgsw-runtime-'

// Prefixes published by the public/shared digital.auto playground that we
// hard-block from ever entering the BGSW UI.
export const PUBLIC_RUNTIME_PREFIXES: readonly string[] = [
  'runtime-public-',
  'runtime-shared-',
]

export const isPublicRuntime = (kitId: string | undefined | null): boolean => {
  if (!kitId) return false
  const lower = kitId.toLowerCase()
  return PUBLIC_RUNTIME_PREFIXES.some((p) => lower.startsWith(p))
}

export const isBgswRuntime = (kitId: string | undefined | null): boolean => {
  if (!kitId) return false
  return kitId.toLowerCase().startsWith(BGSW_RUNTIME_PREFIX)
}
