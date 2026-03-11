// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Teams Ride Mode Service - Audio-first Teams integration for two-wheelers
// Designed for TVS motorcycles and scooters with Bluetooth connectivity

export type RideMode = 'stopped' | 'city' | 'urban' | 'highway'
export type CallState = 'idle' | 'incoming' | 'connecting' | 'active' | 'on_hold' | 'ended'
export type VoiceCommandType = 'answer' | 'decline' | 'mute' | 'unmute' | 'end' | 'quick_reply' | 'join_meeting'

export interface TeamsCaller {
  id: string
  name: string
  email?: string
  avatar?: string
  title?: string
}

export interface TeamsRideMeeting {
  id: string
  subject: string
  start: string
  end: string
  organizer: TeamsCaller
  attendees: TeamsCaller[]
  isOnlineMeeting: boolean
  joinUrl?: string
  isUrgent?: boolean
  _isMock?: boolean
}

export interface TeamsRideCall {
  id: string
  caller: TeamsCaller
  type: 'incoming' | 'outgoing'
  state: CallState
  startTime?: string
  duration?: number
  isMuted: boolean
  isOnHold: boolean
  _isMock?: boolean
}

export interface QuickResponse {
  id: string
  text: string
  voiceCommand: string
  icon: string
}

export interface RideSafetyConfig {
  mode: RideMode
  speedKmh: number
  canAnswerCalls: boolean
  canJoinMeetings: boolean
  autoDeclineAboveSpeed: number
  autoMuteOnAcceleration: boolean
  vibrationAlerts: boolean
  audioAnnouncementsEnabled: boolean
}

export interface VoiceCommand {
  command: string
  action: VoiceCommandType
  payload?: string
}

export interface CallQueueItem {
  id: string
  caller: TeamsCaller
  timestamp: string
  type: 'missed_call' | 'voicemail' | 'message'
  message?: string
}

export interface RideSummary {
  rideStartTime: string
  rideEndTime: string
  totalCalls: number
  missedCalls: number
  answeredCalls: number
  meetingsJoined: number
  meetingsMissed: number
  totalTalkTime: number
  quickRepliesSent: number
}

// Mock data for demo
const MOCK_CALLERS: TeamsCaller[] = [
  { id: '1', name: 'Rajesh Kumar', email: 'rajesh.kumar@tvs.com', title: 'Engineering Manager' },
  { id: '2', name: 'Priya Sharma', email: 'priya.sharma@tvs.com', title: 'Product Lead' },
  { id: '3', name: 'Amit Patel', email: 'amit.patel@tvs.com', title: 'Team Lead' },
  { id: '4', name: 'Sneha Reddy', email: 'sneha.reddy@tvs.com', title: 'Software Engineer' },
  { id: '5', name: 'Vikram Singh', email: 'vikram.singh@tvs.com', title: 'CTO' },
]

const MOCK_MEETINGS: TeamsRideMeeting[] = [
  {
    id: 'm1',
    subject: 'Sprint Planning - Connected Vehicles',
    start: new Date(Date.now() + 15 * 60000).toISOString(),
    end: new Date(Date.now() + 75 * 60000).toISOString(),
    organizer: MOCK_CALLERS[1],
    attendees: [MOCK_CALLERS[0], MOCK_CALLERS[2], MOCK_CALLERS[3]],
    isOnlineMeeting: true,
    joinUrl: 'https://teams.microsoft.com/l/meetup-join/mock',
    _isMock: true,
  },
  {
    id: 'm2',
    subject: 'TVS SmartXonnect Review',
    start: new Date(Date.now() + 120 * 60000).toISOString(),
    end: new Date(Date.now() + 180 * 60000).toISOString(),
    organizer: MOCK_CALLERS[4],
    attendees: [MOCK_CALLERS[0], MOCK_CALLERS[1]],
    isOnlineMeeting: true,
    joinUrl: 'https://teams.microsoft.com/l/meetup-join/mock2',
    isUrgent: true,
    _isMock: true,
  },
]

const QUICK_RESPONSES: QuickResponse[] = [
  { id: 'qr1', text: "I'm riding, will call back soon", voiceCommand: 'riding', icon: '🏍️' },
  { id: 'qr2', text: 'In traffic, give me 10 minutes', voiceCommand: 'traffic', icon: '🚦' },
  { id: 'qr3', text: "On my way, ETA 15 minutes", voiceCommand: 'coming', icon: '📍' },
  { id: 'qr4', text: 'Will join meeting when I stop', voiceCommand: 'joining soon', icon: '📅' },
  { id: 'qr5', text: 'Emergency - call me back', voiceCommand: 'urgent', icon: '🚨' },
  { id: 'qr6', text: 'Available now, go ahead', voiceCommand: 'available', icon: '✅' },
]

const VOICE_COMMANDS: VoiceCommand[] = [
  { command: 'Hey TVS, answer call', action: 'answer' },
  { command: 'Hey TVS, decline call', action: 'decline' },
  { command: 'Hey TVS, mute', action: 'mute' },
  { command: 'Hey TVS, unmute', action: 'unmute' },
  { command: 'Hey TVS, end call', action: 'end' },
  { command: 'Hey TVS, join meeting', action: 'join_meeting' },
  { command: "Hey TVS, I'm riding", action: 'quick_reply', payload: 'qr1' },
  { command: 'Hey TVS, in traffic', action: 'quick_reply', payload: 'qr2' },
  { command: "Hey TVS, I'm coming", action: 'quick_reply', payload: 'qr3' },
]

export function getRideModeFromSpeed(speedKmh: number): RideMode {
  if (speedKmh <= 0) return 'stopped'
  if (speedKmh <= 30) return 'city'
  if (speedKmh <= 60) return 'urban'
  return 'highway'
}

export function getRideSafetyConfig(speedKmh: number): RideSafetyConfig {
  const mode = getRideModeFromSpeed(speedKmh)
  
  return {
    mode,
    speedKmh,
    canAnswerCalls: mode !== 'highway',
    canJoinMeetings: mode === 'stopped',
    autoDeclineAboveSpeed: 80,
    autoMuteOnAcceleration: true,
    vibrationAlerts: true,
    audioAnnouncementsEnabled: true,
  }
}

export function getMockMeetings(): TeamsRideMeeting[] {
  return MOCK_MEETINGS.map(m => ({
    ...m,
    start: new Date(Date.now() + 15 * 60000).toISOString(),
    end: new Date(Date.now() + 75 * 60000).toISOString(),
  }))
}

export function getMockNextMeeting(): TeamsRideMeeting | null {
  const meetings = getMockMeetings()
  return meetings.length > 0 ? meetings[0] : null
}

export function getMockIncomingCall(): TeamsRideCall {
  const randomCaller = MOCK_CALLERS[Math.floor(Math.random() * MOCK_CALLERS.length)]
  return {
    id: `call-${Date.now()}`,
    caller: randomCaller,
    type: 'incoming',
    state: 'incoming',
    isMuted: false,
    isOnHold: false,
    _isMock: true,
  }
}

export function getQuickResponses(): QuickResponse[] {
  return QUICK_RESPONSES
}

export function getVoiceCommands(): VoiceCommand[] {
  return VOICE_COMMANDS
}

export function getMockCallQueue(): CallQueueItem[] {
  return [
    {
      id: 'cq1',
      caller: MOCK_CALLERS[0],
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      type: 'missed_call',
    },
    {
      id: 'cq2',
      caller: MOCK_CALLERS[2],
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      type: 'voicemail',
      message: 'Please call back regarding the project update.',
    },
  ]
}

export function getMockRideSummary(): RideSummary {
  return {
    rideStartTime: new Date(Date.now() - 45 * 60000).toISOString(),
    rideEndTime: new Date().toISOString(),
    totalCalls: 5,
    missedCalls: 2,
    answeredCalls: 3,
    meetingsJoined: 1,
    meetingsMissed: 1,
    totalTalkTime: 720,
    quickRepliesSent: 4,
  }
}

export function formatTimeUntil(isoDate: string): string {
  const now = new Date()
  const target = new Date(isoDate)
  const diffMs = target.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Now'
  
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins} min`
  
  const diffHours = Math.floor(diffMins / 60)
  const remainingMins = diffMins % 60
  return `${diffHours}h ${remainingMins}m`
}

export function generateAudioAnnouncement(type: 'meeting' | 'call' | 'summary', data: unknown): string {
  switch (type) {
    case 'meeting': {
      const meeting = data as TeamsRideMeeting
      const timeUntil = formatTimeUntil(meeting.start)
      return `You have a meeting "${meeting.subject}" with ${meeting.organizer.name} in ${timeUntil}. Say "Hey , join meeting" when you're ready.`
    }
    case 'call': {
      const call = data as TeamsRideCall
      return `Incoming call from ${call.caller.name}${call.caller.title ? `, ${call.caller.title}` : ''}. Say "Hey , answer call" or "Hey , decline call".`
    }
    case 'summary': {
      const summary = data as RideSummary
      return `Ride complete. You had ${summary.totalCalls} calls, ${summary.missedCalls} missed. ${summary.meetingsJoined} meetings joined. Total talk time: ${Math.floor(summary.totalTalkTime / 60)} minutes.`
    }
    default:
      return ''
  }
}

export function getRideModeDescription(mode: RideMode): string {
  switch (mode) {
    case 'stopped':
      return 'Full access - Join meetings, make/receive calls'
    case 'city':
      return 'Active mode - Answer calls, voice responses enabled'
    case 'urban':
      return 'Limited mode - Audio only, quick responses available'
    case 'highway':
      return 'Safe mode - Emergency calls only, others queued'
  }
}

export function getRideModeColor(mode: RideMode): string {
  switch (mode) {
    case 'stopped':
      return '#22c55e'
    case 'city':
      return '#3b82f6'
    case 'urban':
      return '#f59e0b'
    case 'highway':
      return '#ef4444'
  }
}
