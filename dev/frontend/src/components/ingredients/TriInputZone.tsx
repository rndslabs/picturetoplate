import PhotoCapture from './PhotoCapture'
import VoiceCapture from './VoiceCapture'
import TextCapture from './TextCapture'
import type { SessionIngredientRead } from '../../types/ingredient'

interface TriInputZoneProps {
  sessionId: string
  detectedCount: number
  isRecording: boolean
  onToggleRecording: () => void
  onAddIngredient: (ing: SessionIngredientRead) => void
  onRetakePhoto: () => void
  onAddAnotherPhoto: () => void
}

export default function TriInputZone({
  sessionId,
  detectedCount,
  isRecording,
  onToggleRecording,
  onAddIngredient,
  onRetakePhoto,
  onAddAnotherPhoto,
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
        onRetake={onRetakePhoto}
        onAddAnother={onAddAnotherPhoto}
      />
      <VoiceCapture isRecording={isRecording} onToggle={onToggleRecording} />
      <TextCapture sessionId={sessionId} onAdd={onAddIngredient} />
    </div>
  )
}
