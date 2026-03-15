# Knowledge Galaxy — Architecture

## Component structure
```
orbit-platform/
├── src/webparts/knowledgeGalaxy/
│   ├── models/
│   │   └── GalaxyTypes.ts          ← TypeScript interfaces
│   ├── services/
│   │   ├── MockDataService.ts      ← Demo data (103 nodes)
│   │   ├── GalaxyDataMapper.ts     ← 3D position calculator
│   │   └── GraphDataService.ts     ← Real SP data (post-hackathon)
│   └── components/
│       ├── GalaxyRenderer.tsx      ← Three.js 3D engine
│       ├── SearchPanel.tsx         ← Knowledge search overlay
│       ├── NodeDetailPanel.tsx     ← Node detail side panel
│       └── KnowledgeGalaxy.tsx     ← Root component
└── deployment/
    ├── deploy.ps1                  ← One command deploy
    ├── theme/                      ← Dark space theme
    └── provisioning/               ← PnP site template
```

## Data flow
```
MockDataService / GraphDataService
        ↓
GalaxyDataMapper
(calculates 3D positions using golden angle distribution)
        ↓
GalaxyRenderer (Three.js)
├── Background star field (3000 particles)
├── Project nebulae (particle clouds)
├── Person nodes (spheres orbiting projects)
├── Document stars (orbiting their authors)
└── Connection edges (relationship lines)
        ↓
KnowledgeGalaxy (root)
├── SearchPanel (search overlay)
├── NodeDetailPanel (click detail)
└── GalaxyLegend (type key)
```

## Key design decisions

### Golden angle distribution
Projects are positioned using the golden angle algorithm
(137.5°) to ensure even distribution in 3D space with 
no clustering — the same algorithm used in sunflower seeds
and nautilus shells.

### Orbital mechanics
Documents orbit their authors, authors orbit their projects.
Each orbit has a unique radius, speed and tilt — creating 
natural variation without random chaos.

### Performance
- InstancedMesh for document stars (single draw call)
- Raycasting throttled to every 3rd frame
- LOD: labels only visible within distance threshold
- Particle clouds use AdditiveBlending for GPU efficiency

## Extending with real SharePoint data
Replace MockDataService with GraphDataService:
```typescript
const rawGraph = await GraphDataService.getGalaxyGraph(this.context)
```
Requires Graph API permissions: `Sites.Read.All`, `Files.Read.All`
