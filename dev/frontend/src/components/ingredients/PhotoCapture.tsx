import { useRef } from 'react'

interface PhotoCaptureProps {
  detectedCount: number
  isDetecting: boolean
  onFileSelected: (file: File) => void
}

export default function PhotoCapture({ detectedCount, isDetecting, onFileSelected }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
      // Reset so the same file can be re-selected after retake
      e.target.value = ''
    }
  }

  return (
    <div className="relative rounded-[18px] overflow-hidden" style={{ minHeight: 220 }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {/* Background */}
      <div
        className="p2p-photo-ph absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={detectedCount === 0 && !isDetecting ? openPicker : undefined}
      >
        {!isDetecting && detectedCount === 0 && (
          <span style={{ opacity: 0.5, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            tap to upload photo
          </span>
        )}
        {isDetecting && (
          <span style={{ opacity: 0.7, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            detecting…
          </span>
        )}
      </div>

      {/* Detection count pill — shown once we have results */}
      {detectedCount > 0 && !isDetecting && (
        <div
          className="absolute left-3 top-3 font-mono uppercase tracking-[0.06em] rounded-full"
          style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(27,36,32,0.85)', color: 'var(--paper)' }}
        >
          photo · {detectedCount} detected
        </div>
      )}

      {/* Loading indicator */}
      {isDetecting && (
        <div
          className="absolute left-3 top-3 font-mono uppercase tracking-[0.06em] rounded-full"
          style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(27,36,32,0.85)', color: 'var(--paper)' }}
        >
          analysing…
        </div>
      )}

      {/* Action buttons — shown after first detection */}
      {detectedCount > 0 && !isDetecting && (
        <div className="absolute right-3 bottom-3 flex gap-[6px]">
          <button
            onClick={openPicker}
            className="font-mono uppercase tracking-[0.06em] rounded-full cursor-pointer"
            style={{ fontSize: 10, padding: '6px 10px', background: 'rgba(246,243,236,0.92)', color: 'var(--ink)', border: 'none' }}
          >
            retake
          </button>
          <button
            onClick={openPicker}
            className="font-mono uppercase tracking-[0.06em] rounded-full cursor-pointer"
            style={{ fontSize: 10, padding: '6px 10px', background: 'var(--ink)', color: 'var(--paper)', border: 'none' }}
          >
            + add another
          </button>
        </div>
      )}
    </div>
  )
}
