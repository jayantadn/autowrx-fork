// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { url } from 'inspector'

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL || ''
// Only use relative URLs in dev if backend is on the same port as frontend (i.e., proxied)
// Otherwise, use the full URL to avoid cross-port issues
const isLocalDevBackend = import.meta.env.DEV && /https?:\/\/(localhost|127\.0\.0\.1)$/.test(serverBaseUrl)

const config: any = {
  instance: 'autowrx',
  serverBaseUrl: isLocalDevBackend ? '' : serverBaseUrl,
  serverVersion: import.meta.env.VITE_SERVER_VERSION || 'v2',
  logBaseUrl: '',
  // cacheBaseUrl: '',
  showPrivacyPolicy: false,
  github: {
    clientId: '',
  },
  runtime: {
    url: 'https://kit.digitalauto.tech',
  },
  // strictAuth has been replaced by granular auth configs (PUBLIC_VIEWING, SELF_REGISTRATION, etc.)
  // See useAuthConfigs hook for the new implementation
}

export default config
