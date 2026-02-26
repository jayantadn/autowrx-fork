// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createBrand = {
  body: Joi.object().keys({
    name: Joi.string().required().max(255).trim(),
    description: Joi.string().allow('').trim(),
    logo_url: Joi.string().allow('').trim(),
  }),
};

const updateBrand = {
  body: Joi.object()
    .keys({
      name: Joi.string().max(255).trim(),
      description: Joi.string().allow('').trim(),
      logo_url: Joi.string().allow('').trim(),
    })
    .min(1),
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const getBrand = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const deleteBrand = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createBrand,
  updateBrand,
  getBrand,
  deleteBrand,
};
