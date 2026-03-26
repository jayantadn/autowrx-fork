// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { getNextTeamsMeeting, type TeamsMeeting } from '@/services/teams.service'
import type { PluginAPI } from '@/types/plugin.types'
import useRuntimeStore from '@/stores/runtimeStore'
import { TbSteeringWheel, TbUsers, TbVideo, TbVideoOff, TbMicrophone } from 'react-icons/tb'

type UserMode = 'driver' | 'passenger'

interface TeamsPluginContentProps {
  data?: {
    model?: { id?: string; name?: string }
    prototype?: { id?: string; name?: string }
  }
  config?: { plugin_id?: string }
  api?: PluginAPI
}

/**
 * Built-in Microsoft Teams plugin content.
 * Renders next meeting and join button; receives data (model, prototype) and api
 * so it can be used as a feature to test per car model during simulation.
 * 
 * Media capabilities based on user mode:
 * - Driver + Parked: Video + Audio
 * - Driver + Moving: Audio only (safety)
 * - Passenger: Video + Audio always
 */
export default function TeamsPluginContent({ data, api }: TeamsPluginContentProps) {
  const [meeting, setMeeting] = useState<TeamsMeeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userMode, setUserMode] = useState<UserMode>('driver')

  const apisValue = useRuntimeStore((state) => state.apisValue)
  // Vehicle.Speed (sensor)
  const speedFromSensor = parseFloat(apisValue?.['Vehicle.Speed'] ?? '0') || 0
  // Low Beam Light as proxy: ON = moving (60), OFF = parked (0)
  const lightsOn = apisValue?.['Vehicle.Body.Lights.Beam.Low.IsOn']
  const speedFromLights = (lightsOn === true || lightsOn === 'true' || lightsOn === 1) ? 60 : 0
  // Use sensor if available, otherwise use lights proxy
  const vehicleSpeed = speedFromSensor > 0 ? speedFromSensor : speedFromLights
  const isMoving = vehicleSpeed > 5

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const result = await getNextTeamsMeeting()
        if (!cancelled) setMeeting(result.meeting || null)
      } catch {
        if (!cancelled) setError('Unable to load Teams meetings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const modelName = data?.model?.name
  const prototypeName = data?.prototype?.name

  const getMediaCapabilities = () => {
    if (userMode === 'passenger') {
      return { video: true, audio: true }
    }
    if (isMoving) {
      return { video: false, audio: true }
    }
    return { video: true, audio: true }
  }

  const media = getMediaCapabilities()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-muted-foreground">Loading your next Teams meeting…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  const startTime = meeting?.start ? new Date(meeting.start).toLocaleString() : 'Unknown start time'
  const isMock = meeting?._isMock
  const joinUrl = meeting?.onlineMeeting?.joinUrl

  return (
    <div className="flex flex-col p-6 gap-4 max-w-lg">
      {isMock && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-xs text-amber-800 font-medium">Demo Mode</p>
          <p className="text-xs text-amber-700">
            Showing mock data. Configure MS_GRAPH_* env vars and sign in for real Teams data.
          </p>
        </div>
      )}

      {prototypeName && (
        <p className="text-xs text-muted-foreground">
          Testing Teams · {prototypeName}{modelName ? ` · ${modelName}` : ''}
        </p>
      )}

      {/* User Mode Toggle */}
      <div className="flex rounded-lg border bg-muted/30 p-1">
        <button
          onClick={() => setUserMode('driver')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            userMode === 'driver'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TbSteeringWheel className="size-4" />
          Driver
        </button>
        <button
          onClick={() => setUserMode('passenger')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            userMode === 'passenger'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TbUsers className="size-4" />
          Passenger
        </button>
      </div>

      {/* Vehicle Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
        isMoving ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isMoving ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
        }`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${isMoving ? 'text-orange-800' : 'text-green-800'}`}>
            {isMoving ? 'Vehicle in Motion' : 'Vehicle Parked'}
          </p>
          <p className={`text-xs ${isMoving ? 'text-orange-600' : 'text-green-600'}`}>
            {vehicleSpeed.toFixed(0)} km/h
          </p>
        </div>
      </div>

      {/* Media Capabilities */}
      <div className="flex items-center justify-center gap-6 py-2">
        <div className={`flex items-center gap-2 text-sm ${media.video ? 'text-green-600' : 'text-muted-foreground'}`}>
          {media.video ? <TbVideo className="size-5" /> : <TbVideoOff className="size-5" />}
          <span>Video {media.video ? 'ON' : 'OFF'}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${media.audio ? 'text-green-600' : 'text-muted-foreground'}`}>
          <TbMicrophone className="size-5" />
          <span>Audio {media.audio ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* Mode explanation */}
      <p className="text-xs text-center text-muted-foreground">
        {userMode === 'driver' && isMoving
          ? 'For safety, video is disabled while driving. Audio-only meeting available.'
          : userMode === 'passenger'
            ? 'Passenger mode: Full video and audio access regardless of vehicle state.'
            : 'Vehicle is parked. Full video and audio access available.'
        }
      </p>

      {!meeting ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No upcoming Teams meetings found.</p>
        </div>
      ) : (
        <>
          {/* Meeting Info */}
          <div className="border rounded-lg p-4 bg-background">
            <p className="font-medium text-base">{meeting.subject || 'Upcoming meeting'}</p>
            <p className="text-sm text-muted-foreground mt-1">{startTime}</p>
            {meeting.organizer?.name && (
              <p className="text-xs text-muted-foreground mt-2">
                Organizer: {meeting.organizer.name}
              </p>
            )}
          </div>

          {/* Join Buttons */}
          {joinUrl && (
            <div className="flex gap-3">
              {media.video && (
                <Button asChild className="flex-1" data-id="btn-join-teams-video">
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <TbVideo className="size-4" />
                    Join with Video
                  </a>
                </Button>
              )}
              {media.audio && (
                <Button
                  asChild
                  variant={media.video ? 'outline' : 'default'}
                  className="flex-1"
                  data-id="btn-join-teams-audio"
                >
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <TbMicrophone className="size-4" />
                    {media.video ? 'Audio Only' : 'Join with Audio'}
                  </a>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}