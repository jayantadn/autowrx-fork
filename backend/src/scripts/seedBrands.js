// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Seed script for Tata, Mahindra, TVS, and Toyota Commercial Vehicles brands with their vehicle models.
// Run: node src/scripts/seedBrands.js
// Requires: MongoDB connection (use same .env as backend)

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Brand, Model, User } = require('../models');
const { visibilityTypes } = require('../config/enums');

const BASE_MODEL = {
  name: 'Base Model',
  vehicle_category: 'Platform',
  is_base_model: true,
};

const TATA_MODELS = [
  { name: 'Nexon', vehicle_category: 'SUV' },
  { name: 'Harrier', vehicle_category: 'SUV' },
  { name: 'Curvv', vehicle_category: 'SUV' },
];

const MAHINDRA_MODELS = [
  { name: 'XUV700', vehicle_category: 'SUV' },
  { name: 'Thar', vehicle_category: 'SUV' },
];

const TVS_MODELS = [
  { name: 'Apache', vehicle_category: 'Motorcycle' },
  { name: 'Jupiter', vehicle_category: 'Scooter' },
  { name: 'Ntorq', vehicle_category: 'Scooter' },
  { name: 'iQube', vehicle_category: 'Electric Scooter' },
];

const TOYOTA_MODELS = [
  { name: 'Hilux', vehicle_category: 'Pickup Truck' },
  { name: 'Innova', vehicle_category: 'MPV' },
  { name: 'Fortuner', vehicle_category: 'SUV' },
  { name: 'Land Cruiser', vehicle_category: 'SUV' },
];

async function createOrUpdateBaseModel(brand, userId) {
  let baseModel = await Model.findOne({
    name: BASE_MODEL.name,
    brand_id: brand._id,
    is_base_model: true,
  });

  if (baseModel) {
    baseModel.is_base_model = true;
    await baseModel.save();
    return;
  }

  // Check if model exists without is_base_model flag and update it
  baseModel = await Model.findOne({
    name: BASE_MODEL.name,
    brand_id: brand._id,
  });

  if (baseModel) {
    baseModel.is_base_model = true;
    baseModel.vehicle_category = BASE_MODEL.vehicle_category;
    await baseModel.save();
    return;
  }

  await Model.create({
    name: BASE_MODEL.name,
    main_api: 'Vehicle',
    api_version: 'v4.1',
    vehicle_category: BASE_MODEL.vehicle_category,
    visibility: visibilityTypes.PUBLIC,
    state: 'released',
    brand_id: brand._id,
    is_base_model: true,
    created_by: userId,
  });
}

async function seedBrands() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Get first user for created_by (required for Model)
    const firstUser = await User.findOne();
    if (!firstUser) {
      console.error('No user found in database. Please create a user first (e.g., register or run assignAdmins).');
      process.exit(1);
    }
    const userId = firstUser._id;
    console.log(`Using user ${firstUser.email || firstUser.name} for model ownership`);

    // Create or get Tata brand
    let tataBrand = await Brand.findOne({ name: 'Tata' });
    if (!tataBrand) {
      tataBrand = await Brand.create({
        name: 'Tata',
        description: 'Tata Motors - Indian multinational automotive manufacturer',
        logo_url: '/imgs/brands/1_large.jpg',
        hood_closed_image: '/imgs/brands/tata-hood-closed.png',
        hood_open_image: '/imgs/brands/tata-hood-open.png',
      });
      console.log('Created brand: Tata');
    } else {
      // Always update logo and hood images to latest
      tataBrand.logo_url = '/imgs/brands/1_large.jpg';
      tataBrand.hood_closed_image = '/imgs/brands/tata-hood-closed.png';
      tataBrand.hood_open_image = '/imgs/brands/tata-hood-open.png';
      await tataBrand.save();
      console.log('Updated Tata brand with logo and hood images');
    }

    // Create or get Mahindra brand
    let mahindraBrand = await Brand.findOne({ name: 'Mahindra' });
    if (!mahindraBrand) {
      mahindraBrand = await Brand.create({
        name: 'Mahindra',
        description: 'Mahindra & Mahindra - Indian automotive manufacturer',
        logo_url: '/imgs/brands/Mahindra-Logo-2021.png',
        hood_closed_image: '/imgs/brands/hood-closed-ref.png',
        hood_open_image: '/imgs/brands/hood-open-ref.png',
      });
      console.log('Created brand: Mahindra');
    } else {
      // Always update logo and hood images to latest
      mahindraBrand.logo_url = '/imgs/brands/Mahindra-Logo-2021.png';
      mahindraBrand.hood_closed_image = '/imgs/brands/hood-closed-ref.png';
      mahindraBrand.hood_open_image = '/imgs/brands/hood-open-ref.png';
      await mahindraBrand.save();
      console.log('Updated Mahindra brand with hood images');
    }

    // Create or get TVS brand
    let tvsBrand = await Brand.findOne({ name: 'TVS' });
    if (!tvsBrand) {
      tvsBrand = await Brand.create({
        name: 'TVS',
        description: 'TVS Motor Company - Indian multinational motorcycle manufacturer',
        logo_url: '/imgs/brands/TVS-Logo.jpg',
        hood_closed_image: '/imgs/brands/hood-closed-ref.png',
        hood_open_image: '/imgs/brands/hood-open-ref.png',
      });
      console.log('Created brand: TVS');
    } else {
      // Always update logo and hood images to latest
      tvsBrand.logo_url = '/imgs/brands/TVS-Logo.jpg';
      tvsBrand.hood_closed_image = '/imgs/brands/hood-closed-ref.png';
      tvsBrand.hood_open_image = '/imgs/brands/hood-open-ref.png';
      await tvsBrand.save();
      console.log('Updated TVS brand with hood images');
    }

    // Create or get Toyota Commercial Vehicles brand
    let toyotaBrand = await Brand.findOne({ name: 'Toyota Commercial Vehicles' });
    if (!toyotaBrand) {
      toyotaBrand = await Brand.create({
        name: 'Toyota Commercial Vehicles',
        description: 'Toyota Commercial Vehicles - Japanese multinational automotive manufacturer',
        logo_url: '/imgs/brands/Toyota-Logo.jpg',
        hood_closed_image: '/imgs/brands/hood-closed-ref.png',
        hood_open_image: '/imgs/brands/hood-open-ref.png',
      });
      console.log('Created brand: Toyota Commercial Vehicles');
    } else {
      // Always update logo and hood images to latest
      toyotaBrand.logo_url = '/imgs/brands/Toyota-Logo.jpg';
      toyotaBrand.hood_closed_image = '/imgs/brands/hood-closed-ref.png';
      toyotaBrand.hood_open_image = '/imgs/brands/hood-open-ref.png';
      await toyotaBrand.save();
      console.log('Updated Toyota Commercial Vehicles brand with hood images');
    }

    // Create or update Base Model for Tata
    await createOrUpdateBaseModel(tataBrand, userId);
    console.log('  Tata Base Model ensured');

    // Create or update Tata models
    for (const modelDef of TATA_MODELS) {
      // First check if model exists with brand_id
      let existingModel = await Model.findOne({
        name: modelDef.name,
        brand_id: tataBrand._id,
      });
      
      if (existingModel) {
        console.log(`  Model Tata ${modelDef.name} already exists with brand`);
        continue;
      }
      
      // Check if model exists without brand_id and update it
      existingModel = await Model.findOne({
        name: modelDef.name,
        $or: [{ brand_id: null }, { brand_id: { $exists: false } }],
      });
      
      if (existingModel) {
        existingModel.brand_id = tataBrand._id;
        await existingModel.save();
        console.log(`  Updated model ${modelDef.name} with Tata brand`);
      } else {
        // Create new model
        await Model.create({
          name: modelDef.name,
          main_api: 'Vehicle',
          api_version: 'v4.1',
          vehicle_category: modelDef.vehicle_category,
          visibility: visibilityTypes.PUBLIC,
          state: 'released',
          brand_id: tataBrand._id,
          created_by: userId,
        });
        console.log(`  Created model: Tata ${modelDef.name}`);
      }
    }

    // Create or update Base Model for Mahindra
    await createOrUpdateBaseModel(mahindraBrand, userId);
    console.log('  Mahindra Base Model ensured');

    // Create or update Mahindra models
    for (const modelDef of MAHINDRA_MODELS) {
      // First check if model exists with brand_id
      let existingModel = await Model.findOne({
        name: modelDef.name,
        brand_id: mahindraBrand._id,
      });
      
      if (existingModel) {
        console.log(`  Model Mahindra ${modelDef.name} already exists with brand`);
        continue;
      }
      
      // Check if model exists without brand_id and update it
      existingModel = await Model.findOne({
        name: modelDef.name,
        $or: [{ brand_id: null }, { brand_id: { $exists: false } }],
      });
      
      if (existingModel) {
        existingModel.brand_id = mahindraBrand._id;
        await existingModel.save();
        console.log(`  Updated model ${modelDef.name} with Mahindra brand`);
      } else {
        // Create new model
        await Model.create({
          name: modelDef.name,
          main_api: 'Vehicle',
          api_version: 'v4.1',
          vehicle_category: modelDef.vehicle_category,
          visibility: visibilityTypes.PUBLIC,
          state: 'released',
          brand_id: mahindraBrand._id,
          created_by: userId,
        });
        console.log(`  Created model: Mahindra ${modelDef.name}`);
      }
    }

    // Create or update Base Model for TVS
    await createOrUpdateBaseModel(tvsBrand, userId);
    console.log('  TVS Base Model ensured');

    // Create or update TVS models
    for (const modelDef of TVS_MODELS) {
      // First check if model exists with brand_id
      let existingModel = await Model.findOne({
        name: modelDef.name,
        brand_id: tvsBrand._id,
      });
      
      if (existingModel) {
        console.log(`  Model TVS ${modelDef.name} already exists with brand`);
        continue;
      }
      
      // Check if model exists without brand_id and update it
      existingModel = await Model.findOne({
        name: modelDef.name,
        $or: [{ brand_id: null }, { brand_id: { $exists: false } }],
      });
      
      if (existingModel) {
        existingModel.brand_id = tvsBrand._id;
        await existingModel.save();
        console.log(`  Updated model ${modelDef.name} with TVS brand`);
      } else {
        // Create new model
        await Model.create({
          name: modelDef.name,
          main_api: 'Vehicle',
          api_version: 'v4.1',
          vehicle_category: modelDef.vehicle_category,
          visibility: visibilityTypes.PUBLIC,
          state: 'released',
          brand_id: tvsBrand._id,
          created_by: userId,
        });
        console.log(`  Created model: TVS ${modelDef.name}`);
      }
    }

    // Create or update Base Model for Toyota
    await createOrUpdateBaseModel(toyotaBrand, userId);
    console.log('  Toyota Commercial Vehicles Base Model ensured');

    // Create or update Toyota models
    for (const modelDef of TOYOTA_MODELS) {
      // First check if model exists with brand_id
      let existingModel = await Model.findOne({
        name: modelDef.name,
        brand_id: toyotaBrand._id,
      });
      
      if (existingModel) {
        console.log(`  Model Toyota ${modelDef.name} already exists with brand`);
        continue;
      }
      
      // Check if model exists without brand_id and update it
      existingModel = await Model.findOne({
        name: modelDef.name,
        $or: [{ brand_id: null }, { brand_id: { $exists: false } }],
      });
      
      if (existingModel) {
        existingModel.brand_id = toyotaBrand._id;
        await existingModel.save();
        console.log(`  Updated model ${modelDef.name} with Toyota brand`);
      } else {
        // Create new model
        await Model.create({
          name: modelDef.name,
          main_api: 'Vehicle',
          api_version: 'v4.1',
          vehicle_category: modelDef.vehicle_category,
          visibility: visibilityTypes.PUBLIC,
          state: 'released',
          brand_id: toyotaBrand._id,
          created_by: userId,
        });
        console.log(`  Created model: Toyota ${modelDef.name}`);
      }
    }

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

seedBrands();
