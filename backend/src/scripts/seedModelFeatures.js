// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script for model-specific Extended APIs and dashboard presets.
// Run: node src/scripts/seedModelFeatures.js
// Requires: seedBrands.js run first, MongoDB connection

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Model, User, Brand, ExtendedApi, ModelTemplate } = require('../models');

// Brand-level base features: common platform APIs shared across all models of that brand
const BRAND_BASE_FEATURES = {
  Tata: [
    { apiName: 'Vehicle.Body.Sunroof.Panoramic.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Tata platform panoramic sunroof (common across Nexon, Harrier, Curvv)' },
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'Tata ADAS base - forward collision warning' },
    { apiName: 'Vehicle.Cabin.Infotainment.HMI.Display.Screen.IsOn', type: 'actuator', datatype: 'boolean', description: 'Tata iRA connected car infotainment display' },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Tata platform headlight control' },
    { apiName: 'Vehicle.Cabin.HVAC.IsAirConditioningActive', type: 'actuator', datatype: 'boolean', description: 'Tata platform HVAC base' },
  ],
  Mahindra: [
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'Mahindra ADAS base - forward collision warning' },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Mahindra platform headlight control' },
    { apiName: 'Vehicle.Cabin.HVAC.IsAirConditioningActive', type: 'actuator', datatype: 'boolean', description: 'Mahindra platform HVAC base' },
    { apiName: 'Vehicle.Chassis.Axle.DriveMode', type: 'actuator', datatype: 'string', description: 'Mahindra platform drive mode (2H/4H/4L for 4WD models)', allowed: ['2H', '4H', '4L'] },
    { apiName: 'Vehicle.Powertrain.Transmission.DriveMode', type: 'actuator', datatype: 'string', description: 'Mahindra platform drive mode', allowed: ['Normal', 'Eco', 'Sport'] },
  ],
  TVS: [
    { apiName: 'Vehicle.Speed', type: 'sensor', datatype: 'float', description: 'TVS SmartXonnect vehicle speed', min: 0, max: 180 },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'TVS headlight control' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.IsConnected', type: 'sensor', datatype: 'boolean', description: 'Helmet Bluetooth connection status' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.AudioStream.IsActive', type: 'sensor', datatype: 'boolean', description: 'Audio streaming to helmet active' },
    { apiName: 'Vehicle.Communication.Teams.CallState', type: 'sensor', datatype: 'string', description: 'Teams call state', allowed: ['idle', 'incoming', 'active', 'on_hold'] },
    { apiName: 'Vehicle.Communication.Teams.IsMuted', type: 'actuator', datatype: 'boolean', description: 'Teams audio mute state' },
  ],
};

const MODEL_EXTENDED_APIS = {
  Nexon: [
    { apiName: 'Vehicle.Body.Sunroof.Panoramic.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Panoramic sunroof open/closed state' },
    { apiName: 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Percent', type: 'sensor', datatype: 'float', description: 'Battery state of charge percentage', min: 0, max: 100 },
    { apiName: 'Vehicle.Powertrain.ElectricMotor.DriveMode', type: 'actuator', datatype: 'string', description: 'Drive mode: City, Sport, Eco', allowed: ['City', 'Sport', 'Eco'] },
    { apiName: 'Vehicle.Powertrain.RegenerativeBraking.Level', type: 'actuator', datatype: 'uint8', description: 'Regenerative braking level 0-4', min: 0, max: 4 },
    { apiName: 'Vehicle.Cabin.Seat.Row1.DriverSide.Ventilation.IsEnabled', type: 'actuator', datatype: 'boolean', description: 'Ventilated seat enabled' },
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'Forward collision warning active' },
  ],
  Harrier: [
    { apiName: 'Vehicle.Body.Sunroof.Panoramic.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Panoramic sunroof with voice control' },
    { apiName: 'Vehicle.Body.Tailgate.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Powered tailgate state' },
    { apiName: 'Vehicle.Cabin.Infotainment.HMI.Display.Screen.Rear.IsOn', type: 'actuator', datatype: 'boolean', description: 'Rear infotainment display' },
    { apiName: 'Vehicle.Cabin.HVAC.Station.Row1.Driver.Temperature', type: 'actuator', datatype: 'float', description: 'Dual-zone climate driver temp', min: 16, max: 30 },
    { apiName: 'Vehicle.Cabin.HVAC.Station.Row1.Passenger.Temperature', type: 'actuator', datatype: 'float', description: 'Dual-zone climate passenger temp', min: 16, max: 30 },
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'ADAS L2+ forward collision warning' },
    { apiName: 'Vehicle.ADAS.LaneDepartureWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'Lane departure warning' },
  ],
  Curvv: [
    { apiName: 'Vehicle.Body.Sunroof.Panoramic.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Voice-assisted panoramic sunroof' },
    { apiName: 'Vehicle.Body.Tailgate.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Gesture-controlled tailgate' },
    { apiName: 'Vehicle.Cabin.HVAC.AirPurifier.IsEnabled', type: 'actuator', datatype: 'boolean', description: 'Air purifier with AQI' },
    { apiName: 'Vehicle.Powertrain.Transmission.DriveMode', type: 'actuator', datatype: 'string', description: 'Drive mode: Eco, City, Sport', allowed: ['Eco', 'City', 'Sport'] },
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'ADAS L2 forward collision warning' },
  ],
  XUV700: [
    { apiName: 'Vehicle.Body.Sunroof.Panoramic.IsOpen', type: 'actuator', datatype: 'boolean', description: 'Panoramic sunroof' },
    { apiName: 'Vehicle.ADAS.AdaptiveCruiseControl.IsEnabled', type: 'actuator', datatype: 'boolean', description: 'Adaptive cruise control' },
    { apiName: 'Vehicle.ADAS.DriverDrowsinessDetection.IsAlertActive', type: 'sensor', datatype: 'boolean', description: 'Drowsiness detection alert' },
    { apiName: 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', type: 'sensor', datatype: 'boolean', description: 'Forward collision warning' },
    { apiName: 'Vehicle.ADAS.TrafficSignRecognition.SpeedLimit', type: 'sensor', datatype: 'uint8', description: 'Traffic sign recognized speed limit' },
    { apiName: 'Vehicle.Body.Camera.SurroundView.IsActive', type: 'sensor', datatype: 'boolean', description: '360 camera view active' },
  ],
  Thar: [
    { apiName: 'Vehicle.Chassis.Axle.DriveMode', type: 'actuator', datatype: 'string', description: '4WD mode: 2H, 4H, 4L', allowed: ['2H', '4H', '4L'] },
    { apiName: 'Vehicle.Chassis.GroundClearance.Millimeters', type: 'sensor', datatype: 'uint16', description: 'Ground clearance in mm', min: 0, max: 500 },
    { apiName: 'Vehicle.Powertrain.Transmission.DriveMode', type: 'actuator', datatype: 'string', description: 'Off-road drive mode', allowed: ['Normal', 'Mud', 'Sand', 'Rock'] },
    { apiName: 'Vehicle.Body.DifferentialLock.IsEngaged', type: 'actuator', datatype: 'boolean', description: 'Differential lock engaged' },
  ],
  // TVS Two-Wheeler Models
  Apache: [
    { apiName: 'Vehicle.Speed', type: 'sensor', datatype: 'float', description: 'Current speed in km/h', min: 0, max: 180 },
    { apiName: 'Vehicle.Powertrain.FuelSystem.Level', type: 'sensor', datatype: 'uint8', description: 'Fuel level percentage', min: 0, max: 100 },
    { apiName: 'Vehicle.Powertrain.CombustionEngine.RPM', type: 'sensor', datatype: 'uint16', description: 'Engine RPM', min: 0, max: 12000 },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Headlight on/off' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.IsConnected', type: 'sensor', datatype: 'boolean', description: 'Helmet Bluetooth connected' },
    { apiName: 'Vehicle.Communication.Teams.RideMode', type: 'sensor', datatype: 'string', description: 'Teams safety mode', allowed: ['stopped', 'city', 'urban', 'highway'] },
    { apiName: 'Vehicle.Communication.Teams.CallState', type: 'sensor', datatype: 'string', description: 'Current call state', allowed: ['idle', 'incoming', 'active'] },
    { apiName: 'Vehicle.OBD.TripDuration', type: 'sensor', datatype: 'uint32', description: 'Trip duration in seconds' },
  ],
  Jupiter: [
    { apiName: 'Vehicle.Speed', type: 'sensor', datatype: 'float', description: 'Current speed in km/h', min: 0, max: 100 },
    { apiName: 'Vehicle.Powertrain.FuelSystem.Level', type: 'sensor', datatype: 'uint8', description: 'Fuel level percentage', min: 0, max: 100 },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Headlight on/off' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.IsConnected', type: 'sensor', datatype: 'boolean', description: 'Helmet Bluetooth connected' },
    { apiName: 'Vehicle.Communication.Teams.RideMode', type: 'sensor', datatype: 'string', description: 'Teams safety mode', allowed: ['stopped', 'city', 'urban', 'highway'] },
    { apiName: 'Vehicle.Communication.Teams.CallState', type: 'sensor', datatype: 'string', description: 'Current call state', allowed: ['idle', 'incoming', 'active'] },
  ],
  Ntorq: [
    { apiName: 'Vehicle.Speed', type: 'sensor', datatype: 'float', description: 'Current speed in km/h', min: 0, max: 120 },
    { apiName: 'Vehicle.Powertrain.FuelSystem.Level', type: 'sensor', datatype: 'uint8', description: 'Fuel level percentage', min: 0, max: 100 },
    { apiName: 'Vehicle.Powertrain.CombustionEngine.RPM', type: 'sensor', datatype: 'uint16', description: 'Engine RPM', min: 0, max: 10000 },
    { apiName: 'Vehicle.Powertrain.Transmission.DriveMode', type: 'actuator', datatype: 'string', description: 'Ride mode', allowed: ['Street', 'Sport', 'Race'] },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'Headlight on/off' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.IsConnected', type: 'sensor', datatype: 'boolean', description: 'SmartXonnect Bluetooth connected' },
    { apiName: 'Vehicle.Communication.Teams.RideMode', type: 'sensor', datatype: 'string', description: 'Teams safety mode', allowed: ['stopped', 'city', 'urban', 'highway'] },
    { apiName: 'Vehicle.Communication.Teams.CallState', type: 'sensor', datatype: 'string', description: 'Current call state', allowed: ['idle', 'incoming', 'active'] },
    { apiName: 'Vehicle.Navigation.Turn.Direction', type: 'sensor', datatype: 'string', description: 'Navigation turn direction', allowed: ['left', 'right', 'straight', 'uturn'] },
  ],
  iQube: [
    { apiName: 'Vehicle.Speed', type: 'sensor', datatype: 'float', description: 'Current speed in km/h', min: 0, max: 80 },
    { apiName: 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Percent', type: 'sensor', datatype: 'float', description: 'Battery percentage', min: 0, max: 100 },
    { apiName: 'Vehicle.Powertrain.TractionBattery.Range', type: 'sensor', datatype: 'uint16', description: 'Estimated range in km', min: 0, max: 150 },
    { apiName: 'Vehicle.Powertrain.ElectricMotor.DriveMode', type: 'actuator', datatype: 'string', description: 'Electric drive mode', allowed: ['Eco', 'Normal', 'Sport'] },
    { apiName: 'Vehicle.Body.Lights.Beam.Low.IsOn', type: 'actuator', datatype: 'boolean', description: 'LED headlight' },
    { apiName: 'Vehicle.Connectivity.Bluetooth.IsConnected', type: 'sensor', datatype: 'boolean', description: 'TFT Bluetooth connected' },
    { apiName: 'Vehicle.Communication.Teams.RideMode', type: 'sensor', datatype: 'string', description: 'Teams safety mode', allowed: ['stopped', 'city', 'urban', 'highway'] },
    { apiName: 'Vehicle.Communication.Teams.CallState', type: 'sensor', datatype: 'string', description: 'Current call state', allowed: ['idle', 'incoming', 'active'] },
    { apiName: 'Vehicle.Connectivity.SmartXonnect.NavAudio.IsEnabled', type: 'actuator', datatype: 'boolean', description: 'Navigation audio to helmet' },
    { apiName: 'Vehicle.Powertrain.TractionBattery.Charging.IsConnected', type: 'sensor', datatype: 'boolean', description: 'Charger connected' },
  ],
};

function buildWidgetConfig(modelName) {
  const baseUrl = '/builtin-widgets';
  const modelApis = getModelApiPaths(modelName);
  const widget = (path, options, boxes) => ({ plugin: 'Builtin', widget: 'Widget', path, url: path, options, boxes });
  // Grid is 5 cols x 2 rows. Valid boxes: [1,2], [3,4], [6,7,8,9], [5,10]
  const configs = {
    Nexon: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.driveMode || 'Vehicle.Powertrain.ElectricMotor.DriveMode', label: 'Drive Mode' }, [1, 2]),
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.battery || 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Percent', label: 'Battery %' }, [3, 4]),
        widget(`${baseUrl}/signal-list-settable/index.html`, { apis: [modelApis.sunroof || 'Vehicle.Body.Sunroof.Panoramic.IsOpen', modelApis.regen || 'Vehicle.Powertrain.RegenerativeBraking.Level'] }, [6, 7, 8, 9]),
        widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
      ],
    },
    Harrier: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.sunroof || 'Vehicle.Body.Sunroof.Panoramic.IsOpen', label: 'Sunroof' }, [1, 2]),
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.tailgate || 'Vehicle.Body.Tailgate.IsOpen', label: 'Tailgate' }, [3, 4]),
        widget(`${baseUrl}/signal-list-settable/index.html`, { apis: [modelApis.adasFcw || 'Vehicle.ADAS.ForwardCollisionWarning.IsActive', modelApis.adasLdw || 'Vehicle.ADAS.LaneDepartureWarning.IsActive', 'Vehicle.Cabin.HVAC.Station.Row1.Driver.Temperature'] }, [6, 7, 8, 9]),
        widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
      ],
    },
    Curvv: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.sunroof || 'Vehicle.Body.Sunroof.Panoramic.IsOpen', label: 'Sunroof' }, [1, 2]),
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.airPurifier || 'Vehicle.Cabin.HVAC.AirPurifier.IsEnabled', label: 'Air Purifier' }, [3, 4]),
        widget(`${baseUrl}/signal-list-settable/index.html`, { apis: [modelApis.driveMode || 'Vehicle.Powertrain.Transmission.DriveMode', modelApis.tailgate || 'Vehicle.Body.Tailgate.IsOpen'] }, [6, 7, 8, 9]),
        widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
      ],
    },
    XUV700: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.acc || 'Vehicle.ADAS.AdaptiveCruiseControl.IsEnabled', label: 'Adaptive Cruise' }, [1, 2]),
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.drowsiness || 'Vehicle.ADAS.DriverDrowsinessDetection.IsAlertActive', label: 'Drowsiness Alert' }, [3, 4]),
        widget(`${baseUrl}/signal-list-settable/index.html`, { apis: [modelApis.sunroof || 'Vehicle.Body.Sunroof.Panoramic.IsOpen', modelApis.camera || 'Vehicle.Body.Camera.SurroundView.IsActive', modelApis.adasFcw || 'Vehicle.ADAS.ForwardCollisionWarning.IsActive'] }, [6, 7, 8, 9]),
        widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
      ],
    },
    Thar: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.driveMode || 'Vehicle.Chassis.Axle.DriveMode', label: '4WD Mode' }, [1, 2]),
        widget(`${baseUrl}/single-api/index.html`, { api: modelApis.groundClearance || 'Vehicle.Chassis.GroundClearance.Millimeters', label: 'Ground Clearance' }, [3, 4]),
        widget(`${baseUrl}/signal-list-settable/index.html`, { apis: [modelApis.offroadMode || 'Vehicle.Powertrain.Transmission.DriveMode', modelApis.diffLock || 'Vehicle.Body.DifferentialLock.IsEngaged'] }, [6, 7, 8, 9]),
        widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
      ],
    },
    // TVS Two-Wheeler Models with Teams Rider/Pillion Views
    Apache: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/teams-rider/index.html`, { label: 'Teams - Rider View' }, [1, 2, 3, 4, 5]),
        widget(`${baseUrl}/teams-pillion/index.html`, { label: 'Teams - Pillion View' }, [6, 7, 8, 9, 10]),
      ],
    },
    Jupiter: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/teams-rider/index.html`, { label: 'Teams - Rider View' }, [1, 2, 3, 4, 5]),
        widget(`${baseUrl}/teams-pillion/index.html`, { label: 'Teams - Pillion View' }, [6, 7, 8, 9, 10]),
      ],
    },
    Ntorq: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/teams-rider/index.html`, { label: 'Teams - Rider View' }, [1, 2, 3, 4, 5]),
        widget(`${baseUrl}/teams-pillion/index.html`, { label: 'Teams - Pillion View' }, [6, 7, 8, 9, 10]),
      ],
    },
    iQube: {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/teams-rider/index.html`, { label: 'Teams - Rider View' }, [1, 2, 3, 4, 5]),
        widget(`${baseUrl}/teams-pillion/index.html`, { label: 'Teams - Pillion View' }, [6, 7, 8, 9, 10]),
      ],
    },
  };
  return configs[modelName] || configs.Nexon;
}

function buildBaseModelWidgetConfig(brandName) {
  const baseUrl = '/builtin-widgets';
  const widget = (path, options, boxes) => ({ plugin: 'Builtin', widget: 'Widget', path, url: path, options, boxes });
  const baseApis = BRAND_BASE_FEATURES[brandName] || [];
  const apiNames = baseApis.map((a) => a.apiName).filter(Boolean);

  // Special config for TVS two-wheelers with Teams Rider/Pillion views
  if (brandName === 'TVS') {
    return {
      autorun: false,
      widgets: [
        widget(`${baseUrl}/teams-rider/index.html`, { label: 'Teams - Rider View' }, [1, 2, 3, 4, 5]),
        widget(`${baseUrl}/teams-pillion/index.html`, { label: 'Teams - Pillion View' }, [6, 7, 8, 9, 10]),
      ],
    };
  }

  return {
    autorun: false,
    widgets: [
      widget(`${baseUrl}/single-api/index.html`, { api: 'Vehicle.Body.Lights.Beam.Low.IsOn', label: 'Headlights' }, [1, 2]),
      widget(`${baseUrl}/single-api/index.html`, { api: 'Vehicle.Cabin.HVAC.IsAirConditioningActive', label: 'AC' }, [3, 4]),
      widget(`${baseUrl}/signal-list-settable/index.html`, { apis: apiNames.slice(0, 5) }, [6, 7, 8, 9]),
      widget(`${baseUrl}/terminal/index.html`, {}, [5, 10]),
    ],
  };
}

function getModelApiPaths(modelName) {
  const apis = MODEL_EXTENDED_APIS[modelName] || [];
  const paths = {};
  apis.forEach((a) => {
    if (a.apiName.includes('Sunroof')) paths.sunroof = a.apiName;
    else if (a.apiName.includes('Tailgate')) paths.tailgate = a.apiName;
    else if (a.apiName.includes('DriveMode') || a.apiName.includes('ElectricMotor')) paths.driveMode = a.apiName;
    else if (a.apiName.includes('StateOfCharge')) paths.battery = a.apiName;
    else if (a.apiName.includes('RegenerativeBraking')) paths.regen = a.apiName;
    else if (a.apiName.includes('ForwardCollisionWarning')) paths.adasFcw = a.apiName;
    else if (a.apiName.includes('LaneDepartureWarning')) paths.adasLdw = a.apiName;
    else if (a.apiName.includes('AdaptiveCruiseControl')) paths.acc = a.apiName;
    else if (a.apiName.includes('DriverDrowsinessDetection')) paths.drowsiness = a.apiName;
    else if (a.apiName.includes('SurroundView')) paths.camera = a.apiName;
    else if (a.apiName.includes('AirPurifier')) paths.airPurifier = a.apiName;
    else if (a.apiName.includes('GroundClearance')) paths.groundClearance = a.apiName;
    else if (a.apiName.includes('DifferentialLock')) paths.diffLock = a.apiName;
    else if (a.apiName.includes('Axle.DriveMode')) paths.driveMode = a.apiName;
    else if (a.apiName.includes('Transmission.DriveMode')) paths.offroadMode = a.apiName;
  });
  return paths;
}

async function seedModelFeatures() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    const firstUser = await User.findOne();
    if (!firstUser) {
      console.error('No user found. Run seedBrands first.');
      process.exit(1);
    }
    const userId = firstUser._id;

    const modelNames = ['Nexon', 'Harrier', 'Curvv', 'XUV700', 'Thar', 'Apache', 'Jupiter', 'Ntorq', 'iQube'];
    const brandIds = await Brand.find({ name: { $in: ['Tata', 'Mahindra', 'TVS'] } }).distinct('_id');
    const brands = await Brand.find({ name: { $in: ['Tata', 'Mahindra', 'TVS'] } });

    // Seed Base Model with brand-specific base features for each brand
    for (const brand of brands) {
      const baseModel = await Model.findOne({ name: 'Base Model', brand_id: brand._id, is_base_model: true });
      if (!baseModel) {
        console.log(`  Skipping Base Model for ${brand.name} - not found. Run seedBrands first.`);
        continue;
      }

      const baseFeatures = BRAND_BASE_FEATURES[brand.name] || [];
      for (const apiDef of baseFeatures) {
        const existing = await ExtendedApi.findOne({ apiName: apiDef.apiName, model: baseModel._id });
        if (!existing) {
          await ExtendedApi.create({ ...apiDef, model: baseModel._id, isWishlist: false });
          console.log(`  Created Base Api: ${apiDef.apiName} for ${brand.name} Base Model`);
        }
      }

      const templateName = `Dashboard - ${brand.name} Base Model`;
      let template = await ModelTemplate.findOne({ name: templateName });
      const widgetConfig = buildBaseModelWidgetConfig(brand.name);

      if (!template) {
        template = await ModelTemplate.create({
          name: templateName,
          description: `Base platform dashboard for ${brand.name} - common hardware/software features`,
          visibility: 'public',
          config: { widget_config: widgetConfig },
          created_by: userId,
          updated_by: userId,
        });
        console.log(`  Created ModelTemplate: ${templateName}`);
      } else {
        template.config = { ...(template.config || {}), widget_config: widgetConfig };
        template.updated_by = userId;
        await template.save();
        console.log(`  Updated ModelTemplate: ${templateName}`);
      }

      if (!baseModel.model_template_id || !baseModel.model_template_id.equals(template._id)) {
        baseModel.model_template_id = template._id;
        await baseModel.save();
        console.log(`  Linked ${brand.name} Base Model to template`);
      }
    }

    for (const modelName of modelNames) {
      const model = await Model.findOne({ name: modelName, brand_id: { $in: brandIds } });
      if (!model) {
        console.log(`  Skipping ${modelName} - model not found. Run seedBrands first.`);
        continue;
      }

      for (const apiDef of (MODEL_EXTENDED_APIS[modelName] || [])) {
        const existing = await ExtendedApi.findOne({ apiName: apiDef.apiName, model: model._id });
        if (!existing) {
          await ExtendedApi.create({ ...apiDef, model: model._id, isWishlist: false });
          console.log(`  Created ExtendedApi: ${apiDef.apiName} for ${modelName}`);
        }
      }

      const templateName = `Dashboard - ${modelName}`;
      let template = await ModelTemplate.findOne({ name: templateName });
      const widgetConfig = buildWidgetConfig(modelName);

      if (!template) {
        template = await ModelTemplate.create({
          name: templateName,
          description: `Default dashboard preset for ${modelName}`,
          visibility: 'public',
          config: { widget_config: widgetConfig },
          created_by: userId,
          updated_by: userId,
        });
        console.log(`  Created ModelTemplate: ${templateName}`);
      } else {
        template.config = { ...(template.config || {}), widget_config: widgetConfig };
        template.updated_by = userId;
        await template.save();
        console.log(`  Updated ModelTemplate: ${templateName}`);
      }

      if (!model.model_template_id || !model.model_template_id.equals(template._id)) {
        model.model_template_id = template._id;
        await model.save();
        console.log(`  Linked ${modelName} to template`);
      }
    }

    console.log('Seed model features completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

if (require.main === module) {
  seedModelFeatures();
}

module.exports = seedModelFeatures;

