// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

const express = require('express');
const validate = require('../../../middlewares/validate');
const brandValidation = require('../../../validations/brand.validation');
const { brandController } = require('../../../controllers');
const auth = require('../../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(auth({ optional: true }), brandController.listBrands)
  .post(auth(), validate(brandValidation.createBrand), brandController.createBrand);

router
  .route('/:id')
  .get(auth({ optional: true }), validate(brandValidation.getBrand), brandController.getBrand)
  .patch(
    auth(),
    validate(brandValidation.updateBrand),
    brandController.updateBrand
  )
  .delete(
    auth(),
    validate(brandValidation.deleteBrand),
    brandController.deleteBrand
  );

module.exports = router;
