# ╔═══════════════════════════════════════════╗
# ║  Knowledge Galaxy — One Command Deploy   ║
# ║  SharePoint Hackathon 2026               ║
# ╚═══════════════════════════════════════════╝
#
# USAGE — Full deploy:
#   .\deploy.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/mission-control"
#
# USAGE — Skip app (already deployed):
#   .\deploy.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/mission-control" -SkipApp
#
# USAGE — Theme + template only (your current situation):
#   .\deploy.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/mission-control" -SkipApp -ThemeAlreadyCreated
#
# USAGE — Template only:
#   .\deploy.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/mission-control" -SkipApp -SkipTheme

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [string]$AppCatalogUrl = "",

    [Parameter(Mandatory = $false)]
    [switch]$SkipTheme,

    [Parameter(Mandatory = $false)]
    [switch]$SkipApp,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTemplate,

    [Parameter(Mandatory = $false)]
    [switch]$DemoMode,

    # NEW — use this flag when theme JSON already exists in tenant
    # It skips Add-PnPTenantTheme and just applies it to the site
    [Parameter(Mandatory = $false)]
    [switch]$ThemeAlreadyCreated
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Join-Path $scriptPath ".."
$solutionPath = Join-Path $rootPath "sharepoint/solution/orbit-platform.sppkg"
$themePath = Join-Path $scriptPath "theme/knowledge-galaxy-theme.json"
$templatePath = Join-Path $scriptPath "provisioning/knowledge-galaxy.xml"

function Write-Step {
    param([string]$Message)
    Write-Host "  → $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor Gray
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor DarkYellow
}

Clear-Host
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                            ║" -ForegroundColor Cyan
Write-Host "║      🌌 Knowledge Galaxy Deploy           ║" -ForegroundColor Cyan
Write-Host "║         SharePoint Hackathon 2026         ║" -ForegroundColor Cyan
Write-Host "║                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Target : $SiteUrl" -ForegroundColor White
Write-Host "  SkipApp: $SkipApp" -ForegroundColor Gray
Write-Host "  SkipTheme: $SkipTheme" -ForegroundColor Gray
Write-Host "  ThemeAlreadyCreated: $ThemeAlreadyCreated" -ForegroundColor Gray
Write-Host "  SkipTemplate: $SkipTemplate" -ForegroundColor Gray
Write-Host ""

# ── CHECK PnP PowerShell ──
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Write-Step "PnP PowerShell not found. Installing..."
    Install-Module PnP.PowerShell -Scope CurrentUser -Force
    Write-Success "PnP PowerShell installed"
}

# ── CONNECT ──
Write-Step "Connecting to SharePoint..."
Connect-PnPOnline -Url $SiteUrl -ClientId "[Add your ClientID here]" -Interactive
Write-Success "Connected to $SiteUrl"

# ══════════════════════════════════════════════
# STEP 1 — SPFx Package
# Skipped if -SkipApp or -DemoMode is passed
# ══════════════════════════════════════════════
if (-not $SkipApp -and -not $DemoMode) {
    Write-Step "Building SPFx package..."

    $buildPath = $rootPath
    Push-Location $buildPath

    if (-not (Test-Path $solutionPath)) {
        Write-Info "Package not found — building now..."
        & npm install
        & gulp bundle --ship
        & gulp package-solution --ship
    }
    else {
        Write-Info "Package already exists — skipping build"
    }

    Pop-Location

    Write-Step "Deploying SPFx package to site collection..."

    try {
        Add-PnPApp `
            -Path $solutionPath `
            -Scope Site `
            -Overwrite `
            -Publish

        Start-Sleep -Seconds 5

        Install-PnPApp `
            -Identity "orbit-platform" `
            -Scope Site

        Write-Success "SPFx package deployed and installed"
    }
    catch {
        Write-Warning "App deployment failed: $_"
        Write-Info "The app may already be installed — continuing..."
    }
}
else {
    Write-Info "Skipping app deployment (already installed)"
}

# ══════════════════════════════════════════════
# STEP 2 — Theme
# Three modes:
#   -SkipTheme           → skip everything theme related
#   -ThemeAlreadyCreated → skip Add-PnPTenantTheme, just apply to site
#   (default)            → create theme in tenant AND apply to site
# ══════════════════════════════════════════════
if (-not $SkipTheme) {

    if ($ThemeAlreadyCreated) {
        # Theme JSON already exists in tenant — just apply it to this site
        Write-Step "Applying existing 'Knowledge Galaxy Dark' theme to site..."
        try {
            Set-PnPWebTheme -Theme "Knowledge Galaxy Dark"
            Write-Success "Theme applied to site"
        }
        catch {
            Write-Warning "Could not apply theme: $_"
            Write-Info "Make sure the theme name is exactly 'Knowledge Galaxy Dark' in your tenant"
        }
    }
    else {
        # Create theme in tenant first, then apply
        Write-Step "Creating and applying Knowledge Galaxy dark theme..."
        try {
            if (-not (Test-Path $themePath)) {
                Write-Warning "Theme file not found at: $themePath"
                Write-Info "Skipping theme step"
            }
            else {
                $themeData = Get-Content $themePath -Raw | ConvertFrom-Json
                $palette = @{}
                $themeData.palette.PSObject.Properties | ForEach-Object {
                    $palette[$_.Name] = $_.Value
                }

                Add-PnPTenantTheme `
                    -Identity "Knowledge Galaxy Dark" `
                    -Palette $palette `
                    -IsInverted $true `
                    -Overwrite

                Write-Success "Theme added to tenant"

                Set-PnPWebTheme -Theme "Knowledge Galaxy Dark"
                Write-Success "Theme applied to site"
            }
        }
        catch {
            Write-Warning "Theme step failed: $_"
            Write-Info "Theme may require tenant admin permissions"
            Write-Info "Try running with -ThemeAlreadyCreated if theme exists in tenant"
        }
    }
}
else {
    Write-Info "Skipping theme (--SkipTheme passed)"
}

# ══════════════════════════════════════════════
# STEP 3 — PnP Provisioning Template
# Creates the Mission Control page, nav and lists
# ══════════════════════════════════════════════
if (-not $SkipTemplate) {
    Write-Step "Provisioning Mission Control page, navigation and lists..."

    try {
        if (-not (Test-Path $templatePath)) {
            Write-Warning "Template file not found at: $templatePath"
            Write-Info "Make sure knowledge-galaxy.xml exists in deployment/provisioning/"
        }
        else {
            Invoke-PnPSiteTemplate `
                -Path $templatePath `
                -ClearNavigation

            Write-Success "Mission Control page, lists and navigation created"
        }
    }
    catch {
        Write-Warning "Template provisioning failed: $_"
        Write-Info "Check the XML template is valid and all fields are correct"
    }
}
else {
    Write-Info "Skipping template provisioning (--SkipTemplate passed)"
}

# ══════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                            ║" -ForegroundColor Green
Write-Host "║   ✓  Deployment Complete!                 ║" -ForegroundColor Green
Write-Host "║                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Your Mission Control site:" -ForegroundColor White
Write-Host "  $SiteUrl/SitePages/Mission-Control.aspx" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Open the page and check it looks correct" -ForegroundColor Gray
Write-Host "  2. Click Edit if you need to adjust any web parts" -ForegroundColor Gray
Write-Host "  3. Set enableMockData = true in KnowledgeGalaxy property pane" -ForegroundColor Gray
Write-Host "  4. Publish the page" -ForegroundColor Gray
Write-Host "  5. Take screenshots for your hackathon submission!" -ForegroundColor Gray
Write-Host ""