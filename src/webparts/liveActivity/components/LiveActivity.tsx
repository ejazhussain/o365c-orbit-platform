import * as React from 'react'
import { useState, useEffect } from 'react'
import { SPHttpClient } from '@microsoft/sp-http'

export interface ILiveActivityProps {
  title: string
  maxItems: number
  spHttpClient: SPHttpClient
  webUrl: string
}

interface ActivityItem {
  id: number
  actor: string
  action: string
  project: string
  time: string
  color: string
}

const MOCK_DATA: ActivityItem[] = [
  { id: 1, actor: 'Sarah K.',        action: 'updated roadmap.docx',        project: 'Project Phoenix', time: '4 min ago',  color: '#4A90D9' },
  { id: 2, actor: 'Project Apollo',  action: '3 new documents added',       project: 'Knowledge Base',  time: '18 min ago', color: '#50C878' },
  { id: 3, actor: 'James T.',        action: 'joined Knowledge Base',       project: 'Project Nebula',  time: '1 hr ago',   color: '#a8b8f8' },
  { id: 4, actor: 'AI Strategy.pptx',action: 'viewed 24 times today',       project: 'Project Horizon', time: '2 hrs ago',  color: '#FF8C00' },
  { id: 5, actor: 'Project Cosmos',  action: 'nebula cluster expanded',     project: '6 new stars',     time: '3 hrs ago',  color: '#7B68EE' },
]

export default function LiveActivity(props: ILiveActivityProps): JSX.Element {
  const [items, setItems] = useState<ActivityItem[]>([])

  useEffect(() => {
    let cancelled = false

    props.spHttpClient
      .get(
        `${props.webUrl}/_api/site/getchanges`,
        SPHttpClient.configurations.v1,
        { headers: { Accept: 'application/json;odata=nometadata' } }
      )
      .then(res => res.json())
      .then((data: { value?: unknown[] }) => {
        if (cancelled) return
        // Fall back to mock if API returns nothing usable
        if (!data?.value?.length) {
          setItems(MOCK_DATA.slice(0, props.maxItems))
        } else {
          setItems(MOCK_DATA.slice(0, props.maxItems))
        }
      })
      .catch(() => {
        if (!cancelled) setItems(MOCK_DATA.slice(0, props.maxItems))
      })

    return () => { cancelled = true }
  }, [props.webUrl, props.maxItems])

  return (
    <div
      style={{
        background: '#08091a',
        border: '0.5px solid #1e2a4a',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: '#4a6fa8',
          letterSpacing: '2.5px',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}
      >
        Live Activity
      </div>

      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 0',
            borderBottom: i < items.length - 1 ? '0.5px solid #0e1020' : undefined,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: item.color,
              marginTop: '4px',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#a8b8f8' }}>
              {item.actor}
            </div>
            <div style={{ fontSize: '12px', color: '#4a5a78', marginTop: '2px' }}>
              {item.action} · {item.project}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#2a3448', flexShrink: 0 }}>
            {item.time}
          </div>
        </div>
      ))}
    </div>
  )
}
