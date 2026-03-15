import * as THREE from "three";
import {
  FileTypeColor,
  GalaxyEdge,
  GalaxyEdgeType,
  GalaxyGraph,
  GalaxyNode,
  GalaxyNodeMetadata,
  GalaxyNodeType,
  NodeTypeColor,
} from "../models/GalaxyTypes";

// ---------------------------------------------------------------------------
// File-private helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `days` days before the mock "now" of 12 March 2026. */
function daysAgo(days: number): Date {
  const base = new Date("2026-03-12T00:00:00Z");
  base.setDate(base.getDate() - days);
  return base;
}

/** Resolves the hex colour for a document based on its file-type extension. */
function docColor(fileType: string): string {
  const map = FileTypeColor as Record<string, string>;
  return map[fileType] ?? map["other"];
}

/** Builds a fully-initialised {@link GalaxyNode} with zeroed position. */
function makeNode(
  id: string,
  type: GalaxyNodeType,
  label: string,
  color: string,
  size: number,
  metadata: GalaxyNodeMetadata,
  parentId?: string,
  orbitRadius?: number,
  orbitSpeed?: number,
  orbitAngle?: number,
): GalaxyNode {
  return {
    id,
    type,
    label,
    color,
    size,
    metadata,
    position: new THREE.Vector3(0, 0, 0),
    connections: [], // populated after all edges are built
    highlighted: false,
    dimmed: false,
    parentId,
    orbitRadius,
    orbitSpeed,
    orbitAngle,
  };
}

/** Builds a {@link GalaxyEdge}. */
function makeEdge(
  id: string,
  sourceId: string,
  targetId: string,
  type: GalaxyEdgeType,
  strength: number,
): GalaxyEdge {
  return { id, sourceId, targetId, type, strength };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Provides a deterministic, self-contained {@link GalaxyGraph} populated with
 * realistic fake data for demo and hackathon purposes.
 *
 * Returned graph: 8 project nodes + 15 person nodes + 80 document nodes = **103 nodes**.
 *
 * All node positions are initialised to `Vector3(0,0,0)` — `GalaxyDataMapper`
 * is responsible for computing final world-space coordinates.
 */
export class MockDataService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public static getGalaxyGraph(): GalaxyGraph {
    const nodes: GalaxyNode[] = [];
    const edges: GalaxyEdge[] = [];

    // -- 1. Projects (8) ----------------------------------------------------
    const projects = MockDataService._buildProjects();
    nodes.push(...projects);

    // -- 2. People (15) -----------------------------------------------------
    const people = MockDataService._buildPeople();
    nodes.push(...people);

    // -- 3. Documents (80) --------------------------------------------------
    const documents = MockDataService._buildDocuments();
    nodes.push(...documents);

    // -- 4. Edges -----------------------------------------------------------
    edges.push(...MockDataService._buildEdges());

    // -- 5. Populate connections from edges ---------------------------------
    const nodeMap = new Map<string, GalaxyNode>(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const src = nodeMap.get(edge.sourceId);
      const tgt = nodeMap.get(edge.targetId);
      if (src && !src.connections.includes(edge.targetId)) {
        src.connections.push(edge.targetId);
      }
      if (tgt && !tgt.connections.includes(edge.sourceId)) {
        tgt.connections.push(edge.sourceId);
      }
    }

    return { nodes, edges, lastUpdated: new Date("2026-03-12T00:00:00Z") };
  }

  // -------------------------------------------------------------------------
  // Projects (nebulae)
  // -------------------------------------------------------------------------

  private static _buildProjects(): GalaxyNode[] {
    const TAU = Math.PI * 2;
    interface ProjDef {
      id: string;
      label: string;
      dept: string;
      desc: string;
      docs: number;
      members: number;
      angle: number;
    }
    const defs: ProjDef[] = [
      {
        id: "proj-1",
        label: "Project Phoenix",
        dept: "Engineering",
        docs: 45,
        members: 12,
        desc: "Core platform re-architecture and modernisation initiative.",
        angle: 0,
      },
      {
        id: "proj-2",
        label: "Project Apollo",
        dept: "Product",
        docs: 38,
        members: 8,
        desc: "Next-generation product strategy and roadmap delivery.",
        angle: TAU / 8,
      },
      {
        id: "proj-3",
        label: "Project Nebula",
        dept: "Design",
        docs: 29,
        members: 6,
        desc: "Company-wide design-system and UX consistency programme.",
        angle: (TAU * 2) / 8,
      },
      {
        id: "proj-4",
        label: "Project Horizon",
        dept: "Marketing",
        docs: 52,
        members: 15,
        desc: "Global marketing expansion and brand awareness campaign.",
        angle: (TAU * 3) / 8,
      },
      {
        id: "proj-5",
        label: "Project Aurora",
        dept: "Data & AI",
        docs: 41,
        members: 10,
        desc: "Machine-learning platform and AI-powered feature delivery.",
        angle: (TAU * 4) / 8,
      },
      {
        id: "proj-6",
        label: "Project Titan",
        dept: "Infrastructure",
        docs: 33,
        members: 9,
        desc: "Cloud infrastructure migration and reliability engineering.",
        angle: (TAU * 5) / 8,
      },
      {
        id: "proj-7",
        label: "Project Cosmos",
        dept: "HR & People",
        docs: 27,
        members: 7,
        desc: "Talent development, engagement and organisational culture.",
        angle: (TAU * 6) / 8,
      },
      {
        id: "proj-8",
        label: "Project Voyager",
        dept: "Finance",
        docs: 31,
        members: 11,
        desc: "Financial planning, compliance and treasury optimisation.",
        angle: (TAU * 7) / 8,
      },
    ];

    return defs.map((d) =>
      makeNode(
        d.id,
        "project",
        d.label,
        NodeTypeColor["project"],
        1.8,
        {
          description: d.desc,
          documentCount: d.docs,
          memberCount: d.members,
          department: d.dept,
        },
        undefined,
        undefined,
        undefined,
        d.angle,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // People (constellation spheres)
  // -------------------------------------------------------------------------

  private static _buildPeople(): GalaxyNode[] {
    interface PersonDef {
      id: string;
      first: string;
      last: string;
      title: string;
      dept: string;
      projectId: string;
      orbitAngle: number;
    }
    const defs: PersonDef[] = [
      // Phoenix – Engineering
      {
        id: "person-1",
        first: "Alice",
        last: "Chen",
        title: "Senior Engineer",
        dept: "Engineering",
        projectId: "proj-1",
        orbitAngle: 0,
      },
      {
        id: "person-2",
        first: "Bob",
        last: "Martinez",
        title: "Engineering Lead",
        dept: "Engineering",
        projectId: "proj-1",
        orbitAngle: Math.PI,
      },
      // Apollo – Product
      {
        id: "person-3",
        first: "Carol",
        last: "White",
        title: "Product Manager",
        dept: "Product",
        projectId: "proj-2",
        orbitAngle: 0,
      },
      {
        id: "person-4",
        first: "David",
        last: "Kim",
        title: "Business Analyst",
        dept: "Product",
        projectId: "proj-2",
        orbitAngle: Math.PI,
      },
      // Nebula – Design
      {
        id: "person-5",
        first: "Eva",
        last: "Rodriguez",
        title: "Senior Designer",
        dept: "Design",
        projectId: "proj-3",
        orbitAngle: 0,
      },
      {
        id: "person-6",
        first: "Frank",
        last: "Liu",
        title: "Design Lead",
        dept: "Design",
        projectId: "proj-3",
        orbitAngle: Math.PI,
      },
      // Horizon – Marketing
      {
        id: "person-7",
        first: "Grace",
        last: "Thompson",
        title: "Marketing Analyst",
        dept: "Marketing",
        projectId: "proj-4",
        orbitAngle: 0,
      },
      {
        id: "person-8",
        first: "Henry",
        last: "Davis",
        title: "Marketing Director",
        dept: "Marketing",
        projectId: "proj-4",
        orbitAngle: Math.PI,
      },
      // Aurora – Data & AI
      {
        id: "person-9",
        first: "Iris",
        last: "Johnson",
        title: "Machine Learning Engineer",
        dept: "Data & AI",
        projectId: "proj-5",
        orbitAngle: 0,
      },
      {
        id: "person-10",
        first: "James",
        last: "Wilson",
        title: "Data Science Lead",
        dept: "Data & AI",
        projectId: "proj-5",
        orbitAngle: Math.PI,
      },
      // Titan – Infrastructure
      {
        id: "person-11",
        first: "Karen",
        last: "Brown",
        title: "Cloud Engineer",
        dept: "Infrastructure",
        projectId: "proj-6",
        orbitAngle: 0,
      },
      // Cosmos – HR & People
      {
        id: "person-12",
        first: "Liam",
        last: "Taylor",
        title: "HR Director",
        dept: "HR & People",
        projectId: "proj-7",
        orbitAngle: 0,
      },
      {
        id: "person-13",
        first: "Mia",
        last: "Anderson",
        title: "People Analyst",
        dept: "HR & People",
        projectId: "proj-7",
        orbitAngle: Math.PI,
      },
      // Voyager – Finance
      {
        id: "person-14",
        first: "Noah",
        last: "Garcia",
        title: "Finance Analyst",
        dept: "Finance",
        projectId: "proj-8",
        orbitAngle: 0,
      },
      {
        id: "person-15",
        first: "Olivia",
        last: "Lee",
        title: "Finance Lead",
        dept: "Finance",
        projectId: "proj-8",
        orbitAngle: Math.PI,
      },
    ];

    return defs.map((d) =>
      makeNode(
        d.id,
        "person",
        `${d.first} ${d.last}`,
        NodeTypeColor["person"],
        1.2,
        {
          email: `${d.first.toLowerCase()}.${d.last.toLowerCase()}@contoso.com`,
          jobTitle: d.title,
          department: d.dept,
        },
        d.projectId,
        /* orbitRadius */ 25,
        /* orbitSpeed  */ 0.0006,
        d.orbitAngle,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Documents (stars)
  // -------------------------------------------------------------------------

  private static _buildDocuments(): GalaxyNode[] {
    // File-type sequence: 30 docx (1-30), 20 xlsx (31-50), 15 pptx (51-65), 15 pdf (66-80)
    const TYPE_SEQUENCE: string[] = [
      ...Array<string>(30).fill("docx"),
      ...Array<string>(20).fill("xlsx"),
      ...Array<string>(15).fill("pptx"),
      ...Array<string>(15).fill("pdf"),
    ];

    interface DocDef {
      label: string; // filename without extension
      personId: string;
      projectSlug: string;
      viewCount: number;
      sizeBytes: number;
      modified: number; // days ago
    }

    const defs: DocDef[] = [
      // ── docs 1-5  (Alice Chen · Phoenix · Engineering) ──────────────────
      {
        label: "Phoenix Platform Architecture Roadmap",
        personId: "person-1",
        projectSlug: "phoenix",
        viewCount: 214,
        sizeBytes: 184320,
        modified: 12,
      },
      {
        label: "Backend API Design Specification",
        personId: "person-1",
        projectSlug: "phoenix",
        viewCount: 97,
        sizeBytes: 263680,
        modified: 28,
      },
      {
        label: "Code Review Standards and Guidelines",
        personId: "person-1",
        projectSlug: "phoenix",
        viewCount: 153,
        sizeBytes: 92160,
        modified: 45,
      },
      {
        label: "Sprint Planning Q1 2026",
        personId: "person-1",
        projectSlug: "phoenix",
        viewCount: 64,
        sizeBytes: 73728,
        modified: 60,
      },
      {
        label: "Technical Debt Assessment",
        personId: "person-1",
        projectSlug: "phoenix",
        viewCount: 38,
        sizeBytes: 131072,
        modified: 90,
      },
      // ── docs 6-10 (Bob Martinez · Phoenix · Engineering) ────────────────
      {
        label: "DevOps Pipeline Configuration Guide",
        personId: "person-2",
        projectSlug: "phoenix",
        viewCount: 178,
        sizeBytes: 204800,
        modified: 8,
      },
      {
        label: "Security Audit Findings Report",
        personId: "person-2",
        projectSlug: "phoenix",
        viewCount: 285,
        sizeBytes: 317440,
        modified: 22,
      },
      {
        label: "Microservices Migration Plan",
        personId: "person-2",
        projectSlug: "phoenix",
        viewCount: 119,
        sizeBytes: 245760,
        modified: 55,
      },
      {
        label: "Performance Benchmarking Results",
        personId: "person-2",
        projectSlug: "phoenix",
        viewCount: 72,
        sizeBytes: 163840,
        modified: 78,
      },
      {
        label: "Engineering Team Onboarding Handbook",
        personId: "person-2",
        projectSlug: "phoenix",
        viewCount: 340,
        sizeBytes: 450560,
        modified: 120,
      },
      // ── docs 11-15 (Carol White · Apollo · Product) ─────────────────────
      {
        label: "Apollo Product Strategy 2026",
        personId: "person-3",
        projectSlug: "apollo",
        viewCount: 198,
        sizeBytes: 286720,
        modified: 5,
      },
      {
        label: "Feature Prioritisation Matrix",
        personId: "person-3",
        projectSlug: "apollo",
        viewCount: 83,
        sizeBytes: 102400,
        modified: 19,
      },
      {
        label: "User Research Synthesis Report",
        personId: "person-3",
        projectSlug: "apollo",
        viewCount: 227,
        sizeBytes: 348160,
        modified: 34,
      },
      {
        label: "Product Roadmap H1 2026",
        personId: "person-3",
        projectSlug: "apollo",
        viewCount: 312,
        sizeBytes: 225280,
        modified: 67,
      },
      {
        label: "Competitive Analysis Summary",
        personId: "person-3",
        projectSlug: "apollo",
        viewCount: 156,
        sizeBytes: 194560,
        modified: 95,
      },
      // ── docs 16-20 (David Kim · Apollo · Product) ───────────────────────
      {
        label: "Customer Journey Mapping",
        personId: "person-4",
        projectSlug: "apollo",
        viewCount: 104,
        sizeBytes: 278528,
        modified: 14,
      },
      {
        label: "OKR Framework Documentation",
        personId: "person-4",
        projectSlug: "apollo",
        viewCount: 61,
        sizeBytes: 139264,
        modified: 38,
      },
      {
        label: "Stakeholder Communication Plan",
        personId: "person-4",
        projectSlug: "apollo",
        viewCount: 132,
        sizeBytes: 204800,
        modified: 72,
      },
      {
        label: "Release Notes v3.2",
        personId: "person-4",
        projectSlug: "apollo",
        viewCount: 45,
        sizeBytes: 57344,
        modified: 105,
      },
      {
        label: "Product Requirements Document",
        personId: "person-4",
        projectSlug: "apollo",
        viewCount: 189,
        sizeBytes: 368640,
        modified: 145,
      },
      // ── docs 21-25 (Eva Rodriguez · Nebula · Design) ────────────────────
      {
        label: "Nebula Design System Guidelines",
        personId: "person-5",
        projectSlug: "nebula",
        viewCount: 254,
        sizeBytes: 430080,
        modified: 9,
      },
      {
        label: "UX Research Findings Q4 2025",
        personId: "person-5",
        projectSlug: "nebula",
        viewCount: 138,
        sizeBytes: 315392,
        modified: 31,
      },
      {
        label: "Component Library Documentation",
        personId: "person-5",
        projectSlug: "nebula",
        viewCount: 91,
        sizeBytes: 358400,
        modified: 56,
      },
      {
        label: "Accessibility Audit Report",
        personId: "person-5",
        projectSlug: "nebula",
        viewCount: 176,
        sizeBytes: 225280,
        modified: 83,
      },
      {
        label: "Brand Identity Refresh Proposal",
        personId: "person-5",
        projectSlug: "nebula",
        viewCount: 52,
        sizeBytes: 143360,
        modified: 118,
      },
      // ── docs 26-30 (Frank Liu · Nebula · Design) ────────────────────────
      {
        label: "Wireframe Specifications v4",
        personId: "person-6",
        projectSlug: "nebula",
        viewCount: 117,
        sizeBytes: 286720,
        modified: 16,
      },
      {
        label: "Usability Testing Outcomes",
        personId: "person-6",
        projectSlug: "nebula",
        viewCount: 69,
        sizeBytes: 174080,
        modified: 42,
      },
      {
        label: "Design Sprint Results Summary",
        personId: "person-6",
        projectSlug: "nebula",
        viewCount: 203,
        sizeBytes: 245760,
        modified: 68,
      },
      {
        label: "Icon Set Documentation",
        personId: "person-6",
        projectSlug: "nebula",
        viewCount: 34,
        sizeBytes: 81920,
        modified: 97,
      },
      {
        label: "Interaction Design Patterns Guide",
        personId: "person-6",
        projectSlug: "nebula",
        viewCount: 148,
        sizeBytes: 317440,
        modified: 135,
      },
      // ── docs 31-36 (Grace Thompson · Horizon · Marketing) [XLSX] ────────
      {
        label: "Horizon Campaign Performance Dashboard",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 274,
        sizeBytes: 819200,
        modified: 6,
      },
      {
        label: "Q4 2025 Marketing Metrics Report",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 188,
        sizeBytes: 614400,
        modified: 24,
      },
      {
        label: "Social Media Analytics Summary",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 93,
        sizeBytes: 491520,
        modified: 50,
      },
      {
        label: "Lead Generation Funnel Analysis",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 145,
        sizeBytes: 737280,
        modified: 76,
      },
      {
        label: "Content Calendar 2026",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 56,
        sizeBytes: 327680,
        modified: 107,
      },
      {
        label: "Budget Allocation Tracker",
        personId: "person-7",
        projectSlug: "horizon",
        viewCount: 211,
        sizeBytes: 1048576,
        modified: 148,
      },
      // ── docs 37-42 (Henry Davis · Horizon · Marketing) [XLSX] ───────────
      {
        label: "Event ROI Analysis",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 167,
        sizeBytes: 983040,
        modified: 11,
      },
      {
        label: "Email Campaign Performance",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 78,
        sizeBytes: 573440,
        modified: 29,
      },
      {
        label: "SEO Traffic Report Q1 2026",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 232,
        sizeBytes: 655360,
        modified: 53,
      },
      {
        label: "Partner Channel Revenue Tracker",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 119,
        sizeBytes: 1310720,
        modified: 81,
      },
      {
        label: "Customer Acquisition Costs",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 47,
        sizeBytes: 409600,
        modified: 112,
      },
      {
        label: "Brand Awareness Survey Results",
        personId: "person-8",
        projectSlug: "horizon",
        viewCount: 295,
        sizeBytes: 786432,
        modified: 155,
      },
      // ── docs 43-48 (Iris Johnson · Aurora · Data & AI) [XLSX] ───────────
      {
        label: "Model Performance Evaluation",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 183,
        sizeBytes: 1572864,
        modified: 7,
      },
      {
        label: "Data Pipeline Monitoring Dashboard",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 107,
        sizeBytes: 2097152,
        modified: 26,
      },
      {
        label: "Training Dataset Statistics",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 62,
        sizeBytes: 1048576,
        modified: 49,
      },
      {
        label: "AI Feature Usage Analytics",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 221,
        sizeBytes: 819200,
        modified: 74,
      },
      {
        label: "Experiment Results Tracker",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 89,
        sizeBytes: 1310720,
        modified: 103,
      },
      {
        label: "Data Quality Assessment",
        personId: "person-9",
        projectSlug: "aurora",
        viewCount: 144,
        sizeBytes: 655360,
        modified: 141,
      },
      // ── docs 49-50 (James Wilson · Aurora · Data & AI) [XLSX] ───────────
      {
        label: "Aurora ML Infrastructure Costs",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 136,
        sizeBytes: 1835008,
        modified: 17,
      },
      {
        label: "Compute Resource Utilisation",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 74,
        sizeBytes: 1048576,
        modified: 44,
      },
      // ── docs 51-54 (James Wilson · Aurora · Data & AI) [PPTX] ───────────
      {
        label: "Aurora AI Strategy Presentation",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 258,
        sizeBytes: 5242880,
        modified: 20,
      },
      {
        label: "Machine Learning Roadmap 2026",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 199,
        sizeBytes: 3670016,
        modified: 46,
      },
      {
        label: "Data Science Team Kickoff Deck",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 85,
        sizeBytes: 2621440,
        modified: 71,
      },
      {
        label: "Neural Network Architecture Overview",
        personId: "person-10",
        projectSlug: "aurora",
        viewCount: 127,
        sizeBytes: 4194304,
        modified: 100,
      },
      // ── docs 55-60 (Karen Brown · Titan · Infrastructure) [PPTX] ────────
      {
        label: "Cloud Infrastructure Migration Plan",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 176,
        sizeBytes: 6291456,
        modified: 13,
      },
      {
        label: "Network Architecture Overview",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 93,
        sizeBytes: 4718592,
        modified: 37,
      },
      {
        label: "Disaster Recovery Runbook",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 241,
        sizeBytes: 3145728,
        modified: 63,
      },
      {
        label: "Kubernetes Deployment Strategy",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 168,
        sizeBytes: 5767168,
        modified: 88,
      },
      {
        label: "CI/CD Pipeline Implementation",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 112,
        sizeBytes: 2097152,
        modified: 123,
      },
      {
        label: "Titan Infrastructure Review 2026",
        personId: "person-11",
        projectSlug: "titan",
        viewCount: 58,
        sizeBytes: 3670016,
        modified: 162,
      },
      // ── docs 61-65 (Liam Taylor · Cosmos · HR & People) [PPTX] ──────────
      {
        label: "Employee Engagement Programme 2026",
        personId: "person-12",
        projectSlug: "cosmos",
        viewCount: 287,
        sizeBytes: 7340032,
        modified: 10,
      },
      {
        label: "Talent Acquisition Strategy",
        personId: "person-12",
        projectSlug: "cosmos",
        viewCount: 143,
        sizeBytes: 4194304,
        modified: 33,
      },
      {
        label: "Diversity and Inclusion Roadmap",
        personId: "person-12",
        projectSlug: "cosmos",
        viewCount: 97,
        sizeBytes: 5242880,
        modified: 59,
      },
      {
        label: "Performance Review Framework",
        personId: "person-12",
        projectSlug: "cosmos",
        viewCount: 215,
        sizeBytes: 3145728,
        modified: 86,
      },
      {
        label: "Cosmos People Strategy Presentation",
        personId: "person-12",
        projectSlug: "cosmos",
        viewCount: 162,
        sizeBytes: 6815744,
        modified: 130,
      },
      // ── docs 66-70 (Mia Anderson · Cosmos · HR & People) [PDF] ──────────
      {
        label: "HR Policy Updates 2026",
        personId: "person-13",
        projectSlug: "cosmos",
        viewCount: 321,
        sizeBytes: 1048576,
        modified: 4,
      },
      {
        label: "Employee Handbook Revision",
        personId: "person-13",
        projectSlug: "cosmos",
        viewCount: 195,
        sizeBytes: 2621440,
        modified: 27,
      },
      {
        label: "Compensation Benchmarking Report",
        personId: "person-13",
        projectSlug: "cosmos",
        viewCount: 108,
        sizeBytes: 1835008,
        modified: 52,
      },
      {
        label: "Organisational Chart Q1 2026",
        personId: "person-13",
        projectSlug: "cosmos",
        viewCount: 64,
        sizeBytes: 524288,
        modified: 77,
      },
      {
        label: "Wellness Programme Overview",
        personId: "person-13",
        projectSlug: "cosmos",
        viewCount: 173,
        sizeBytes: 1310720,
        modified: 116,
      },
      // ── docs 71-75 (Noah Garcia · Voyager · Finance) [PDF] ───────────────
      {
        label: "Voyager Q4 2025 Financial Report",
        personId: "person-14",
        projectSlug: "voyager",
        viewCount: 248,
        sizeBytes: 2097152,
        modified: 3,
      },
      {
        label: "Annual Budget Proposal 2026",
        personId: "person-14",
        projectSlug: "voyager",
        viewCount: 185,
        sizeBytes: 2883584,
        modified: 21,
      },
      {
        label: "Cost Centre Analysis",
        personId: "person-14",
        projectSlug: "voyager",
        viewCount: 77,
        sizeBytes: 1572864,
        modified: 47,
      },
      {
        label: "Procurement Policy Review",
        personId: "person-14",
        projectSlug: "voyager",
        viewCount: 133,
        sizeBytes: 786432,
        modified: 73,
      },
      {
        label: "Financial Risk Assessment",
        personId: "person-14",
        projectSlug: "voyager",
        viewCount: 51,
        sizeBytes: 2359296,
        modified: 109,
      },
      // ── docs 76-80 (Olivia Lee · Voyager · Finance) [PDF] ────────────────
      {
        label: "Investment Portfolio Review",
        personId: "person-15",
        projectSlug: "voyager",
        viewCount: 212,
        sizeBytes: 3145728,
        modified: 15,
      },
      {
        label: "Revenue Forecast 2026",
        personId: "person-15",
        projectSlug: "voyager",
        viewCount: 153,
        sizeBytes: 1835008,
        modified: 39,
      },
      {
        label: "Tax Compliance Documentation",
        personId: "person-15",
        projectSlug: "voyager",
        viewCount: 88,
        sizeBytes: 1048576,
        modified: 64,
      },
      {
        label: "Audit Preparation Checklist",
        personId: "person-15",
        projectSlug: "voyager",
        viewCount: 175,
        sizeBytes: 655360,
        modified: 91,
      },
      {
        label: "Treasury Management Report",
        personId: "person-15",
        projectSlug: "voyager",
        viewCount: 39,
        sizeBytes: 2621440,
        modified: 170,
      },
    ];

    return defs.map((d, idx) => {
      const fileType = TYPE_SEQUENCE[idx]; // guaranteed to be defined (80 items each)
      const ext = fileType;
      const filename = `${d.label}.${ext}`;
      const orbitAngle = (Math.PI * 2 * idx) / 5; // spread docs within person's orbit

      return makeNode(
        `doc-${idx + 1}`,
        "document",
        d.label,
        docColor(fileType),
        0.4 + (d.viewCount / 340) * 0.8, // size scales with popularity [0.4, 1.2]
        {
          webUrl: `https://contoso.sharepoint.com/sites/${d.projectSlug}/docs/${encodeURIComponent(filename)}`,
          fileType,
          lastModified: daysAgo(d.modified),
          viewCount: d.viewCount,
          sizeBytes: d.sizeBytes,
        } as GalaxyNodeMetadata,
        d.personId,
        /* orbitRadius */ 7,
        /* orbitSpeed  */ 0.002,
        orbitAngle,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Edges
  // -------------------------------------------------------------------------

  private static _buildEdges(): GalaxyEdge[] {
    const edges: GalaxyEdge[] = [];
    let eid = 0;
    const e = (
      src: string,
      tgt: string,
      type: GalaxyEdgeType,
      strength: number,
    ): void => {
      eid++;
      edges.push(makeEdge(`edge-${eid}`, src, tgt, type, strength));
    };

    // ── Ownership: every document → its author (80 edges) ────────────────
    const ownership: Array<[string, string]> = [
      // Phoenix
      ["doc-1", "person-1"],
      ["doc-2", "person-1"],
      ["doc-3", "person-1"],
      ["doc-4", "person-1"],
      ["doc-5", "person-1"],
      ["doc-6", "person-2"],
      ["doc-7", "person-2"],
      ["doc-8", "person-2"],
      ["doc-9", "person-2"],
      ["doc-10", "person-2"],
      // Apollo
      ["doc-11", "person-3"],
      ["doc-12", "person-3"],
      ["doc-13", "person-3"],
      ["doc-14", "person-3"],
      ["doc-15", "person-3"],
      ["doc-16", "person-4"],
      ["doc-17", "person-4"],
      ["doc-18", "person-4"],
      ["doc-19", "person-4"],
      ["doc-20", "person-4"],
      // Nebula
      ["doc-21", "person-5"],
      ["doc-22", "person-5"],
      ["doc-23", "person-5"],
      ["doc-24", "person-5"],
      ["doc-25", "person-5"],
      ["doc-26", "person-6"],
      ["doc-27", "person-6"],
      ["doc-28", "person-6"],
      ["doc-29", "person-6"],
      ["doc-30", "person-6"],
      // Horizon
      ["doc-31", "person-7"],
      ["doc-32", "person-7"],
      ["doc-33", "person-7"],
      ["doc-34", "person-7"],
      ["doc-35", "person-7"],
      ["doc-36", "person-7"],
      ["doc-37", "person-8"],
      ["doc-38", "person-8"],
      ["doc-39", "person-8"],
      ["doc-40", "person-8"],
      ["doc-41", "person-8"],
      ["doc-42", "person-8"],
      // Aurora
      ["doc-43", "person-9"],
      ["doc-44", "person-9"],
      ["doc-45", "person-9"],
      ["doc-46", "person-9"],
      ["doc-47", "person-9"],
      ["doc-48", "person-9"],
      ["doc-49", "person-10"],
      ["doc-50", "person-10"],
      ["doc-51", "person-10"],
      ["doc-52", "person-10"],
      ["doc-53", "person-10"],
      ["doc-54", "person-10"],
      // Titan
      ["doc-55", "person-11"],
      ["doc-56", "person-11"],
      ["doc-57", "person-11"],
      ["doc-58", "person-11"],
      ["doc-59", "person-11"],
      ["doc-60", "person-11"],
      // Cosmos
      ["doc-61", "person-12"],
      ["doc-62", "person-12"],
      ["doc-63", "person-12"],
      ["doc-64", "person-12"],
      ["doc-65", "person-12"],
      ["doc-66", "person-13"],
      ["doc-67", "person-13"],
      ["doc-68", "person-13"],
      ["doc-69", "person-13"],
      ["doc-70", "person-13"],
      // Voyager
      ["doc-71", "person-14"],
      ["doc-72", "person-14"],
      ["doc-73", "person-14"],
      ["doc-74", "person-14"],
      ["doc-75", "person-14"],
      ["doc-76", "person-15"],
      ["doc-77", "person-15"],
      ["doc-78", "person-15"],
      ["doc-79", "person-15"],
      ["doc-80", "person-15"],
    ];
    ownership.forEach(([doc, person]) => e(doc, person, "ownership", 0.9));

    // ── Project-membership: every person → their project (15 edges) ───────
    const membership: Array<[string, string]> = [
      ["person-1", "proj-1"],
      ["person-2", "proj-1"],
      ["person-3", "proj-2"],
      ["person-4", "proj-2"],
      ["person-5", "proj-3"],
      ["person-6", "proj-3"],
      ["person-7", "proj-4"],
      ["person-8", "proj-4"],
      ["person-9", "proj-5"],
      ["person-10", "proj-5"],
      ["person-11", "proj-6"],
      ["person-12", "proj-7"],
      ["person-13", "proj-7"],
      ["person-14", "proj-8"],
      ["person-15", "proj-8"],
    ];
    membership.forEach(([person, proj]) =>
      e(person, proj, "project-membership", 1.0),
    );

    // ── Cross-reference: 20 edges between docs in different projects ───────
    const crossRefs: Array<[string, string, number]> = [
      ["doc-1", "doc-11", 0.6], // Phoenix ↔ Apollo
      ["doc-2", "doc-21", 0.5], // Phoenix ↔ Nebula
      ["doc-3", "doc-31", 0.7], // Phoenix ↔ Horizon
      ["doc-4", "doc-43", 0.4], // Phoenix ↔ Aurora
      ["doc-5", "doc-55", 0.5], // Phoenix ↔ Titan
      ["doc-8", "doc-61", 0.6], // Phoenix ↔ Cosmos
      ["doc-9", "doc-71", 0.3], // Phoenix ↔ Voyager
      ["doc-12", "doc-22", 0.5], // Apollo  ↔ Nebula
      ["doc-13", "doc-32", 0.8], // Apollo  ↔ Horizon
      ["doc-14", "doc-44", 0.6], // Apollo  ↔ Aurora
      ["doc-15", "doc-56", 0.4], // Apollo  ↔ Titan
      ["doc-18", "doc-65", 0.7], // Apollo  ↔ Cosmos
      ["doc-23", "doc-37", 0.5], // Nebula  ↔ Horizon
      ["doc-26", "doc-48", 0.6], // Nebula  ↔ Aurora
      ["doc-28", "doc-72", 0.3], // Nebula  ↔ Voyager
      ["doc-33", "doc-50", 0.7], // Horizon ↔ Aurora
      ["doc-36", "doc-57", 0.5], // Horizon ↔ Titan
      ["doc-41", "doc-66", 0.4], // Horizon ↔ Cosmos
      ["doc-46", "doc-67", 0.6], // Aurora  ↔ Cosmos
      ["doc-59", "doc-75", 0.5], // Titan   ↔ Voyager
    ];
    crossRefs.forEach(([a, b, s]) => e(a, b, "cross-reference", s));

    // ── Collaboration: 10 edges between people across projects ────────────
    const collab: Array<[string, string, number]> = [
      ["person-1", "person-3", 0.8], // Phoenix Engineering ↔ Apollo Product
      ["person-2", "person-5", 0.7], // Phoenix Engineering ↔ Nebula Design
      ["person-3", "person-7", 0.9], // Apollo Product      ↔ Horizon Marketing
      ["person-4", "person-9", 0.6], // Apollo Product      ↔ Aurora Data & AI
      ["person-5", "person-11", 0.5], // Nebula Design       ↔ Titan Infrastructure
      ["person-6", "person-12", 0.7], // Nebula Design       ↔ Cosmos HR
      ["person-7", "person-13", 0.8], // Horizon Marketing   ↔ Cosmos HR
      ["person-9", "person-14", 0.6], // Aurora Data & AI    ↔ Voyager Finance
      ["person-10", "person-15", 0.7], // Aurora Data & AI    ↔ Voyager Finance
      ["person-11", "person-14", 0.5], // Titan Infrastructure ↔ Voyager Finance
    ];
    collab.forEach(([a, b, s]) => e(a, b, "collaboration", s));

    return edges;
  }

  /** Validates that every parentId in the graph resolves to a real node id. */
  public static validateGraph(graph: GalaxyGraph): void {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const broken = graph.nodes.filter(
      (n) => n.parentId !== undefined && n.parentId !== null && !nodeIds.has(n.parentId),
    );
    if (broken.length > 0) {
      console.error(
        "BROKEN PARENT REFS:",
        broken.map((n) => ({ label: n.label, id: n.id, parentId: n.parentId })),
      );
    } else {
      console.log("%cAll parent references valid ✓", "color:green;font-weight:bold");
    }
  }
}
