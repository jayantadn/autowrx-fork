// Copyright (c) 2025 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { checkPermissionService } from '@/services/permission.service.ts'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '@/stores/authStore.ts'

const usePermissionHook = (...params: [string, string?][]) => {
  const accessToken = useAuthStore((state) => state.access?.token)

  const { data } = useQuery({
    queryKey: ['permissions', params],
    queryFn: () => checkPermissionService(params),
    enabled: Boolean(accessToken),
    retry: false,
    refetchOnWindowFocus: false,
  })

  return data || Array(params.length).fill(false)
}

export default usePermissionHook
