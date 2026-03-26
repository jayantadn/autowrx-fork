// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Teams Ride Mode Plugin - Audio-first Teams integration for TVS two-wheelers

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/atoms/button'
import type { PluginAPI } from '@/types/plugin.types'
import useRuntimeStore from '@/stores/runtimeStore'
import {
  TbMicrophone,
  TbMicrophoneOff,
  TbPhone,
  TbPhoneOff,
  TbCalendar,
  TbHelmet,
  TbUsers,
  TbVolume,
  TbVolumeOff,
  TbCommand,
} from 'react-icons/tb'
import VoiceCommandSimulator, { type VoiceCommand } from './VoiceCommandSimulator'
import {
  getMockNextMeeting,
  getMockIncomingCall,
  getQuickResponses,
  getMockCallQueue,
  getRideModeFromSpeed,
  getRideSafetyConfig,
  getRideModeColor,
  getRideModeDescription,
  formatTimeUntil,
  generateAudioAnnouncement,
  type TeamsRideMeeting,
  type TeamsRideCall,
  type QuickResponse,
  type CallQueueItem,
  type RideMode,
} from '@/services/teamsRide.service'

interface TeamsRidePluginContentProps {
  data?: {
    model?: { id?: string; name?: string }
    prototype?: { id?: string; name?: string }
  }
  config?: { plugin_id?: string }
  api?: PluginAPI
}

type CallState = 'idle' | 'incoming' | 'connecting' | 'active'

export default function TeamsRidePluginContent({ data }: TeamsRidePluginContentProps) {
  const [meeting, setMeeting] = useState<TeamsRideMeeting | null>(null)
  const [callState, setCallState] = useState<CallState>('idle')
  const [incomingCall, setIncomingCall] = useState<TeamsRideCall | null>(null)
  const [activeCall, setActiveCall] = useState<TeamsRideCall | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [quickResponses] = useState<QuickResponse[]>(getQuickResponses())
  const [callQueue] = useState<CallQueueItem[]>(getMockCallQueue())
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [lastAnnouncement, setLastAnnouncement] = useState('')
  const [showVoiceSimulator, setShowVoiceSimulator] = useState(false)

  const apisValue = useRuntimeStore((state) => state.apisValue)
  const vehicleSpeed = parseFloat(apisValue?.['Vehicle.Speed'] ?? '0') || 0
  const rideMode: RideMode = getRideModeFromSpeed(vehicleSpeed)
  const safetyConfig = getRideSafetyConfig(vehicleSpeed)
  const modeColor = getRideModeColor(rideMode)

  useEffect(() => {
    const mockMeeting = getMockNextMeeting()
    setMeeting(mockMeeting)
  }, [])

  useEffect(() => {
    if (callState !== 'active') return
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [callState])

  useEffect(() => {
    if (meeting && audioEnabled) {
      const announcement = generateAudioAnnouncement('meeting', meeting)
      setLastAnnouncement(announcement)
    }
  }, [meeting, audioEnabled])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const simulateIncomingCall = useCallback(() => {
    const call = getMockIncomingCall()
    setIncomingCall(call)
    setCallState('incoming')
    if (audioEnabled) {
      const announcement = generateAudioAnnouncement('call', call)
      setLastAnnouncement(announcement)
    }
  }, [audioEnabled])

  const answerCall = useCallback(() => {
    if (!safetyConfig.canAnswerCalls) {
      setLastAnnouncement('Slow down to answer calls safely')
      return
    }
    setActiveCall(incomingCall)
    setIncomingCall(null)
    setCallState('active')
    setCallDuration(0)
  }, [incomingCall, safetyConfig.canAnswerCalls])

  const declineCall = useCallback(() => {
    setIncomingCall(null)
    setCallState('idle')
  }, [])

  const endCall = useCallback(() => {
    setActiveCall(null)
    setCallState('idle')
    setCallDuration(0)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const sendQuickResponse = useCallback((response: QuickResponse) => {
    console.log('Quick response sent:', response.text)
    setLastAnnouncement(`Sent: "${response.text}"`)
  }, [])

  const handleVoiceCommand = useCallback(
    (command: VoiceCommand) => {
      console.log('Voice command received:', command)
      switch (command.action) {
        case 'answer':
          if (callState === 'incoming') {
            answerCall()
            setLastAnnouncement('Voice command: Answering call...')
          }
          break
        case 'decline':
          if (callState === 'incoming') {
            declineCall()
            setLastAnnouncement('Voice command: Call declined')
          }
          break
        case 'mute':
          if (callState === 'active') {
            setIsMuted(true)
            setLastAnnouncement('Voice command: Microphone muted')
          }
          break
        case 'unmute':
          if (callState === 'active') {
            setIsMuted(false)
            setLastAnnouncement('Voice command: Microphone unmuted')
          }
          break
        case 'end':
          if (callState === 'active') {
            endCall()
            setLastAnnouncement('Voice command: Call ended')
          }
          break
        case 'join_meeting':
          if (meeting && safetyConfig.canJoinMeetings) {
            setLastAnnouncement('Voice command: Joining meeting...')
            if (meeting.joinUrl) {
              window.open(meeting.joinUrl, '_blank')
            }
          } else {
            setLastAnnouncement('Cannot join meeting - stop your vehicle first')
          }
          break
        case 'quick_reply':
          const qr = quickResponses.find((r) => r.voiceCommand === command.payload)
          if (qr) {
            sendQuickResponse(qr)
          }
          break
        default:
          setLastAnnouncement('Command not recognized')
      }
      setShowVoiceSimulator(false)
    },
    [callState, answerCall, declineCall, endCall, meeting, safetyConfig.canJoinMeetings, quickResponses, sendQuickResponse]
  )

  const modelName = data?.model?.name
  const prototypeName = data?.prototype?.name

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="flex flex-col h-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-bold text-xs shadow-lg">
            TVS
          </div>
          <div>
            <h1 className="text-sm font-semibold">Teams Ride Mode</h1>
            <p className="text-xs text-white/50">SmartXonnect Audio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded">
            DEMO
          </span>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'
            }`}
          >
            {audioEnabled ? <TbVolume className="size-4" /> : <TbVolumeOff className="size-4" />}
          </button>
        </div>
      </div>

      {prototypeName && (
        <p className="text-xs text-white/40 px-4 pt-2">
          Testing · {prototypeName}
          {modelName ? ` · ${modelName}` : ''}
        </p>
      )}

      {/* Speed & Mode Panel */}
      <div className="flex items-center gap-6 p-4 bg-black/20">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(from 135deg, ${modeColor} 0%, ${modeColor} ${Math.min(
                100,
                (vehicleSpeed / 120) * 75
              )}%, rgba(255,255,255,0.1) ${Math.min(100, (vehicleSpeed / 120) * 75)}%, rgba(255,255,255,0.1) 100%)`,
            }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(vehicleSpeed)}</span>
              <span className="text-[9px] text-white/50 uppercase tracking-wider">km/h</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: modeColor, boxShadow: `0 0 10px ${modeColor}` }}
            />
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: modeColor }}>
              {rideMode}
            </span>
          </div>
          <p className="text-xs text-white/50 mb-2">{getRideModeDescription(rideMode)}</p>
          <div className="flex gap-2">
            <span
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
                safetyConfig.canAnswerCalls ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'
              }`}
            >
              <TbPhone className="size-3" /> Calls
            </span>
            <span
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
                safetyConfig.canJoinMeetings ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'
              }`}
            >
              <TbCalendar className="size-3" /> Meet
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-green-500/15 text-green-400">
              <TbMicrophone className="size-3" /> Voice
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Incoming Call Overlay */}
        {callState === 'incoming' && incomingCall && (
          <div className="fixed inset-0 z-50 bg-gradient-to-b from-green-600 to-green-700 flex flex-col items-center justify-center p-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4 animate-pulse">
              {getInitials(incomingCall.caller.name)}
            </div>
            <h2 className="text-2xl font-bold mb-1">{incomingCall.caller.name}</h2>
            <p className="text-white/80 mb-8">{incomingCall.caller.title || 'Teams Call'}</p>
            <div className="flex gap-10">
              <button
                onClick={declineCall}
                className="w-16 h-16 rounded-full bg-black/30 flex flex-col items-center justify-center"
              >
                <TbPhoneOff className="size-6" />
                <span className="text-[10px] mt-1">Decline</span>
              </button>
              <button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-white text-green-600 flex flex-col items-center justify-center"
              >
                <TbPhone className="size-6" />
                <span className="text-[10px] mt-1">Answer</span>
              </button>
            </div>
            <div className="mt-8 text-center">
              <p className="text-sm text-white/70 mb-2">Or use voice commands:</p>
              <div className="flex gap-3">
                <span className="px-3 py-1.5 bg-black/20 rounded-full text-xs">"Hey TVS, answer"</span>
                <span className="px-3 py-1.5 bg-black/20 rounded-full text-xs">"Hey TVS, decline"</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Call */}
        {callState === 'active' && activeCall && (
          <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col">
            <div className="p-4 text-center bg-black/30">
              <p className="text-green-400 text-sm mb-1">● Call in progress</p>
              <p className="text-3xl font-light">{formatDuration(callDuration)}</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-4xl font-bold mb-4">
                {getInitials(activeCall.caller.name)}
              </div>
              <h2 className="text-xl font-semibold mb-1">{activeCall.caller.name}</h2>
              <p className="text-white/50 text-sm">{activeCall.caller.title}</p>
            </div>
            <div className="flex justify-center gap-6 p-6">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-red-500' : 'bg-white/10'
                }`}
              >
                {isMuted ? <TbMicrophoneOff className="size-6" /> : <TbMicrophone className="size-6" />}
              </button>
              <button
                onClick={endCall}
                className="w-16 h-14 rounded-full bg-red-500 flex items-center justify-center"
              >
                <TbPhoneOff className="size-6" />
              </button>
            </div>
          </div>
        )}

        {/* Meeting Card */}
        {meeting && (
          <div className="bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <TbUsers className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{meeting.subject}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 bg-indigo-500/20 rounded-xl text-xs font-semibold text-indigo-300">
                    In {formatTimeUntil(meeting.start)}
                  </span>
                  <span className="text-xs text-white/50">{meeting.attendees.length + 1} attendees</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-xs font-semibold">
                {getInitials(meeting.organizer.name)}
              </div>
              <div>
                <p className="text-xs font-medium">{meeting.organizer.name}</p>
                <p className="text-[10px] text-white/40">{meeting.organizer.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/15 rounded-xl">
              <div className="w-9 h-9 bg-green-500/15 rounded-full flex items-center justify-center animate-pulse">
                <TbMicrophone className="size-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">"Hey TVS, join meeting"</p>
                <p className="text-[10px] text-white/40">
                  {safetyConfig.canJoinMeetings ? 'Voice command ready' : 'Stop to join meeting'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Responses */}
        <div>
          <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            Quick Voice Responses
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {quickResponses.slice(0, 4).map((qr) => (
              <button
                key={qr.id}
                onClick={() => sendQuickResponse(qr)}
                className="flex items-center gap-2 p-3 bg-white/5 border border-white/8 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-base">{qr.icon}</span>
                <span className="text-[11px] text-white/70">{qr.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Call Queue */}
        {callQueue.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
              While You Were Riding
            </h4>
            <div className="space-y-2">
              {callQueue.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      item.type === 'missed_call' ? 'bg-red-500/15 text-red-400' : 'bg-purple-500/15 text-purple-400'
                    }`}
                  >
                    {item.type === 'missed_call' ? (
                      <TbPhoneOff className="size-4" />
                    ) : (
                      <TbMicrophone className="size-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{item.caller.name}</p>
                    <p className="text-[10px] text-white/40">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-indigo-400 text-xs">
                    Call Back
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Controls */}
        <div className="pt-4 flex flex-col gap-3">
          <Button
            onClick={simulateIncomingCall}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            <TbPhone className="size-4 mr-2" />
            Simulate Incoming Call
          </Button>
          <Button
            onClick={() => setShowVoiceSimulator(true)}
            variant="outline"
            className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            <TbCommand className="size-4 mr-2" />
            Open Voice Commands
          </Button>
        </div>

        {/* Audio Announcement Preview */}
        {lastAnnouncement && (
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[10px] text-white/40 mb-1">🔊 Audio Announcement:</p>
            <p className="text-xs text-white/70 italic">"{lastAnnouncement}"</p>
          </div>
        )}
      </div>

      {/* Helmet Audio Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-black/60 rounded-full text-xs">
        <TbHelmet className="size-4 text-green-400" />
        <span className="text-white/70">Helmet Connected</span>
        <div className="flex items-center gap-0.5 h-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-green-400 rounded-full animate-pulse"
              style={{
                height: `${6 + Math.random() * 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Voice Command Simulator */}
      <VoiceCommandSimulator
        isOpen={showVoiceSimulator}
        onClose={() => setShowVoiceSimulator(false)}
        onCommand={handleVoiceCommand}
      />
    </div>
  )
}