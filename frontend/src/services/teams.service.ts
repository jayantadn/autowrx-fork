// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { serverAxios } from './base'

export type TeamsMeeting = {
  id: string
  subject?: string | null
  start?: string | null
  end?: string | null
  location?: string | null
  organizer?: {
    name?: string | null
    email?: string | null
  }
  onlineMeeting?: {
    joinUrl?: string | null
  }
  _isMock?: boolean
}

export type NextMeetingResponse = {
  meeting: TeamsMeeting | null
}

export const getNextTeamsMeeting = async (): Promise<NextMeetingResponse> => {
  const { data } = await serverAxios.get<NextMeetingResponse>('/teams/meetings/next')
  return data
}

