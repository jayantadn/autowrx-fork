// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { useState, useEffect } from 'react'
import { HomePartners } from '@/components/organisms/HomePartners'
import HomeHeroSection from '@/components/organisms/HomeHeroSection'
import HomeFeatureList from '@/components/organisms/HomeFeatureList'
import HomeButtonList from '@/components/organisms/HomeButtonList'
import HomePrototypeRecent from '@/components/organisms/HomePrototypeRecent'
import HomePrototypePopular from '@/components/organisms/HomePrototypePopular'
import HomeNews from '@/components/organisms/HomeNews'
import { configManagementService } from '@/services/configManagement.service'
import { Spinner } from '@/components/atoms/spinner'
import HomeFooterSection from '@/components/organisms/HomeFooterSection'
import useAuthStore from '@/stores/authStore'

const PageHome = () => {
  const [homeElements, setHomeElements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const access = useAuthStore((state) => state.access)
  const isLoggedIn = !!access

  useEffect(() => {
    const loadHomeConfig = async () => {
      try {
        setIsLoading(true)
        const res = await configManagementService.getPublicConfig('CFG_HOME_CONTENT', 'site')

        if (res.value && Array.isArray(res.value)) {
          setHomeElements(res.value)
        }
      } catch (err) {
        console.error('Failed to load home config:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadHomeConfig()
  }, [])

  const filteredElements = isLoggedIn
    ? homeElements.map((element) => {
        if (element.type === 'feature-list' && element.items) {
          return {
            ...element,
            items: element.items
              .filter((item: any) => item.title !== 'Overview' && item.title !== 'Get Started')
              .concat([{
                title: 'Plugin',
                description: 'Create and manage plugins to extend the platform functionality',
                url: '/plugins',
                buttons: [{ title: 'Go to Plugins', url: '/plugins' }]
              }])
          }
        }
        return element
      })
    : homeElements

  const getComponent = (elementType: string) => {
    switch (elementType) {
      case 'hero':
        return HomeHeroSection
      case 'feature-list':
        return HomeFeatureList
      case 'button-list':
        return HomeButtonList
      case 'news':
        return HomeNews
      case 'recent':
        return HomePrototypeRecent
      case 'popular':
        return HomePrototypePopular
      case 'partner-list':
        return HomePartners
      case 'home-footer':
        return HomeFooterSection
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {filteredElements.map((element, index) => {
        const Component = getComponent(element.type) as any
        if (!Component) return null
        return <Component key={index} {...element} />
      })}
    </div>
  )
}

export default PageHome
