require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Model, Prototype, Brand } = require('../models');

async function findTeamsPrototype() {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  
  // Find TVS brand
  const tvsBrand = await Brand.findOne({ name: 'TVS' });
  console.log('TVS Brand:', tvsBrand ? tvsBrand._id : 'Not found');
  
  if (!tvsBrand) {
    console.log('TVS brand not found');
    await mongoose.disconnect();
    return;
  }
  
  // Find models under TVS brand
  const tvsModels = await Model.find({ brand_id: tvsBrand._id });
  console.log('TVS Models:', tvsModels.map(m => ({ id: String(m._id), name: m.name, visibility: m.visibility })));
  
  // Find all prototypes in TVS models
  const allPrototypes = await Prototype.find({
    model_id: { $in: tvsModels.map(m => m._id) }
  }).select('name model_id state executed_turns image_file');
  
  console.log('\nPrototypes in TVS models:');
  allPrototypes.forEach(p => {
    console.log(`- ${p.name} (ID: ${p._id}, state: ${p.state}, turns: ${p.executed_turns})`);
  });
  
  // Also search for any prototype with "Teams" in the name
  const teamsPrototypes = await Prototype.find({
    name: { $regex: /teams/i }
  }).select('name model_id state executed_turns');
  
  console.log('\nAll prototypes with "Teams" in name:');
  teamsPrototypes.forEach(p => {
    console.log(`- ${p.name} (ID: ${p._id}, state: ${p.state}, turns: ${p.executed_turns})`);
  });
  
  await mongoose.disconnect();
}

findTeamsPrototype();
