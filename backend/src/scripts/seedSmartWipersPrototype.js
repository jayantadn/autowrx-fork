// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script for Smart Wipers prototype
// Run: node src/scripts/seedSmartWipersPrototype.js
// Requires: MongoDB connection, at least one user in the database

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Model, User, Prototype } = require('../models');

const SMART_WIPERS_CODE = `from sdv_model import Vehicle
import plugins
from browser import aio

vehicle = Vehicle()

# Smart Wipers - Automatic rain-sensing wiper control
# This prototype demonstrates intelligent wiper speed adjustment
# based on rain intensity detected by sensors

async def on_rain_intensity_change():
    """Adjust wiper mode based on rain sensor intensity"""
    intensity = await vehicle.Body.Windshield.Front.WasherFluid.LevelLow.get()
    
    # Determine appropriate wiper mode based on rain intensity
    if intensity == 0:
        await vehicle.Body.Windshield.Front.Wiping.Mode.set("OFF")
        print("No rain detected - Wipers OFF")
    elif intensity < 30:
        await vehicle.Body.Windshield.Front.Wiping.Mode.set("INTERVAL")
        print(f"Light rain ({intensity}%) - Interval wiping")
    elif intensity < 60:
        await vehicle.Body.Windshield.Front.Wiping.Mode.set("SLOW")
        print(f"Moderate rain ({intensity}%) - Slow wiping")
    elif intensity < 85:
        await vehicle.Body.Windshield.Front.Wiping.Mode.set("MEDIUM")
        print(f"Heavy rain ({intensity}%) - Medium wiping")
    else:
        await vehicle.Body.Windshield.Front.Wiping.Mode.set("FAST")
        print(f"Torrential rain ({intensity}%) - Fast wiping")

async def demo_smart_wipers():
    """Demonstrate smart wiper functionality"""
    print("=== Smart Wipers Demo ===")
    print("Simulating rain intensity changes...")
    
    # Simulate different rain conditions
    for intensity in [0, 20, 45, 70, 95, 50, 10, 0]:
        await vehicle.Body.Windshield.Front.WasherFluid.LevelLow.set(intensity)
        await on_rain_intensity_change()
        await aio.sleep(3)
    
    print("=== Demo Complete ===")

# Run the demo
aio.run(demo_smart_wipers())
`;

const WIDGET_CONFIG = {
  autorun: false,
  widgets: [
    {
      plugin: 'Builtin',
      widget: '3D Windshield Wiper',
      path: '/builtin-widgets/3d-windshield-wiper/index.html',
      url: '/builtin-widgets/3d-windshield-wiper/index.html',
      options: {
        api: 'Vehicle.Body.Windshield.Front.Wiping.Mode',
        iconURL: '/builtin-widgets/3d-windshield-wiper/3d-windshield-wiper.svg',
      },
      boxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
  ],
};

async function seedSmartWipersPrototype() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Find the first user to use as creator
    const user = await User.findOne();
    if (!user) {
      console.error('No user found. Please create a user first.');
      process.exit(1);
    }
    console.log(`Using user: ${user.name || user.email}`);

    // Find a public model or the first available model
    let model = await Model.findOne({ visibility: 'public' });
    if (!model) {
      model = await Model.findOne();
    }
    if (!model) {
      console.error('No model found. Please create a model first or run seedBrands.');
      process.exit(1);
    }
    console.log(`Using model: ${model.name}`);

    // Check if Smart Wipers prototype already exists
    let prototype = await Prototype.findOne({ name: 'Smart Wipers', model_id: model._id });

    const prototypeData = {
      name: 'Smart Wipers',
      model_id: model._id,
      state: 'Released',
      description: {
        problem: 'Manual wiper control is distracting and inefficient during varying rain conditions',
        says_who: 'Drivers and safety researchers',
        solution: 'Automatic rain-sensing wipers that adjust speed based on precipitation intensity',
        status: 'Production Ready',
        text: 'Smart Wipers automatically adjust wiper speed based on rain intensity detected by sensors. This improves driver safety by maintaining optimal visibility without manual intervention.',
      },
      code: SMART_WIPERS_CODE,
      apis: {
        VSS: [
          'Vehicle.Body.Windshield.Front.Wiping.Mode',
          'Vehicle.Body.Windshield.Front.WasherFluid.LevelLow',
        ],
        VSC: [],
      },
      widget_config: JSON.stringify(WIDGET_CONFIG),
      executed_turns: 471,
      complexity_level: 2,
      customer_journey: 'Driving in rain',
      image_file: '/imgs/smart-wipers.png',
      autorun: true,
      created_by: user._id,
    };

    if (prototype) {
      // Update existing prototype
      Object.assign(prototype, prototypeData);
      await prototype.save();
      console.log('Updated existing Smart Wipers prototype');
    } else {
      // Create new prototype
      prototype = await Prototype.create(prototypeData);
      console.log('Created new Smart Wipers prototype');
    }

    console.log(`Prototype ID: ${prototype._id}`);
    console.log(`Prototype state: ${prototype.state}`);
    console.log(`Executed turns: ${prototype.executed_turns}`);
    console.log('\nSmart Wipers prototype seeded successfully!');
    console.log('It should now appear in Popular Prototypes on the home screen.');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

seedSmartWipersPrototype();
