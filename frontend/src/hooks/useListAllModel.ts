// Copyright (c) 2025 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// useListAllModels.ts
import { useQuery } from '@tanstack/react-query'
import { listAllModels } from '@/services/model.service'
import useSelfProfileQuery from './useSelfProfile'

const useListAllModels = (brandId?: string | null) => {
  const { data: self } = useSelfProfileQuery()

  return useQuery({
    // Include user ID and brand filter in query key
    queryKey: ['listAllModels', self?.id || 'anonymous', brandId || 'all'],
    queryFn: () => {
      // Always pass brand_id to ensure filtering
      return listAllModels(brandId ? { brand_id: brandId } : undefined)
    },
    // Only fetch when brandId is provided to avoid fetching all models
    enabled: !!brandId,
    // Don't use stale data when switching brands
    staleTime: 0,
    // Don't retry on 401 errors for unauthenticated users - this is expected
    retry: (failureCount, error: any) => {
      // If it's a 401 and we don't have a user, don't retry (expected for public access)
      if (error?.response?.status === 401 && !self) {
        return false
      }
      // Otherwise use default retry logic
      return failureCount <= 1
    },
  })
}

export default useListAllModels
