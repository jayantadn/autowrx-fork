// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { FC } from 'react'
import DaTabItem from '@/components/atoms/DaTabItem'
import { useParams } from 'react-router-dom'
import {
  TbCode,
  TbGauge,
  TbMapPin,
  TbRoute,
  TbRobot,
} from 'react-icons/tb'
import { TabConfig } from '@/components/organisms/CustomTabEditor'
import { MdOutlineDoubleArrow } from 'react-icons/md';

interface PrototypeTabsProps {
  tabs?: TabConfig[]
}

// Default builtin tabs
const DEFAULT_BUILTIN_TABS: TabConfig[] = [
  { type: 'builtin', key: 'overview', label: 'Overview' },
  { type: 'builtin', key: 'journey', label: 'Customer Journey' },
  { type: 'builtin', key: 'code', label: 'SDV Code' },
  { type: 'builtin', key: 'ai', label: 'SDV Copilot' },
  { type: 'builtin', key: 'dashboard', label: 'Dashboard' },
]

// Insert any DEFAULT_BUILTIN_TABS that are missing from `tabs` (matched by key),
// preserving user ordering, labels and hidden flags of existing tabs.
// Missing builtins are inserted right after the last preceding builtin that
// already exists, so they stay grouped with other builtins instead of landing
// after custom plugin tabs.
const ensureDefaultBuiltins = (tabs: TabConfig[]): TabConfig[] => {
  const presentKeys = new Set(
    tabs.filter(t => t.type === 'builtin' && t.key).map(t => t.key as string),
  )
  const missing = DEFAULT_BUILTIN_TABS.filter(
    d => d.key && !presentKeys.has(d.key),
  )
  if (missing.length === 0) return tabs

  const result = [...tabs]
  for (const def of missing) {
    // Find the previous builtin in DEFAULT_BUILTIN_TABS that already exists in result.
    const defIdx = DEFAULT_BUILTIN_TABS.findIndex(d => d.key === def.key)
    let insertAt = result.length
    for (let i = defIdx - 1; i >= 0; i--) {
      const prevKey = DEFAULT_BUILTIN_TABS[i].key
      const idx = result.findIndex(
        t => t.type === 'builtin' && t.key === prevKey,
      )
      if (idx !== -1) {
        insertAt = idx + 1
        break
      }
    }
    if (insertAt === result.length) {
      // No earlier builtin found; insert before the first custom tab so
      // builtins remain grouped at the start.
      const firstCustom = result.findIndex(t => t.type === 'custom')
      if (firstCustom !== -1) insertAt = firstCustom
    }
    result.splice(insertAt, 0, def)
  }
  return result
}

// Migration helper: convert old format to new format
export const migrateTabConfig = (oldTabs?: Array<{ label: string; plugin: string }>): TabConfig[] => {
  if (!oldTabs || oldTabs.length === 0) {
    return DEFAULT_BUILTIN_TABS
  }

  // Check if it's already in new format (has 'type' property)
  const firstTab = oldTabs[0] as any
  if (firstTab && 'type' in firstTab) {
    // Tabs were saved before newer builtin tabs (e.g. "ai") were introduced;
    // backfill any default builtins that are missing so they appear for
    // existing prototypes/templates.
    return ensureDefaultBuiltins(oldTabs as TabConfig[])
  }

  // Old format: prepend default builtin tabs
  const customTabs: TabConfig[] = oldTabs.map(tab => ({
    type: 'custom',
    label: tab.label,
    plugin: tab.plugin,
  }))

  return [...DEFAULT_BUILTIN_TABS, ...customTabs]
}

// Get tab configuration, applying migration if needed
export const getTabConfig = (tabs?: any[]): TabConfig[] => {
  return migrateTabConfig(tabs)
}

const PrototypeTabs: FC<PrototypeTabsProps> = ({ tabs }) => {
  const { model_id, prototype_id, tab } = useParams()

  // Get tabs with migration
  const tabConfigs = getTabConfig(tabs)

  // Filter out hidden tabs
  const visibleTabs = tabConfigs.filter(t => !t.hidden)

  return (
    <>
      {visibleTabs.map((tabConfig, index) => {
        if (tabConfig.type === 'builtin') {
          // Render builtin tabs
          const { key, label } = tabConfig
          let route = ''
          let icon = null
          let dataId = ''

          switch (key) {
            case 'overview':
              route = `/model/${model_id}/library/prototype/${prototype_id}/view`
              icon = <TbRoute className="w-5 h-5 mr-2" />
              break
            case 'journey':
              route = `/model/${model_id}/library/prototype/${prototype_id}/journey`
              icon = <TbMapPin className="w-5 h-5 mr-2" />
              dataId = 'tab-journey'
              break
            case 'code':
              route = `/model/${model_id}/library/prototype/${prototype_id}/code`
              icon = <TbCode className="w-5 h-5 mr-2" />
              dataId = 'tab-code'
              break
            case 'ai':
              route = `/model/${model_id}/library/prototype/${prototype_id}/ai`
              icon = <TbRobot className="w-5 h-5 mr-2" />
              dataId = 'tab-ai'
              break
            case 'dashboard':
              route = `/model/${model_id}/library/prototype/${prototype_id}/dashboard`
              icon = <TbGauge className="w-5 h-5 mr-2" />
              dataId = 'tab-dashboard'
              break
            default:
              return null
          }

          // Determine if tab is active
          const isActive =
            (key === 'overview' && (!tab || tab === 'view')) ||
            (tab === key)

          return (
            <DaTabItem
              key={`builtin-${key}`}
              active={isActive}
              to={route}
              dataId={dataId}
            >
              {icon}
              {label}
            </DaTabItem>
          )
        } else {
          // Render custom tabs
          const { label, plugin } = tabConfig
          const isActive = tab === 'plug' && window.location.search.includes(`plugid=${plugin}`)

          return (
            <DaTabItem
              key={`custom-${plugin}-${index}`}
              active={isActive}
              to={`/model/${model_id}/library/prototype/${prototype_id}/plug?plugid=${plugin}`}
            >
              {label}
            </DaTabItem>
          )
        }
      })}
    </>
  )
}

export default PrototypeTabs

