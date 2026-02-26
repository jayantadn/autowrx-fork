// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

const httpStatus = require('http-status');
const { Brand } = require('../models');
const ApiError = require('../utils/ApiError');

const create = async (body) => {
  return Brand.create(body);
};

const query = async (filter, options) => {
  return Brand.paginate(filter, options);
};

const getById = async (id) => Brand.findById(id);

const listAll = async () => {
  const brands = await Brand.find({}).sort({ name: 1 }).lean();
  return brands.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
};

const updateById = async (id, updateBody) => {
  const doc = await getById(id);
  if (!doc) throw new ApiError(httpStatus.NOT_FOUND, 'Brand not found');
  Object.assign(doc, updateBody);
  await doc.save();
  return doc;
};

const removeById = async (id) => {
  const doc = await getById(id);
  if (!doc) throw new ApiError(httpStatus.NOT_FOUND, 'Brand not found');
  await doc.deleteOne();
  return doc;
};

module.exports = { create, query, getById, listAll, updateById, removeById };
