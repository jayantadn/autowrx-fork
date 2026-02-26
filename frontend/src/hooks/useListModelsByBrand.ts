// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import { useQuery } from '@tanstack/react-query'
import { listModelsLite } from '@/services/model.service'
import { ModelLite } from '@/types/model.type'

interface UseListModelsByBrandResult {
  data: { results: ModelLite[] } | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

const useListModelsByBrand = (brandId: string | null): UseListModelsByBrandResult => {
  return useQuery({
    queryKey: ['modelsByBrand', brandId],
    queryFn: () => listModelsLite({ brand_id: brandId! }),
    enabled: !!brandId,
  })
}

export default useListModelsByBrand
