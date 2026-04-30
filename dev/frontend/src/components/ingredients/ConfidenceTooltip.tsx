import * as Tooltip from '@radix-ui/react-tooltip'

interface ConfidenceTooltipProps {
  score: number | null
  children: React.ReactNode
}

function label(score: number): string {
  if (score >= 0.9)  return 'High confidence — AI is very sure'
  if (score >= 0.75) return 'Medium confidence — AI is fairly sure'
  return 'Low confidence — please verify this item'
}

// Wraps any element; if score is null the children render with no tooltip
export default function ConfidenceTooltip({ score, children }: ConfidenceTooltipProps) {
  if (score === null) return <>{children}</>

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.03em',
              padding: '6px 12px',
              borderRadius: 8,
              maxWidth: 200,
              lineHeight: 1.4,
            }}
          >
            {label(score)}
            <Tooltip.Arrow style={{ fill: 'var(--ink)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
