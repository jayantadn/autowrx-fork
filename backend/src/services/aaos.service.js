// SPDX-License-Identifier: MIT
//
// AAOS Bridge Service
// -------------------
// In-memory store and broadcast logic for the Android Automotive OS (AAOS) bridge.
//
// Architecture:
//   Frontend plugin  --POST /v2/aaos/request-->  aaos.service (stores request)
//   AAOS runtime     --POST /v2/aaos/response--> aaos.service (stores + broadcasts via socket.io)
//   Frontend plugin  --GET  /v2/aaos/latest  -->  returns last stored response
//   Frontend plugin  <--socket.io event "aaos:response"-- aaos.service (real-time updates)
//
// How frontend plugins use this module (JavaScript example):
//
//   // 1. Send an AAOS request (REST):
//   await fetch('http://localhost:3201/v2/aaos/request', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'getVehicleSpeed' }),
//   });
//
//   // 2. Poll for the latest response (REST):
//   const res = await fetch('http://localhost:3201/v2/aaos/latest');
//   const data = await res.json();
//
//   // 3. Subscribe to real-time responses via socket.io:
//   import { io } from 'socket.io-client';
//   const socket = io('http://localhost:3201');
//   socket.on('aaos:response', (payload) => {
//     console.log('AAOS response received:', payload);
//   });
//
// NOTE: The socket.io server requires a valid JWT access_token as a query parameter.
// For unauthenticated plugin contexts use the REST polling approach (option 2) instead.

const logger = require('../config/logger');
const { getIO } = require('../config/socket');

// In-memory store — replaced on every new request/response.
// These are module-level singletons; they reset on server restart.
let _latestRequest = null;
let _latestResponse = null;

/**
 * Store a new AAOS request payload.
 * @param {object} payload - Any JSON-serialisable object from the frontend plugin.
 */
const storeRequest = (payload) => {
  _latestRequest = { payload, timestamp: new Date().toISOString() };
  logger.info('[AAOS] Request stored: %s', JSON.stringify(payload));
};

/**
 * Store a new AAOS response payload and broadcast it to all connected socket.io clients.
 * @param {object} payload - Any JSON-serialisable object from the AAOS runtime.
 */
const storeResponseAndBroadcast = (payload) => {
  _latestResponse = { payload, timestamp: new Date().toISOString() };
  logger.info('[AAOS] Response stored: %s', JSON.stringify(payload));

  // Broadcast to all connected socket.io clients via the existing socket server.
  // Frontend plugins listening on the "aaos:response" event will receive this.
  const io = getIO();
  if (io) {
    io.emit('aaos:response', _latestResponse);
    logger.info('[AAOS] Broadcasted response to all socket.io clients');
  } else {
    logger.warn('[AAOS] socket.io not initialised yet — response not broadcasted');
  }
};

/**
 * Return the latest stored AAOS response, or null if none received yet.
 * @returns {{ payload: object, timestamp: string } | null}
 */
const getLatestResponse = () => _latestResponse;

/**
 * Return the latest stored AAOS request, or null if none received yet.
 * @returns {{ payload: object, timestamp: string } | null}
 */
const getLatestRequest = () => _latestRequest;

module.exports = {
  storeRequest,
  storeResponseAndBroadcast,
  getLatestResponse,
  getLatestRequest,
};
