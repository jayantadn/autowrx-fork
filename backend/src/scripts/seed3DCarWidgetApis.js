// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script to add 3D Car Widget APIs to all existing vehicle models.
// Run: node src/scripts/seed3DCarWidgetApis.js
// Requires: MongoDB connection

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Model, ExtendedApi } = require('../models');

// 3D Car Widget APIs - all defined as actuators for SDV code compatibility
const CAR_WIDGET_APIS = [
  // Doors - Row 1
  { apiName: 'Vehicle.Cabin.Door.Row1.DriverSide.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Driver door open state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.DriverSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Driver door locked state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.DriverSide.Position', type: 'actuator', datatype: 'uint8', description: 'Driver door position %' },
  { apiName: 'Vehicle.Cabin.Door.Row1.PassengerSide.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Passenger door open state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.PassengerSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Passenger door locked state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.PassengerSide.Position', type: 'actuator', datatype: 'uint8', description: 'Passenger door position %' },
  
  // Doors - Row 2
  { apiName: 'Vehicle.Cabin.Door.Row2.DriverSide.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Rear driver door open state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.DriverSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Rear driver door locked state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.DriverSide.Position', type: 'actuator', datatype: 'uint8', description: 'Rear driver door position %' },
  { apiName: 'Vehicle.Cabin.Door.Row2.PassengerSide.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Rear passenger door open state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.PassengerSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Rear passenger door locked state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.PassengerSide.Position', type: 'actuator', datatype: 'uint8', description: 'Rear passenger door position %' },
  
  // Windows - Row 1
  { apiName: 'Vehicle.Cabin.Door.Row1.DriverSide.Window.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Driver window open state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.DriverSide.Window.Position', type: 'actuator', datatype: 'uint8', description: 'Driver window position %' },
  { apiName: 'Vehicle.Cabin.Door.Row1.PassengerSide.Window.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Passenger window open state' },
  { apiName: 'Vehicle.Cabin.Door.Row1.PassengerSide.Window.Position', type: 'actuator', datatype: 'uint8', description: 'Passenger window position %' },
  
  // Windows - Row 2
  { apiName: 'Vehicle.Cabin.Door.Row2.DriverSide.Window.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Rear driver window open state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.DriverSide.Window.Position', type: 'actuator', datatype: 'uint8', description: 'Rear driver window position %' },
  { apiName: 'Vehicle.Cabin.Door.Row2.PassengerSide.Window.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Rear passenger window open state' },
  { apiName: 'Vehicle.Cabin.Door.Row2.PassengerSide.Window.Position', type: 'actuator', datatype: 'uint8', description: 'Rear passenger window position %' },
  
  // Seats - Row 1
  { apiName: 'Vehicle.Cabin.Seat.Row1.DriverSide.Height', type: 'actuator', datatype: 'uint16', description: 'Driver seat height mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row1.DriverSide.Position', type: 'actuator', datatype: 'uint16', description: 'Driver seat position mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row1.PassengerSide.Height', type: 'actuator', datatype: 'uint16', description: 'Passenger seat height mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row1.PassengerSide.Position', type: 'actuator', datatype: 'uint16', description: 'Passenger seat position mm' },
  
  // Seats - Row 2
  { apiName: 'Vehicle.Cabin.Seat.Row2.DriverSide.Height', type: 'actuator', datatype: 'uint16', description: 'Rear driver seat height mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row2.DriverSide.Position', type: 'actuator', datatype: 'uint16', description: 'Rear driver seat position mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row2.PassengerSide.Height', type: 'actuator', datatype: 'uint16', description: 'Rear passenger seat height mm' },
  { apiName: 'Vehicle.Cabin.Seat.Row2.PassengerSide.Position', type: 'actuator', datatype: 'uint16', description: 'Rear passenger seat position mm' },
  
  // Lights
  { apiName: 'Vehicle.Body.Lights.Beam.High.IsOn', type: 'actuator', datatype: 'boolean', description: 'High beam lights on/off' },
  { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Low beam lights on/off' },
  { apiName: 'Vehicle.Body.Lights.Brake.IsActive', type: 'actuator', datatype: 'boolean', description: 'Brake lights active' },
  { apiName: 'Vehicle.Body.Lights.LicensePlate.IsOn', type: 'actuator', datatype: 'boolean', description: 'License plate light on/off' },
  
  // Trunk
  { apiName: 'Vehicle.Body.Trunk.Rear.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Rear trunk open state' },
  { apiName: 'Vehicle.Body.Trunk.Rear.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Rear trunk locked state' },
  { apiName: 'Vehicle.Body.Trunk.Rear.Position', type: 'actuator', datatype: 'uint8', description: 'Rear trunk position %' },
  { apiName: 'Vehicle.Body.Trunk.Rear.IsLightOn', type: 'actuator', datatype: 'boolean', description: 'Rear trunk light on/off' },
  { apiName: 'Vehicle.Body.Trunk.Front.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Front trunk locked state' },
  { apiName: 'Vehicle.Body.Trunk.Front.Position', type: 'actuator', datatype: 'uint8', description: 'Front trunk position %' },
  { apiName: 'Vehicle.Body.Trunk.Front.IsLightOn', type: 'actuator', datatype: 'boolean', description: 'Front trunk light on/off' },
  
  // Hood
  { apiName: 'Vehicle.Body.Hood.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Hood/front trunk open state' },
  
  // Mirrors
  { apiName: 'Vehicle.Body.Mirrors.DriverSide.IsFolded', type: 'actuator', datatype: 'boolean', description: 'Driver mirror folded' },
  { apiName: 'Vehicle.Body.Mirrors.DriverSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Driver mirror locked' },
  { apiName: 'Vehicle.Body.Mirrors.PassengerSide.IsFolded', type: 'actuator', datatype: 'boolean', description: 'Passenger mirror folded' },
  { apiName: 'Vehicle.Body.Mirrors.PassengerSide.IsLocked', type: 'actuator', datatype: 'boolean', description: 'Passenger mirror locked' },
  
  // Wipers
  { apiName: 'Vehicle.Body.Windshield.Front.Wiping.Mode', type: 'actuator', datatype: 'uint8', description: 'Front wiper mode (0=off, 1=low, 2=high)' },
  { apiName: 'Vehicle.Body.Windshield.Rear.Wiping.Mode', type: 'actuator', datatype: 'uint8', description: 'Rear wiper mode (0=off, 1=low, 2=high)' },
  
  // Ambient Lights
  { apiName: 'Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Color', type: 'actuator', datatype: 'string', description: 'Driver ambient light color (hex)' },
  { apiName: 'Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.IsLightOn', type: 'actuator', datatype: 'boolean', description: 'Driver ambient light on/off' },
  { apiName: 'Vehicle.Cabin.Light.AmbientLight.Row1.PassengerSide.Color', type: 'actuator', datatype: 'string', description: 'Passenger ambient light color (hex)' },
  { apiName: 'Vehicle.Cabin.Light.AmbientLight.Row1.PassengerSide.IsLightOn', type: 'actuator', datatype: 'boolean', description: 'Passenger ambient light on/off' },
  
  // Speed (sensor for display)
  { apiName: 'Vehicle.AverageSpeed', type: 'sensor', datatype: 'float', description: 'Average vehicle speed km/h', unit: 'km/h' },
  
  // Horn
  { apiName: 'Vehicle.Body.Horn.IsActive', type: 'actuator', datatype: 'boolean', description: 'Horn active' },
];

async function seed3DCarWidgetApis() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Find all existing models
    const allModels = await Model.find({});
    console.log(`Found ${allModels.length} vehicle models`);

    if (allModels.length === 0) {
      console.log('No models found. Creating APIs will happen when you create a new model.');
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const model of allModels) {
      console.log(`\nProcessing model: ${model.name} (${model._id})`);
      
      for (const api of CAR_WIDGET_APIS) {
        try {
          // Check if API already exists for this model
          const existing = await ExtendedApi.findOne({
            model: model._id,
            apiName: api.apiName,
          });

          if (existing) {
            // Update the type to actuator if it's not already
            if (existing.type !== api.type) {
              existing.type = api.type;
              existing.datatype = api.datatype;
              existing.description = api.description;
              await existing.save();
              updatedCount++;
              console.log(`  Updated: ${api.apiName} -> ${api.type}`);
            } else {
              skippedCount++;
            }
          } else {
            // Create new ExtendedApi
            await ExtendedApi.create({
              model: model._id,
              apiName: api.apiName,
              type: api.type,
              datatype: api.datatype,
              description: api.description,
              unit: api.unit || '',
            });
            addedCount++;
            console.log(`  Added: ${api.apiName}`);
          }
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error - API already exists
            skippedCount++;
          } else {
            console.error(`  Error adding ${api.apiName}: ${error.message}`);
          }
        }
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Models processed: ${allModels.length}`);
    console.log(`APIs added: ${addedCount}`);
    console.log(`APIs updated: ${updatedCount}`);
    console.log(`APIs skipped (already exist): ${skippedCount}`);
    console.log('\n3D Car Widget APIs are now available as actuators!');
    console.log('Refresh your prototype page to use the new APIs.');

  } catch (error) {
    console.error('Error seeding 3D Car Widget APIs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
seed3DCarWidgetApis();
