// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import { serverAxios } from './base'
import { Brand } from '@/types/brand.type'

export const listBrands = async (): Promise<Brand[]> => {
  const { data } = await serverAxios.get<Brand[]>('/brands')
  return Array.isArray(data) ? data : []
}

export const getBrand = async (id: string): Promise<Brand> => {
  const { data } = await serverAxios.get<Brand>(`/brands/${id}`)
  return data
}
