import * as THREE from "three";

// ---------------------------------------------------------------------------
// Colour mapping constants
// ---------------------------------------------------------------------------

/** Maps common SharePoint file extensions to hex colours. */
export const FileTypeColor: Readonly<Record<string, string>> = {
  pdf: "#FF6B6B",
  docx: "#4A90D9",
  xlsx: "#50C878",
  pptx: "#FF8C00",
  other: "#AAAAAA",
} as const;

/** Maps galaxy node types to hex colours. */
export const NodeTypeColor: Readonly<
  Record<"document" | "person" | "project", string>
> = {
  document: "#85B7EB",
  person: "#AACCFF",
  project: "#5DCAA5",
} as const;

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/** Discriminated union of the three node categories rendered in the galaxy. */
export type GalaxyNodeType = "document" | "person" | "project";

/** Edge relationship types rendered as lines between nodes. */
export type GalaxyEdgeType =
  | "ownership"
  | "collaboration"
  | "project-membership"
  | "cross-reference";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Flexible metadata bag that covers all three node types.
 * Fields are optional so a single interface serves documents, people and projects
 * without resorting to union discrimination at the storage layer.
 */
export interface GalaxyNodeMetadata {
  // ── Document fields ──────────────────────────────────────────────────────
  /** Absolute URL to the document in SharePoint. */
  webUrl?: string;
  /** File extension without the leading dot (e.g. "docx", "pdf"). */
  fileType?: string;
  /** Timestamp of the most recent modification. */
  lastModified?: Date;
  /** Cumulative view count from SharePoint analytics. */
  viewCount?: number;
  /** File size in bytes. */
  sizeBytes?: number;

  // ── Person fields ─────────────────────────────────────────────────────────
  /** User's primary SMTP address. */
  email?: string;
  /** User's job title from the profile service. */
  jobTitle?: string;
  /** Organisational department. */
  department?: string;

  // ── Project / Site fields ─────────────────────────────────────────────────
  /** Short description of the project or site. */
  description?: string;
  /** Total number of documents associated with this project. */
  documentCount?: number;
  /** Total number of site members. */
  memberCount?: number;
}

// ---------------------------------------------------------------------------
// Core graph primitives
// ---------------------------------------------------------------------------

/**
 * A single node in the knowledge galaxy.
 *
 * - **document** nodes are rendered as coloured stars.
 * - **person** nodes are rendered as bright spheres forming constellations.
 * - **project** nodes are rendered as particle-cloud nebulae.
 */
export interface GalaxyNode {
  /** Unique stable identifier for this node. */
  id: string;
  /** Visual category that drives geometry and colour selection. */
  type: GalaxyNodeType;
  /** Human-readable display name shown in tooltips and search results. */
  label: string;
  /** World-space position managed by Three.js. */
  position: THREE.Vector3;
  /** CSS hex colour string (e.g. "#FF6B6B"). */
  color: string;
  /**
   * Rendered geometry radius / scale factor.
   * Clamped to the range **[0.1, 2.0]** by the renderer.
   */
  size: number;
  /** Type-specific metadata fields. */
  metadata: GalaxyNodeMetadata;
  /** IDs of directly connected nodes — used to draw edges. */
  connections: string[];
  /** Whether this node is currently selected / search-matched. */
  highlighted: boolean;
  /** Whether this node is faded because another node is highlighted. */
  dimmed: boolean;

  // ── Optional orbital mechanics ────────────────────────────────────────────
  /** Distance from parent node centre (world units). */
  orbitRadius?: number;
  /** Radians per animation frame. */
  orbitSpeed?: number;
  /** Current position in the orbit, in radians. */
  orbitAngle?: number;
  /**
   * For document nodes: the person node this document orbits around.
   * For person nodes:   the project node this person belongs to.
   */
  parentId?: string;
}

/**
 * A directed or undirected relationship between two {@link GalaxyNode}s,
 * rendered as a line in the scene.
 */
export interface GalaxyEdge {
  /** Unique stable identifier for this edge. */
  id: string;
  /** ID of the source node. */
  sourceId: string;
  /** ID of the target node. */
  targetId: string;
  /**
   * Visual / semantic weight of the relationship.
   * Clamped to the range **[0.1, 1.0]** by the renderer; higher = thicker / brighter line.
   */
  strength: number;
  /** Semantic category of this relationship. */
  type: GalaxyEdgeType;
}

// ---------------------------------------------------------------------------
// Graph container
// ---------------------------------------------------------------------------

/** The complete, serialisable graph loaded into (or exported from) the scene. */
export interface GalaxyGraph {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  /** Wall-clock time at which this graph snapshot was produced. */
  lastUpdated: Date;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Result returned by the in-scene search service. */
export interface GalaxySearchResult {
  /** The raw query string that was evaluated. */
  query: string;
  /** IDs of nodes whose label or metadata matched the query. */
  matchedNodeIds: string[];
  /** Total hit count (may exceed `matchedNodeIds.length` when paginated). */
  totalCount: number;
  /** Time taken to execute the search, in milliseconds. */
  searchDuration: number;
}

// ---------------------------------------------------------------------------
// Render configuration
// ---------------------------------------------------------------------------

/**
 * Runtime configuration passed to the Three.js renderer.
 * All numeric defaults are documented inline.
 */
export interface GalaxyRenderConfig {
  /** Background hex colour for the Three.js canvas (e.g. "#000010"). */
  backgroundColor: string;
  /**
   * Number of static background particles simulating a star field.
   * @default 3000
   */
  starFieldCount: number;
  /**
   * Radians per animation frame applied to the scene auto-rotation.
   * Set to `0` to disable.
   * @default 0.0001
   */
  autoRotateSpeed: number;
  /** Render translucent arc lines showing document orbital paths. */
  enableOrbits: boolean;
  /** Render lines for all {@link GalaxyEdge}s in the graph. */
  enableEdges: boolean;
  /**
   * Maximum number of document nodes loaded into the scene.
   * @default 200
   */
  maxDocuments: number;
  /**
   * When `true`, the scene is populated with procedurally generated mock data
   * instead of live SharePoint data — useful for local development.
   */
  enableMockData: boolean;
}

// ---------------------------------------------------------------------------
// Web part properties
// ---------------------------------------------------------------------------

/**
 * Strongly typed property bag for the KnowledgeGalaxy SharePoint Framework web part.
 * Mapped directly to the property pane controls.
 */
export interface IKnowledgeGalaxyWebPartProps {
  /** Absolute URL of the SharePoint site collection to query. */
  siteUrl: string;
  /**
   * Maximum number of documents to fetch and render.
   * Mirrors {@link GalaxyRenderConfig.maxDocuments}.
   */
  maxDocuments: number;
  /**
   * Populate the galaxy with mock data when the live graph is unavailable.
   * Mirrors {@link GalaxyRenderConfig.enableMockData}.
   */
  enableMockData: boolean;
  /**
   * Scene auto-rotation speed (radians per frame).
   * Mirrors {@link GalaxyRenderConfig.autoRotateSpeed}.
   */
  autoRotateSpeed: number;
  /** Display title shown above the web part canvas. */
  title: string;
}
