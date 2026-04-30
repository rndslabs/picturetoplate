import PhotoCapture from './PhotoCapture'
import VoiceCapture from './VoiceCapture'
import TextCapture from './TextCapture'
import type { SessionIngredientRead } from '../../types/ingredient'

interface TriInputZoneProps {
  sessionId: string
  detectedCount: number
  isDetecting: boolean
  isRecording: boolean
  onToggleRecording: () => void
  onAddIngredient: (ing: SessionIngredientRead) => void
  onFileSelected: (file: File) => void
}

export default function TriInputZone({
  sessionId,
  detectedCount,
  isDetecting,
  isRecording,
  onToggleRecording,
  onAddIngredient,
  onFileSelected,
}: TriInputZoneProps) {
  return (
    <div
      style={{
        border: '1.5px dashed var(--hairline)',
        borderRadius: 28,
        padding: 28,
        background: 'rgba(236,229,213,0.35)',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gap: 20,
      }}
    >
      <PhotoCapture
        detectedCount={detectedCount}
        isDetecting={isDetecting}
        onFileSelected={onFileSelected}
      />
      <VoiceCapture
        sessionId={sessionId}
        isRecording={isRecording}
        onToggle={onToggleRecording}
        onAdd={onAddIngredient}
      />
      <TextCapture sessionId={sessionId} onAdd={onAddIngredient} />
    </div>
  )
}
