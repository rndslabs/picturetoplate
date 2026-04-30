interface VoiceCaptureProps {
  isRecording: boolean
  onToggle: () => void
}

const BAR_COUNT = 16

export default function VoiceCapture({ isRecording, onToggle }: VoiceCaptureProps) {
  return (
    <div
      className="rounded-[18px] bg-paper border border-hairline-2 flex flex-col gap-[14px]"
      style={{ padding: 18 }}
    >
      <div className="p2p-mono">voice · {isRecording ? 'recording' : 'idle'}</div>

      <button
        onClick={onToggle}
        className="self-start flex items-center justify-center rounded-full border-none cursor-pointer transition-colors"
        style={{
          width: 56, height: 56,
          background: isRecording ? 'var(--tomato)' : 'var(--ink)',
          color: 'var(--paper)',
        }}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" />
        </svg>
      </button>

      {/* Decorative waveform bars */}
      <div className="flex items-end gap-[3px]" style={{ height: 30 }}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-[99px]"
            style={{
              height: `${30 + Math.sin(i * 1.1) * 30 + 30}%`,
              minHeight: 4,
              background: 'var(--ink-3)',
              opacity: isRecording ? 0.7 : 0.4,
            }}
          />
        ))}
      </div>

      <div className="font-serif italic text-ink-2" style={{ fontSize: 13 }}>
        "Tap, then say what you see. I'll fill the list."
      </div>
    </div>
  )
}
