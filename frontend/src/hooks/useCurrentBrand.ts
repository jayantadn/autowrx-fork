// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { useQuery } from '@tanstack/react-query'
import { Brand } from '@/types/brand.type'
import { getBrand } from '@/services/brand.service'
import useCurrentModel from './useCurrentModel'

const useCurrentBrand = () => {
  const { data: model } = useCurrentModel()
  const brandId = model?.brand_id

  return useQuery<Brand>({
    queryKey: ['brand', brandId],
    queryFn: () => getBrand(brandId!),
    enabled: !!brandId,
  })
}

export default useCurrentBrand
