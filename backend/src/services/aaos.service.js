// SPDX-License-Identifier: MIT
//
// AAOS Bridge Service
// -------------------
//
// Full request/response flow:
//
//   Plugin
//     → POST /v2/aaos/request
//     → Rust service (http://127.0.0.1:8080/config)  [forwarded by this service]
//     → POST /v2/aaos/response                        [called by Rust service]
//     → WebSocket broadcast  (ws://localhost:3201/aaos-ws)
//     → Plugin update
//
// REST fallback (for plugins that cannot use WebSocket):
//   Plugin → GET /v2/aaos/latest → returns last stored response

const axios = require('axios');
const WebSocket = require('ws');
const logger = require('../config/logger');

// ─── Configuration ─────────────────────────────────────────────────────────────
const RUST_SERVICE_URL = 'http://127.0.0.1:8080/config';

// ─── In-memory store ───────────────────────────────────────────────────────────
// Replaced on every new request/response. Resets on server restart.
let _latestResponse = null;

// ─── WebSocket client registry ─────────────────────────────────────────────────
// Populated once initWebSocket() is called from index.js after the HTTP server starts.
const _clients = new Set();
let _wss = null;

/**
 * Attach a WebSocket.Server to the existing Express HTTP server.
 * Called once from backend/src/index.js after app.listen() returns.
 *
 * Clients connect via:  ws://localhost:3201/aaos-ws
 *
 * @param {import('http').Server} httpServer - The Node.js HTTP server created by app.listen()
 */
const initWebSocket = (httpServer) => {
  _wss = new WebSocket.Server({ server: httpServer, path: '/aaos-ws' });

  _wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    _clients.add(ws);
    logger.info('[AAOS-WS] Client connected from %s — total: %d', clientIp, _clients.size);

    ws.on('close', () => {
      _clients.delete(ws);
      logger.info('[AAOS-WS] Client disconnected from %s — total: %d', clientIp, _clients.size);
    });

    ws.on('error', (err) => {
      logger.error('[AAOS-WS] Client error from %s: %s', clientIp, err.message);
      _clients.delete(ws);
    });
  });

  logger.info('[AAOS-WS] WebSocket server initialised at path /aaos-ws');
};

/**
 * Forward a plugin request payload to the Rust service at RUST_SERVICE_URL.
 * Returns the Rust service's response data.
 *
 * @param {object} payload - Any JSON payload from the frontend plugin.
 * @returns {Promise<object>} Rust service response data.
 */
const forwardToRust = async (payload) => {
  logger.info('[AAOS] Forwarding request to Rust service: %s', JSON.stringify(payload));
  const response = await axios.post(RUST_SERVICE_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  logger.info('[AAOS] Rust service responded with status %d', response.status);
  return response.data;
};

/**
 * Store a new AAOS response payload and broadcast it to all connected WebSocket clients.
 * Called by the controller handling POST /v2/aaos/response (i.e. invoked by the Rust service).
 *
 * @param {object} payload - Any JSON payload from the Rust service.
 */
const storeResponseAndBroadcast = (payload) => {
  _latestResponse = { payload, timestamp: new Date().toISOString() };
  logger.info('[AAOS] Response stored: %s', JSON.stringify(payload));

  // Broadcast to all connected WebSocket clients.
  const message = JSON.stringify({ event: 'aaos:response', data: _latestResponse });
  let sent = 0;
  _clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent++;
    }
  });
  logger.info('[AAOS-WS] Broadcasted response to %d / %d clients', sent, _clients.size);
};

/**
 * Return the latest stored AAOS response, or null if none received yet.
 * @returns {{ payload: object, timestamp: string } | null}
 */
const getLatestResponse = () => _latestResponse;

module.exports = {
  initWebSocket,
  forwardToRust,
  storeResponseAndBroadcast,
  getLatestResponse,
};
