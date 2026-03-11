// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

const express = require('express');
const auth = require('../../../middlewares/auth');
const { teamsController } = require('../../../controllers');

const router = express.Router();

// GET /v2/teams/meetings/next
// Auth is optional - returns mock data when not authenticated or Graph not configured
router.get('/meetings/next', auth({ optional: true }), teamsController.getNextMeeting);

module.exports = router;

