// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { url } from 'inspector'

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL || ''
// Development: Use relative URLs if backend is on localhost (same server)
// Production: Use the provided serverBaseUrl, or default to root for same-origin requests
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(serverBaseUrl)
const shouldUseRelativeUrls = import.meta.env.DEV && isLocalhost

const config: any = {
  instance: 'autowrx',
  serverBaseUrl: shouldUseRelativeUrls ? '' : serverBaseUrl,
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
