// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

const httpStatus = require('http-status');
const { teamsService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

/**
 * Get the next upcoming Microsoft Teams meeting for the authenticated user.
 * Uses the user's email address to look up meetings in Microsoft Graph.
 * Returns mock data when user is not authenticated or Graph is not configured.
 */
const getNextMeeting = catchAsync(async (req, res) => {
  const userEmail = req.user?.email || null;

  const meeting = await teamsService.getNextMeetingForUser(userEmail);

  res.status(httpStatus.OK).send({
    meeting,
  });
});

module.exports = {
  getNextMeeting,
};

