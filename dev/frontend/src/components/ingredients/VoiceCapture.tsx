import { useEffect, useRef } from 'react'
import type { SessionIngredientRead } from '../../types/ingredient'

interface VoiceCaptureProps {
  sessionId: string
  isRecording: boolean
  onToggle: () => void
  onAdd: (ing: SessionIngredientRead) => void
}

// Splits a spoken sentence into individual ingredient name tokens.
function parseTranscript(transcript: string): string[] {
  return transcript
    .split(/,|\band\b|\n/i)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

const BAR_COUNT = 16

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export default function VoiceCapture({ sessionId, isRecording, onToggle, onAdd }: VoiceCaptureProps) {
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)

  useEffect(() => {
    if (!SpeechRecognition) return

    if (isRecording) {
      const rec = new SpeechRecognition()
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.maxAlternatives = 1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        parseTranscript(transcript).forEach(name => {
          onAdd({
            session_ingredient_id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            session_id: sessionId,
            catalog_ref: null,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            quantity: { amount: 1, unit: 'ea' },
            confidence_score: event.results[0][0].confidence ?? null,
            source: 'voice',
            is_confirmed: false,
            is_deleted: false,
            added_at: new Date().toISOString(),
          })
        })
        onToggle() // Stop recording state after result
      }

      rec.onerror = () => onToggle()
      rec.onend   = () => { /* handled by onresult/onerror */ }

      recognitionRef.current = rec
      rec.start()
    } else {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }

    return () => {
      recognitionRef.current?.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  const supported = !!SpeechRecognition

  return (
    <div
      className="rounded-[18px] bg-paper border border-hairline-2 flex flex-col gap-[14px]"
      style={{ padding: 18 }}
    >
      <div className="p2p-mono">voice · {isRecording ? 'recording' : 'idle'}</div>

      <button
        onClick={supported ? onToggle : undefined}
        disabled={!supported}
        className="self-start flex items-center justify-center rounded-full border-none cursor-pointer transition-colors"
        style={{
          width: 56, height: 56,
          background: isRecording ? 'var(--tomato)' : 'var(--ink)',
          color: 'var(--paper)',
          opacity: supported ? 1 : 0.4,
        }}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        title={supported ? undefined : 'Speech recognition not supported in this browser'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" />
        </svg>
      </button>

      {/* Waveform bars — animate when recording */}
      <div className="flex items-end gap-[3px]" style={{ height: 30 }}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-[99px]"
            style={{
              height: `${30 + Math.sin(i * 1.1) * 30 + 30}%`,
              minHeight: 4,
              background: isRecording ? 'var(--tomato)' : 'var(--ink-3)',
              opacity: isRecording ? 0.7 : 0.4,
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      <div className="font-serif italic text-ink-2" style={{ fontSize: 13 }}>
        {supported
          ? '"Tap, then say what you see. I\'ll fill the list."'
          : 'Speech recognition not available in this browser.'}
      </div>
    </div>
  )
}
