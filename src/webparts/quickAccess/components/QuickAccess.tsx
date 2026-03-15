import * as React from 'react'
import { useEffect } from 'react'
import { SPHttpClient } from '@microsoft/sp-http'

export interface IQuickAccessProps {
  title: string
  spHttpClient: SPHttpClient
  webUrl: string
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

const GalaxyIcon = (): JSX.Element => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="2.5" fill="#4A90D9" />
    <circle cx="5"  cy="7"  r="1.8" fill="#FF6B6B" />
    <circle cx="17" cy="6"  r="1.5" fill="#50C878" />
    <circle cx="16" cy="15" r="2"   fill="#7B68EE" />
    <circle cx="6"  cy="15" r="1.5" fill="#FFD700" />
  </svg>
)

const ProjectsIcon = (): JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="5"  width="14" height="2" rx="1" fill="#7B68EE" />
    <rect x="3" y="9"  width="14" height="2" rx="1" fill="#7B68EE" />
    <rect x="3" y="13" width="10" height="2" rx="1" fill="#7B68EE" />
  </svg>
)

const DocumentsIcon = (): JSX.Element => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
    <path
      d="M3 2h8l4 4v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
      stroke="#1D9E75"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M11 2v4h4" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round" />
    <line x1="5" y1="10" x2="13" y2="10" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="13" x2="13" y2="13" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const AgentIcon = (): JSX.Element => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path
      d="M4 4h14a1 1 0 011 1v9a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z"
      stroke="#EF9F27"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="8"  cy="9" r="1" fill="#EF9F27" />
    <circle cx="11" cy="9" r="1" fill="#EF9F27" />
    <circle cx="14" cy="9" r="1" fill="#EF9F27" />
  </svg>
)

// ---------------------------------------------------------------------------
// Tile definition
// ---------------------------------------------------------------------------

interface Tile {
  title: string
  subtitle: string
  iconBg: string
  icon: JSX.Element
  action: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Activity data
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: number
  actor: string
  action: string
  project: string
  time: string
  color: string
}

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 1, actor: 'Sarah K.',         action: 'updated roadmap.docx',      project: 'Project Phoenix', time: '4 min ago',  color: '#4A90D9' },
  { id: 2, actor: 'Project Apollo',   action: '3 new documents added',     project: 'Knowledge Base',  time: '18 min ago', color: '#50C878' },
  { id: 3, actor: 'James T.',         action: 'joined Knowledge Base',     project: 'Project Nebula',  time: '1 hr ago',   color: '#a8b8f8' },
  { id: 4, actor: 'AI Strategy.pptx', action: 'viewed 24 times today',     project: 'Project Horizon', time: '2 hrs ago',  color: '#FF8C00' },
  { id: 5, actor: 'Project Cosmos',   action: 'nebula cluster expanded',   project: '6 new stars',     time: '3 hrs ago',  color: '#7B68EE' },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function QuickAccess(props: IQuickAccessProps): JSX.Element {
  const GALAXY_WP_ID = '5743a0ee-2696-471f-be74-42b27c444d24'
  const [activityItems, setActivityItems] = React.useState<ActivityItem[]>([])
  const [agentPanelOpen, setAgentPanelOpen] = React.useState(false)

  // Load activity (falls back to mock)
  useEffect(() => {
    let cancelled = false
    props.spHttpClient
      .get(
        `${props.webUrl}/_api/site/getchanges`,
        SPHttpClient.configurations.v1,
        { headers: { Accept: 'application/json;odata=nometadata' } }
      )
      .then(res => res.json())
      .then((_data: { value?: unknown[] }) => {
        if (!cancelled) setActivityItems(MOCK_ACTIVITY)
      })
      .catch(() => { if (!cancelled) setActivityItems(MOCK_ACTIVITY) })
    return () => { cancelled = true }
  }, [props.webUrl])

  const scrollToGalaxy = (): void => {
    const el = (
      document.querySelector(`[data-sp-componentid="${GALAXY_WP_ID}"]`) ||
      document.querySelector(`[data-sp-webpart-type="${GALAXY_WP_ID}"]`) ||
      document.querySelector(`[data-component-id="${GALAXY_WP_ID}"]`)
    ) as HTMLElement | null

    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight / 2) - (window.innerHeight / 2)
      window.scrollTo({ top, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
  }

  const tiles: Tile[] = [
    {
      title: 'Knowledge Galaxy',
      subtitle: 'Explore 3D universe',
      iconBg: 'rgba(74,144,217,0.15)',
      icon: <GalaxyIcon />,
      action: () => {
        scrollToGalaxy()
        window.dispatchEvent(new CustomEvent('galaxy-reset'))
      },
    },
    {
      title: 'All Projects',
      subtitle: '8 active nebulae',
      iconBg: 'rgba(123,104,238,0.15)',
      icon: <ProjectsIcon />,
      action: () => {
        scrollToGalaxy()
        window.dispatchEvent(new CustomEvent('galaxy-search', { detail: { query: 'projects' } }))
      },
    },
    {
      title: 'My Documents',
      subtitle: 'Your knowledge stars',
      iconBg: 'rgba(29,158,117,0.15)',
      icon: <DocumentsIcon />,
      action: () => {
        scrollToGalaxy()
        window.dispatchEvent(new CustomEvent('galaxy-search', { detail: { query: 'documents' } }))
      },
    },
    {
      title: 'Ask the Agent',
      subtitle: 'AI knowledge search',
      iconBg: 'rgba(239,159,39,0.15)',
      icon: <AgentIcon />,
      action: () => {
        // Try to trigger the native SharePoint agent panel (deployed via Copilot Studio)
        const agentBtn = (
          document.querySelector('[data-automationid="SiteAgentButton"]') ||
          document.querySelector('[data-automationid*="agent" i]') ||
          document.querySelector('[aria-label*="agent" i]') ||
          document.querySelector('[aria-label*="Copilot" i]') ||
          document.querySelector('[data-automationid*="Copilot" i]')
        ) as HTMLElement | null

        if (agentBtn) {
          agentBtn.click()
        } else {
          // Fallback: open the agent file which launches the native SP agent panel
          window.open(
            'https://ejazhussain.sharepoint.com/sites/mission-control/Shared%20Documents/Copilot%20Studio%20Agents/Mission%20Control%20Assistant_auto_agent_2zTl4.agent',
            '_blank'
          )
        }
      },
    },
  ]

  const cardStyle: React.CSSProperties = {
    background: '#08091a',
    border: '0.5px solid #1e2a4a',
    borderRadius: '12px',
    padding: '24px',
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#4a6fa8',
    letterSpacing: '2.5px',
    marginBottom: '16px',
    textTransform: 'uppercase',
  }

  return (
    <div>

      {/* ── Agent slide-in panel ── */}
      {agentPanelOpen && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            right: 0,
            bottom: 0,
            width: '420px',
            background: '#0b0d1a',
            borderLeft: '1px solid #1a2340',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
            animation: 'mcPanelSlideIn 0.25s ease-out',
          }}
        >
          <style>{`
            @keyframes mcPanelSlideIn {
              from { transform: translateX(100%); }
              to   { transform: translateX(0); }
            }
          `}</style>

          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #1a2340',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'rgba(239,159,39,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AgentIcon />
              </div>
              <span style={{ color: '#e8eaf0', fontSize: '14px', fontWeight: 600 }}>Ask the Agent</span>
            </div>
            <button
              onClick={() => setAgentPanelOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4a5a78', fontSize: '20px', lineHeight: 1, padding: '4px',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Copilot iframe */}
          <iframe
            src="https://m365.cloud.microsoft/chat"
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="M365 Copilot"
            allow="microphone"
          />
        </div>
      )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* ── Quick Access ── */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>Quick Access</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {tiles.map((tile, i) => (
            <TileCard key={i} tile={tile} />
          ))}
        </div>
      </div>

      {/* ── Live Activity ── */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>Live Activity</div>
        {activityItems.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 0',
              borderBottom: i < activityItems.length - 1 ? '0.5px solid #0e1020' : undefined,
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginTop: '4px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#a8b8f8' }}>{item.actor}</div>
              <div style={{ fontSize: '12px', color: '#4a5a78', marginTop: '2px' }}>{item.action} · {item.project}</div>
            </div>
            <div style={{ fontSize: '10px', color: '#2a3448', flexShrink: 0 }}>{item.time}</div>
          </div>
        ))}
      </div>

    </div>
    </div>
  )
}

function TileCard({ tile }: { tile: Tile }): JSX.Element {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      style={{
        background: '#08091a',
        border: `0.5px solid ${hovered ? '#2a4a7a' : '#1e2a4a'}`,
        borderRadius: '10px',
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={tile.action}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: tile.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {tile.icon}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: '#e8eaf0' }}>{tile.title}</div>
          <div style={{ fontSize: '12px', color: '#4a5a78', marginTop: '2px' }}>{tile.subtitle}</div>
        </div>
      </div>
      <div style={{ fontSize: '16px', color: hovered ? '#4a6fa8' : '#1e2a4a', alignSelf: 'flex-end', transition: 'color 0.2s' }}>
        →
      </div>
    </div>
  )
}
