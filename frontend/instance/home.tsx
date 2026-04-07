// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { TbExternalLink } from 'react-icons/tb'
import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import DaRequireSignedIn from '@/components/molecules/DaRequireSignedIn'
import DisabledLink from '@/components/molecules/DaDisableLink'
import { getNextTeamsMeeting, NextMeetingResponse } from '@/services/teams.service'

const TeamsMeetingWidget = () => {
  const [meeting, setMeeting] = useState<NextMeetingResponse['meeting'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await getNextTeamsMeeting()
        if (!cancelled) {
          setMeeting(data.meeting || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load Teams meetings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your next Teams meeting…</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!meeting) {
    return <p className="text-sm text-muted-foreground">No upcoming Teams meetings found.</p>
  }

  const startTime = meeting.start ? new Date(meeting.start).toLocaleString() : 'Unknown start time'

  return (
    <div className="flex flex-col space-y-2">
      <div>
        <p className="font-medium text-sm">{meeting.subject || 'Upcoming meeting'}</p>
        <p className="text-xs text-muted-foreground">{startTime}</p>
        {meeting.organizer?.name && (
          <p className="text-xs text-muted-foreground mt-1">
            Organizer: {meeting.organizer.name}
          </p>
        )}
      </div>
      {meeting.onlineMeeting?.joinUrl && (
        <Button size="sm" asChild data-id="btn-join-teams-meeting" className="w-32">
          <a
            href={meeting.onlineMeeting.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center"
          >
            Join in Teams
          </a>
        </Button>
      )}
    </div>
  )
}

const home = [
  {
    type: 'hero',
    title: 'Welcome to the digital.auto Playground for Virtual Exploration!',
    description: `To support shift-left testing for software-defined vehicle (SDV) applications, we've created the digital.auto Playground—a cloud-based environment designed for rapid prototyping of new SDV-enabled features. Prototypes are developed against real-world vehicle APIs and can seamlessly transition to automotive runtimes, such as Eclipse Velocitas. The playground is open and free to use.`,
    image: '/imgs/autowrx-bg.jpg',
  },
  {
    type: 'feature-list',
    items: [
      {
        title: 'Overview',
        description:
          'Get an overview of the cloud-based prototyping environment for SDV functions.',
        children: (
          <Button size="sm" data-id="btn-launch-graphic" asChild>
            <a
              href="https://docs.digital.auto/basics/overview/"
              target="_blank"
              className="flex items-center"
            >
              <TbExternalLink className="size-4 mr-1" />
              Graphic
            </a>
          </Button>
        ),
      },
      {
        title: 'Get Started',
        description:
          'Learn about creating efficient SDV applications, using Python and Vehicle API',
        children: (
          <div className="flex space-x-2 items-center mt-4">
            <Button size="sm" data-id="btn-launch-documentation" asChild>
              <a
                href="https://docs.digital.auto/basics/play/"
                target="_blank"
                className="flex items-center"
              >
                <TbExternalLink className="size-4 mr-1" />
                Documentation
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-id="btn-launch-video"
              asChild
            >
              <a
                href="https://www.youtube.com/@sdvpg"
                target="_blank"
                className="flex items-center"
              >
                <TbExternalLink className="size-4 mr-1" />
                Video
              </a>
            </Button>
          </div>
        ),
      },
      {
        title: 'Vehicle Catalog',
        description:
          'Create a model to start building new connected vehicle app prototypes.',
        children: (
          <DaRequireSignedIn message="You must first sign in to explore vehicle models and prototypes">
            <Button size="sm" className="mt-4 w-32" asChild>
              <DisabledLink
                to="/model"
                dataId="btn-launch-vehicle-models"
                className="flex items-center"
              >
                Vehicle Models
              </DisabledLink>
            </Button>
          </DaRequireSignedIn>
        ),
      },
      {
        title: 'Microsoft Teams',
        description:
          'See your next Microsoft Teams meeting and quickly join from the playground.',
        children: (
          <DaRequireSignedIn message="You must first sign in to view your Teams meetings">
            <div className="mt-4">
              <TeamsMeetingWidget />
            </div>
          </DaRequireSignedIn>
        ),
      },
    ],
  },
 
  {
    type: 'recent',
    title: 'Recent Prototypes',
  },
  {
    type: 'popular',
    title: 'Popular Prototypes',
  },
  {
    type: 'partner-list',
    items: [
      {
        title: 'Industry Partners',
        items: [
          {
            name: 'Bosch',
            img: '/imgs/partners/bosch.png',
            url: 'https://www.bosch.com/',
          },
          {
            name: 'Microsoft',
            img: '/imgs/partners/microsoft-logo-4.png',
            url: 'https://www.microsoft.com/en-in',
          },
        ],
      },
      
    ],
  },
  
]

export default home
