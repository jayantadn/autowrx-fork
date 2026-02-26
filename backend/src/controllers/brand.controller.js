// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

const httpStatus = require('http-status');
const { brandService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');

const createBrand = catchAsync(async (req, res) => {
  const body = { ...req.body, created_by: req.user?.id };
  const brand = await brandService.create(body);
  res.status(httpStatus.CREATED).send(brand);
});

const listBrands = catchAsync(async (req, res) => {
  const brands = await brandService.listAll();
  res.json(brands);
});

const getBrand = catchAsync(async (req, res) => {
  const brand = await brandService.getById(req.params.id);
  if (!brand) {
    return res.status(httpStatus.NOT_FOUND).json({ message: 'Brand not found' });
  }
  res.json(brand);
});

const updateBrand = catchAsync(async (req, res) => {
  const brand = await brandService.updateById(req.params.id, req.body);
  res.json(brand);
});

const deleteBrand = catchAsync(async (req, res) => {
  await brandService.removeById(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createBrand,
  listBrands,
  getBrand,
  updateBrand,
  deleteBrand,
};
