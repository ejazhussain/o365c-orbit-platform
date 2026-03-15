import * as React from 'react'

export interface IKpiStatsProps {
  stat1Value: string
  stat1Label: string
  stat2Value: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
  stat4Value: string
  stat4Label: string
}

interface StatItem {
  value: string
  label: string
}

export default function KpiStats(props: IKpiStatsProps): JSX.Element {
  const stats: StatItem[] = [
    { value: props.stat1Value, label: props.stat1Label },
    { value: props.stat2Value, label: props.stat2Label },
    { value: props.stat3Value, label: props.stat3Label },
    { value: props.stat4Value, label: props.stat4Label },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#06080f',
        borderTop: '0.5px solid #1e2a4a',
        borderBottom: '0.5px solid #1e2a4a',
        padding: '8px 0',
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            textAlign: 'center',
            borderRight: i < stats.length - 1 ? '0.5px solid #1e2a4a' : undefined,
            padding: '16px 0',
          }}
        >
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#a8b8f8' }}>
            {stat.value}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#4a5a78',
              letterSpacing: '2.5px',
              marginTop: '6px',
              textTransform: 'uppercase',
            }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
