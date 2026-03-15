import {
  BaseApplicationCustomizer
} from '@microsoft/sp-application-base'

export interface IMissionControlHeaderProperties {
  testMessage: string
}

const NAV_ITEMS = [
  { label: 'Home',             path: '/SitePages/Home.aspx' },
  { label: 'Knowledge Galaxy', path: '/SitePages/Knowledge-Galaxy.aspx' },
  { label: 'Projects',         path: '/SitePages/Projects.aspx' },
  { label: 'People',           path: '/SitePages/People.aspx' },
  { label: 'Documents',        path: '/Shared%20Documents/Forms/AllItems.aspx' },
]

export default class MissionControlHeaderApplicationCustomizer
  extends BaseApplicationCustomizer<IMissionControlHeaderProperties> {

  public onInit(): Promise<void> {
    this._injectStyles()
    this._injectNav()
    return Promise.resolve()
  }

  private _injectStyles(): void {
    const style = document.createElement('style')
    style.id = 'mission-control-theme'
    style.textContent = `

      /* ── Hide OOB suite bar ── */
      #SuiteNavWrapper,
      [data-automationid="SuiteHeader"],
      .ms-HamburgerButton,
      #O365_MainLink_Help,
      .o365cs-nav-brandContainer {
        display: none !important;
      }

      /* ── Hide OOB site header / nav (all known selectors) ── */
      .ms-siteHeader-container,
      div[class^="siteHeader"],
      div[class*=" siteHeader"],
      [data-automationid="siteHeader"],
      [data-automationid="SiteHeader"],
      #spSiteHeader,
      .od-SiteHeader,
      [class*="siteHeader_"],
      [class*="SiteHeader_"] {
        display: none !important;
      }

      /* ── Hide page command bar (New / Promote / Edit toolbar) ── */
      [data-automationid="pageCommandBar"],
      div[class^="commandBarWrapper"],
      div[class*=" commandBarWrapper"],
      [class*="commandBarWrapper_"] {
        display: none !important;
      }

      /* ── Push content below our fixed nav ── */
      html body {
        padding-top: 56px !important;
      }

      .SPAppBoilerPlate,
      div[class^="appBoilerPlate"],
      div[class*=" appBoilerPlate"] {
        padding-top: 0 !important;
      }

      /* ══════════════════════════════════════
         Custom nav bar
      ══════════════════════════════════════ */
      #mc-custom-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 56px;
        background: #07090f;
        border-bottom: 1px solid #1a2340;
        display: flex;
        align-items: center;
        padding: 0 24px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
      }

      /* Brand */
      .mc-nav-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-right: 32px;
        flex-shrink: 0;
        text-decoration: none !important;
      }

      .mc-nav-logo {
        width: 32px;
        height: 32px;
        background: #2563eb;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .mc-nav-title {
        color: #e8eaf0;
        font-size: 15px;
        font-weight: 600;
        white-space: nowrap;
        letter-spacing: 0.1px;
      }

      /* Links */
      .mc-nav-links {
        display: flex;
        align-items: center;
        flex: 1;
        height: 100%;
      }

      .mc-nav-link {
        color: #8892a8 !important;
        text-decoration: none !important;
        font-size: 14px;
        font-weight: 400;
        padding: 0 16px;
        height: 56px;
        display: flex;
        align-items: center;
        border-bottom: 2px solid transparent;
        box-sizing: border-box;
        white-space: nowrap;
        transition: color 0.15s;
      }

      .mc-nav-link:hover {
        color: #c8d0e8 !important;
        text-decoration: none !important;
      }

      .mc-nav-link.mc-active {
        color: #ffffff !important;
        border-bottom-color: #ffffff;
        font-weight: 500;
      }

      /* Right-side actions */
      .mc-nav-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      .mc-nav-edit-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid #2a3a5c;
        background: transparent;
        color: #8892a8 !important;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none !important;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        white-space: nowrap;
        font-family: inherit;
      }

      .mc-nav-edit-btn:hover {
        background: #111827;
        border-color: #3d5080;
        color: #c8d0e8 !important;
        text-decoration: none !important;
      }

      .mc-nav-edit-btn svg {
        flex-shrink: 0;
      }

      /* User avatar */
      .mc-nav-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #1e3a6e;
        color: #a8c0f8;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: default;
        user-select: none;
        letter-spacing: 0.5px;
      }

      /* ── Dark page canvas ── */
      div[class^="Canvas"],
      div[class*=" Canvas"],
      .CanvasZone,
      div[class^="sectionBackground"],
      div[class*=" sectionBackground"] {
        background-color: #06080f !important;
      }

      /* ── Command bar ── */
      .ms-CommandBar,
      div[class^="commandBar"],
      div[class*=" commandBar"] {
        background-color: #08091a !important;
        border-bottom: 0.5px solid #1e2235 !important;
      }

      .ms-CommandBar .ms-Button,
      div[class^="commandBar"] button {
        color: #8892a8 !important;
      }

      /* ── Adjust native agent/copilot panel for custom nav height ── */
      [data-automationid="copilotPanel"],
      [data-automationid="sp-copilot-panel"],
      div[class*="copilotPanel"],
      div[class*="CopilotPanel"] {
        top: 56px !important;
        height: calc(100vh - 56px) !important;
      }

      /* ── Hide outer body scrollbar (SharePoint inner scroll is the real one) ── */
      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
      }
      html, body {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      /* ── Hide footer ── */
      div[class^="footer"],
      div[class*=" footer"],
      [data-automationid="SimpleFooter"],
      footer {
        display: none !important;
      }

      /* ── Hide comments ── */
      div[class^="commentSection"],
      div[class*=" commentSection"],
      .like-button-wrapper {
        display: none !important;
      }

    `
    document.head.appendChild(style)
  }

  private _injectNav(): void {
    // Remove any previous instance (hot reload)
    const existing = document.getElementById('mc-custom-nav')
    if (existing) existing.remove()

    const webUrl = this.context.pageContext.web.serverRelativeUrl.replace(/\/$/, '')
    const currentPath = window.location.pathname.toLowerCase()

    // User initials from AAD display name
    const displayName = this.context.pageContext.user.displayName || ''
    const initials = displayName
      .split(' ')
      .filter((p: string) => p.length > 0)
      .slice(0, 2)
      .map((p: string) => p[0].toUpperCase())
      .join('')

    const siteTitle = this.context.pageContext.web.title || 'Mission Control'
    const siteInitial = siteTitle[0]?.toUpperCase() || 'M'

    const linksHtml = NAV_ITEMS.map(item => {
      const href = `${webUrl}${item.path}`
      const isActive = currentPath === href.toLowerCase() ||
                       currentPath.endsWith(item.path.toLowerCase())
      return `<a href="${href}" class="mc-nav-link${isActive ? ' mc-active' : ''}">${item.label}</a>`
    }).join('')

    // Edit button — navigates to edit mode or back to view mode
    const isEditMode = /[?&]Mode=Edit/i.test(window.location.search)
    const editHref = isEditMode
      ? window.location.pathname
      : `${window.location.pathname}?Mode=Edit`
    const editLabel = isEditMode ? 'Exit edit' : 'Edit page'
    const editIcon = isEditMode
      ? `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M2 2h12v12H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
         </svg>`
      : `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
         </svg>`

    const nav = document.createElement('div')
    nav.id = 'mc-custom-nav'
    nav.innerHTML = `
      <div class="mc-nav-brand">
        <div class="mc-nav-logo">${siteInitial}</div>
        <span class="mc-nav-title">${siteTitle}</span>
      </div>
      <nav class="mc-nav-links">
        ${linksHtml}
      </nav>
      <div class="mc-nav-actions">
        <a href="${editHref}" class="mc-nav-edit-btn">
          ${editIcon}
          ${editLabel}
        </a>
        <div class="mc-nav-avatar" title="${displayName}">${initials || '?'}</div>
      </div>
    `

    document.body.insertBefore(nav, document.body.firstChild)
  }
}
