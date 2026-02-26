// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import { useQuery } from '@tanstack/react-query'
import { listBrands } from '@/services/brand.service'

const useListBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: listBrands,
  })
}

export default useListBrands
