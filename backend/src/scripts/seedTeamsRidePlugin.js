// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script for the Teams Ride Mode plugin (two-wheeler integration).
// Run from backend root: node src/scripts/seedTeamsRidePlugin.js
// Requires: MongoDB connection (use same .env as backend)

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const config = require('../config/config');
const { Plugin, User } = require('../models');

const TEAMS_RIDE_PLUGIN_SLUG = 'teams-ride-mode';

async function seedTeamsRidePlugin() {
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
        name: 'Teams Ride Mode',
        description: 'Audio-first Microsoft Teams integration for TVS two-wheelers. Features voice commands, speed-based safety modes, quick responses, and helmet Bluetooth audio support. Designed for safe hands-free communication while riding.',
        is_internal: true,
        built_in: true,
        url: '',
        type: 'prototype_function',
        updated_by: firstUser._id,
        config: {
          vehicle_types: ['Motorcycle', 'Scooter', 'Electric Scooter'],
          features: [
            'voice_commands',
            'speed_based_safety',
            'quick_responses', 
            'call_queue',
            'ride_summary',
            'helmet_audio',
            'vibration_alerts'
          ],
          supported_brands: ['TVS'],
          safety_modes: {
            stopped: { max_speed: 0, can_answer: true, can_join_meeting: true },
            city: { max_speed: 30, can_answer: true, can_join_meeting: false },
            urban: { max_speed: 60, can_answer: true, can_join_meeting: false },
            highway: { max_speed: 999, can_answer: false, can_join_meeting: false }
          }
        },
      },
      $setOnInsert: {
        slug: TEAMS_RIDE_PLUGIN_SLUG,
        created_by: firstUser._id,
      },
    };

    const result = await Plugin.findOneAndUpdate(
      { slug: TEAMS_RIDE_PLUGIN_SLUG },
      update,
      { upsert: true, new: true }
    );

    const created = result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime();
    console.log(created ? `Created plugin: ${TEAMS_RIDE_PLUGIN_SLUG}` : `Updated plugin: ${TEAMS_RIDE_PLUGIN_SLUG}`);
    console.log('Plugin config:', JSON.stringify(result.config, null, 2));
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedTeamsRidePlugin();
