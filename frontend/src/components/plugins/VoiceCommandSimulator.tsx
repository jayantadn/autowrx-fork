// Copyright (c) 2025 Eclipse Foundation.
// SPDX-License-Identifier: MIT
//
// Voice Command Simulator for Teams Ride Mode
// Simulates voice recognition for demo purposes

import { useState, useCallback, useEffect } from 'react'
import { TbMicrophone, TbMicrophoneOff, TbVolume, TbX } from 'react-icons/tb'

export type VoiceCommandAction =
  | 'answer'
  | 'decline'
  | 'mute'
  | 'unmute'
  | 'end'
  | 'join_meeting'
  | 'quick_reply'
  | 'unknown'

export interface VoiceCommand {
  phrase: string
  action: VoiceCommandAction
  payload?: string
}

const VOICE_COMMANDS: VoiceCommand[] = [
  { phrase: 'hey tvs answer', action: 'answer' },
  { phrase: 'hey tvs answer call', action: 'answer' },
  { phrase: 'hey tvs pick up', action: 'answer' },
  { phrase: 'hey tvs decline', action: 'decline' },
  { phrase: 'hey tvs decline call', action: 'decline' },
  { phrase: 'hey tvs reject', action: 'decline' },
  { phrase: 'hey tvs mute', action: 'mute' },
  { phrase: 'hey tvs unmute', action: 'unmute' },
  { phrase: 'hey tvs end call', action: 'end' },
  { phrase: 'hey tvs hang up', action: 'end' },
  { phrase: 'hey tvs join meeting', action: 'join_meeting' },
  { phrase: 'hey tvs join', action: 'join_meeting' },
  { phrase: "hey tvs i'm riding", action: 'quick_reply', payload: 'riding' },
  { phrase: 'hey tvs in traffic', action: 'quick_reply', payload: 'traffic' },
  { phrase: "hey tvs i'm coming", action: 'quick_reply', payload: 'coming' },
  { phrase: 'hey tvs joining soon', action: 'quick_reply', payload: 'joining' },
]

interface VoiceCommandSimulatorProps {
  onCommand: (command: VoiceCommand) => void
  isOpen: boolean
  onClose: () => void
}

export function VoiceCommandSimulator({ onCommand, isOpen, onClose }: VoiceCommandSimulatorProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognizedCommand, setRecognizedCommand] = useState<VoiceCommand | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const matchCommand = useCallback((text: string): VoiceCommand | null => {
    const normalizedText = text.toLowerCase().trim()
    for (const cmd of VOICE_COMMANDS) {
      if (normalizedText.includes(cmd.phrase)) {
        return cmd
      }
    }
    return null
  }, [])

  const simulateVoiceInput = useCallback(
    (phrase: string) => {
      setTranscript(phrase)
      const matched = matchCommand(phrase)
      if (matched) {
        setRecognizedCommand(matched)
        setFeedbackMessage(`✓ Command recognized: ${matched.action}`)
        onCommand(matched)
        setTimeout(() => {
          setRecognizedCommand(null)
          setFeedbackMessage('')
          setTranscript('')
        }, 2000)
      } else {
        setFeedbackMessage('Command not recognized. Try again.')
        setTimeout(() => setFeedbackMessage(''), 2000)
      }
    },
    [matchCommand, onCommand]
  )

  const startListening = useCallback(() => {
    setIsListening(true)
    setFeedbackMessage('Listening... Say "Hey TVS" followed by a command')
  }, [])

  const stopListening = useCallback(() => {
    setIsListening(false)
    setFeedbackMessage('')
    setTranscript('')
  }, [])

  useEffect(() => {
    if (!isOpen) {
      stopListening()
    }
  }, [isOpen, stopListening])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-xs font-bold">
              TVS
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Voice Commands</h2>
              <p className="text-xs text-white/50">Simulator for Demo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <TbX className="size-5" />
          </button>
        </div>

        {/* Voice Input Area */}
        <div className="p-6 text-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
              isListening
                ? 'bg-gradient-to-br from-green-500 to-green-600 animate-pulse scale-110'
                : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
            }`}
          >
            {isListening ? (
              <TbVolume className="size-10 text-white" />
            ) : (
              <TbMicrophone className="size-10 text-white" />
            )}
          </button>

          <p className="text-sm text-white/70 mb-2">
            {isListening ? 'Listening...' : 'Tap to simulate voice input'}
          </p>

          {transcript && (
            <div className="p-3 bg-white/5 rounded-xl mb-3">
              <p className="text-xs text-white/40 mb-1">Heard:</p>
              <p className="text-sm text-white font-medium">"{transcript}"</p>
            </div>
          )}

          {feedbackMessage && (
            <p
              className={`text-sm font-medium ${
                recognizedCommand ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {feedbackMessage}
            </p>
          )}
        </div>

        {/* Quick Commands */}
        <div className="p-4 bg-black/30">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Quick Simulate</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => simulateVoiceInput('Hey TVS, answer call')}
              className="p-3 bg-green-500/15 border border-green-500/20 rounded-xl text-xs text-green-400 hover:bg-green-500/25 transition-colors"
            >
              "Hey TVS, answer"
            </button>
            <button
              onClick={() => simulateVoiceInput('Hey TVS, decline call')}
              className="p-3 bg-red-500/15 border border-red-500/20 rounded-xl text-xs text-red-400 hover:bg-red-500/25 transition-colors"
            >
              "Hey TVS, decline"
            </button>
            <button
              onClick={() => simulateVoiceInput('Hey TVS, mute')}
              className="p-3 bg-amber-500/15 border border-amber-500/20 rounded-xl text-xs text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              "Hey TVS, mute"
            </button>
            <button
              onClick={() => simulateVoiceInput('Hey TVS, end call')}
              className="p-3 bg-slate-500/15 border border-slate-500/20 rounded-xl text-xs text-slate-300 hover:bg-slate-500/25 transition-colors"
            >
              "Hey TVS, end call"
            </button>
            <button
              onClick={() => simulateVoiceInput('Hey TVS, join meeting')}
              className="p-3 bg-indigo-500/15 border border-indigo-500/20 rounded-xl text-xs text-indigo-400 hover:bg-indigo-500/25 transition-colors col-span-2"
            >
              "Hey TVS, join meeting"
            </button>
          </div>
        </div>

        {/* Available Commands Reference */}
        <div className="p-4 border-t border-white/10 max-h-48 overflow-y-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Available Commands</p>
          <div className="space-y-1.5">
            {[
              { cmd: 'Hey TVS, answer call', desc: 'Answer incoming call' },
              { cmd: 'Hey TVS, decline call', desc: 'Decline incoming call' },
              { cmd: 'Hey TVS, mute', desc: 'Mute microphone' },
              { cmd: 'Hey TVS, unmute', desc: 'Unmute microphone' },
              { cmd: 'Hey TVS, end call', desc: 'End current call' },
              { cmd: 'Hey TVS, join meeting', desc: 'Join scheduled meeting' },
              { cmd: "Hey TVS, I'm riding", desc: 'Send quick response' },
              { cmd: 'Hey TVS, in traffic', desc: 'Send quick response' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-green-400 font-medium">"{item.cmd}"</span>
                <span className="text-white/40">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceCommandSimulator
