// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script for the built-in Microsoft Teams plugin.
// Run from backend root: node src/scripts/seedTeamsPlugin.js
// Requires: MongoDB connection (use same .env as backend)

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const config = require('../config/config');
const { Plugin, User } = require('../models');

const TEAMS_PLUGIN_SLUG = 'microsoft-teams';

async function seedTeamsPlugin() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    const firstUser = await User.findOne();
    if (!firstUser) {
      console.error('No user found. Create a user first (e.g. register).');
      process.exit(1);
    }

    const update = {
      $set: {
        name: 'Microsoft Teams',
        description: 'View your next Teams meeting and join from the playground. Use as a feature to test per car model during simulation.',
        is_internal: true,
        built_in: true,
        url: '',
        type: 'prototype_function',
        updated_by: firstUser._id,
      },
      $setOnInsert: {
        slug: TEAMS_PLUGIN_SLUG,
        created_by: firstUser._id,
      },
    };

    const result = await Plugin.findOneAndUpdate(
      { slug: TEAMS_PLUGIN_SLUG },
      update,
      { upsert: true, new: true }
    );

    const created = result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime();
    console.log(created ? `Created plugin: ${TEAMS_PLUGIN_SLUG}` : `Updated plugin: ${TEAMS_PLUGIN_SLUG}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedTeamsPlugin();
