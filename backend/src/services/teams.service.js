// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

const axios = require('axios');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

let cachedToken = {
  accessToken: null,
  expiresAt: 0,
};

/**
 * Get an application access token for Microsoft Graph using client credentials.
 * Tokens are cached in memory until shortly before expiry.
 * @returns {Promise<string>}
 */
const getAppAccessToken = async () => {
  const { tenantId, clientId, clientSecret } = config.graph || {};

  if (!tenantId || !clientId || !clientSecret) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Microsoft Graph is not configured. Please set MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, and MS_GRAPH_CLIENT_SECRET.'
    );
  }

  const now = Date.now();
  if (cachedToken.accessToken && now < cachedToken.expiresAt - 60 * 1000) {
    return cachedToken.accessToken;
  }

  try {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const { data } = await axios.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token: accessToken, expires_in: expiresIn } = data;
    if (!accessToken) {
      throw new Error('No access_token in Graph response');
    }

    cachedToken = {
      accessToken,
      expiresAt: now + (expiresIn || 3600) * 1000,
    };

    return accessToken;
  } catch (error) {
    logger.error(`Failed to obtain Microsoft Graph token: ${error.message}`);
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Failed to obtain Microsoft Graph access token');
  }
};

/**
 * Generate mock meeting data for demo purposes.
 * Used when Graph is not configured or user is not authenticated.
 * @returns {Object}
 */
const getMockMeeting = () => {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 15);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    id: 'mock-meeting-001',
    subject: 'Vehicle Software Review - Sprint Planning',
    start: start.toISOString(),
    end: end.toISOString(),
    location: 'Microsoft Teams Meeting',
    organizer: {
      name: 'Demo User',
      email: 'demo@example.com',
    },
    onlineMeeting: {
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/demo-meeting',
    },
    _isMock: true,
  };
};

/**
 * Get the next upcoming meeting for the given user (by email)
 * using Microsoft Graph application permissions.
 * Returns mock data when Graph is not configured or user is not authenticated.
 *
 * @param {string|null} userEmail
 * @returns {Promise<null|Object>}
 */
const getNextMeetingForUser = async (userEmail) => {
  const { tenantId, clientId, clientSecret } = config.graph || {};

  if (!tenantId || !clientId || !clientSecret || !userEmail) {
    logger.info('Microsoft Graph not configured or no user email - returning mock meeting data');
    return getMockMeeting();
  }

  const accessToken = await getAppAccessToken();
  const nowIso = new Date().toISOString();

  try {
    const url = `${config.graph.baseUrl}/users/${encodeURIComponent(userEmail)}/events`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        $top: 1,
        $orderby: 'start/dateTime',
        $filter: `start/dateTime ge ${nowIso}`,
      },
    });

    const events = Array.isArray(data.value) ? data.value : [];
    if (!events.length) {
      return null;
    }

    const event = events[0];
    const start = event.start?.dateTime || event.start;
    const end = event.end?.dateTime || event.end;
    const joinUrl = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || null;

    return {
      id: event.id,
      subject: event.subject,
      start,
      end,
      location: event.location?.displayName || null,
      organizer: {
        name: event.organizer?.emailAddress?.name || null,
        email: event.organizer?.emailAddress?.address || null,
      },
      onlineMeeting: {
        joinUrl,
      },
    };
  } catch (error) {
    logger.error(
      `Failed to fetch next meeting from Microsoft Graph for user ${userEmail}: ${error.message}`
    );
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Failed to fetch next meeting from Microsoft Graph');
  }
};

module.exports = {
  getNextMeetingForUser,
};

