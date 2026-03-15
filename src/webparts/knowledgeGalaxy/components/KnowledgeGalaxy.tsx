import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  GalaxyGraph,
  GalaxyNode,
  GalaxyRenderConfig,
} from "../models/GalaxyTypes";
import { MockDataService } from "../services/MockDataService";
import { GalaxyDataMapper } from "../services/GalaxyDataMapper";
import GalaxyRenderer, { GalaxyRendererHandle } from "./GalaxyRenderer";
import SearchPanel from "./SearchPanel";
import NodeDetailPanel from "./NodeDetailPanel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IKnowledgeGalaxyProps {
  siteUrl: string;
  maxDocuments: number;
  enableMockData: boolean;
  autoRotateSpeed: number;
  title: string;
}

// ---------------------------------------------------------------------------
// Tooltip position
// ---------------------------------------------------------------------------

interface TooltipPos {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

/** Coloured dot used in legend and tooltip badges. */
function Dot({ color }: { color: string }): JSX.Element {
  return (
    <div
      style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

/** Bottom-left legend overlay. */
function GalaxyLegend(): JSX.Element {
  const legendItems: Array<{ color: string; label: string }> = [
    { color: "#1D9E75", label: "Project nebula" },
    { color: "#AACCFF", label: "Person / author" },
    { color: "#4A90D9", label: "Word document" },
    { color: "#FF6B6B", label: "PDF document" },
    { color: "#50C878", label: "Spreadsheet" },
    { color: "#FF8C00", label: "Presentation" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        background: "rgba(6, 8, 15, 0.85)",
        border: "0.5px solid #1e2235",
        borderRadius: "10px",
        padding: "12px 16px",
        zIndex: 100,
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#4a6fa8",
          letterSpacing: "2px",
          marginBottom: "10px",
          textTransform: "uppercase",
        }}
      >
        Galaxy legend
      </div>
      {legendItems.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <Dot color={item.color} />
          <span style={{ fontSize: "13px", color: "#6878a0" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The slim stats bar rendered above the canvas. */
function StatsBar({
  graph,
  highlightedCount,
}: {
  graph: GalaxyGraph;
  highlightedCount: number;
}): JSX.Element {
  const docCount = graph.nodes.filter((n) => n.type === "document").length;
  const personCount = graph.nodes.filter((n) => n.type === "person").length;
  const projectCount = graph.nodes.filter((n) => n.type === "project").length;

  const stats: Array<{
    value: number | string;
    label: string;
    accent?: boolean;
  }> = [
    { value: docCount, label: "documents" },
    { value: personCount, label: "contributors" },
    { value: projectCount, label: "projects" },
    { value: graph.edges.length, label: "connections" },
    ...(highlightedCount > 0
      ? [{ value: highlightedCount, label: "highlighted", accent: true }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        padding: "12px 20px",
        background: "#08091a",
        borderRadius: "10px 10px 0 0",
        borderBottom: "0.5px solid #1e2235",
        fontFamily: "Segoe UI, sans-serif",
        flexWrap: "wrap",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: s.accent ? "#4a90d9" : "#a8b8f8",
            }}
          >
            {s.value}
          </span>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5a78",
              marginLeft: "4px",
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Floating node tooltip. */
function NodeTooltip({
  node,
  position,
}: {
  node: GalaxyNode;
  position: TooltipPos;
}): JSX.Element {
  function formatDate(d?: Date): string {
    if (!d) return "";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const badgeColors: Record<string, { bg: string; fg: string }> = {
    document: { bg: "#0d1e3a", fg: "#4a90d9" },
    person: { bg: "#1a1240", fg: "#7f77dd" },
    project: { bg: "#061e18", fg: "#1d9e75" },
  };
  const badge = badgeColors[node.type] ?? badgeColors["document"];

  let detail = "";
  if (node.type === "document") {
    const ft = node.metadata.fileType ?? "file";
    const mod = formatDate(node.metadata.lastModified);
    detail = mod ? `${ft.toUpperCase()} · ${mod}` : ft.toUpperCase();
  } else if (node.type === "person") {
    detail = node.metadata.jobTitle ?? "";
  } else {
    detail = `${node.metadata.documentCount ?? 0} documents`;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: position.x + 16,
        top: position.y - 8,
        background: "rgba(6, 8, 15, 0.95)",
        border: "0.5px solid #1e2a4a",
        borderRadius: "8px",
        padding: "8px 12px",
        pointerEvents: "none",
        zIndex: 300,
        maxWidth: "200px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          fontWeight: 500,
          color: "#e8eaf0",
          marginBottom: "4px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.label}
      </div>
      <div
        style={{
          display: "inline-block",
          fontSize: "11px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: "8px",
          background: badge.bg,
          color: badge.fg,
          marginBottom: detail ? "4px" : 0,
        }}
      >
        {node.type}
      </div>
      {detail && (
        <div style={{ fontSize: "13px", color: "#6878a0", marginTop: "2px" }}>
          {detail}
        </div>
      )}
    </div>
  );
}

/** Animated loading screen. */
function LoadingScreen({ nodeCount }: { nodeCount: number }): JSX.Element {
  return (
    <div
      style={{
        width: "100%",
        height: "700px",
        background: "#020408",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <style>{`
        @keyframes galaxyPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #1a3a7a, #020408)",
          boxShadow: "0 0 30px #1a3a7a",
          animation: "galaxyPulse 2s ease infinite",
        }}
      />
      <div style={{ color: "#4a6fa8", fontSize: "14px", letterSpacing: "1px" }}>
        Mapping your knowledge universe...
      </div>
      <div style={{ color: "#2a3448", fontSize: "11px" }}>
        Loading {nodeCount} nodes
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const KnowledgeGalaxy: React.FC<IKnowledgeGalaxyProps> = (props) => {
  const {
    siteUrl: _siteUrl,
    maxDocuments,
    enableMockData,
    autoRotateSpeed,
    title,
  } = props;

  // -- State -----------------------------------------------------------------
  const [graph, setGraph] = useState<GalaxyGraph | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GalaxyNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [searchResultCount, setSearchResultCount] = useState<number>(0);
  const [searchProjectCount, setSearchProjectCount] = useState<number>(0);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPos | null>(
    null,
  );

  // -- Refs ------------------------------------------------------------------
  const galaxyRendererRef = useRef<GalaxyRendererHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Data init -------------------------------------------------------------
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const rawGraph = MockDataService.getGalaxyGraph();
      const positionedGraph = GalaxyDataMapper.mapPositions(rawGraph);
      setGraph(positionedGraph);
      setIsLoading(false);

      MockDataService.validateGraph(rawGraph);
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Render config ---------------------------------------------------------
  const renderConfig: GalaxyRenderConfig = {
    backgroundColor: "#020408",
    starFieldCount: 3000,
    autoRotateSpeed: autoRotateSpeed ?? 0.0001,
    enableOrbits: true,
    enableEdges: true,
    maxDocuments: maxDocuments ?? 200,
    enableMockData: enableMockData ?? true,
  };

  // -- Escape key: clear selection + highlights ─────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setHighlightedNodeIds([]);
      setSelectedNode(null);
      setSearchResultCount(0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // -- Mouse tracking for tooltip -------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  // -- Handlers --------------------------------------------------------------
  const handleNodeClick = useCallback(
    (node: GalaxyNode): void => {
      setSelectedNode(node);

      if (!graph) return;

      const visibleIds = new Set<string>();

      if (node.type === "project") {
        visibleIds.add(node.id);
        const people = graph.nodes.filter((n) => n.parentId === node.id);
        people.forEach((p) => {
          visibleIds.add(p.id);
          graph.nodes
            .filter((n) => n.parentId === p.id)
            .forEach((d) => visibleIds.add(d.id));
        });
      } else if (node.type === "person") {
        visibleIds.add(node.id);
        const parentProject = graph.nodes.find((n) => n.id === node.parentId);
        if (parentProject) visibleIds.add(parentProject.id);
        graph.nodes
          .filter((n) => n.parentId === node.id)
          .forEach((d) => visibleIds.add(d.id));
      } else {
        // document
        visibleIds.add(node.id);
        const author = graph.nodes.find((n) => n.id === node.parentId);
        if (author) {
          visibleIds.add(author.id);
          const project = graph.nodes.find((n) => n.id === author.parentId);
          if (project) visibleIds.add(project.id);
          graph.nodes
            .filter((n) => n.parentId === author.id)
            .forEach((d) => visibleIds.add(d.id));
        }
      }

      setHighlightedNodeIds(Array.from(visibleIds));
    },
    [graph],
  );

  const handleNodeHover = useCallback((node: GalaxyNode | null): void => {
    setHoveredNode(node);
    if (!node) setTooltipPosition(null);
  }, []);

  const handleSearchResults = useCallback(
    (matchedNodeIds: string[]): void => {
      setHighlightedNodeIds(matchedNodeIds);
      setSearchResultCount(matchedNodeIds.length);

      if (graph) {
        const matchedNodes = graph.nodes.filter((n) =>
          matchedNodeIds.includes(n.id),
        );
        const projectIds = new Set(
          matchedNodes
            .map((n) => n.parentId)
            .filter((id): id is string => Boolean(id)),
        );
        setSearchProjectCount(projectIds.size);
      }
    },
    [graph],
  );

  const handleClearSearch = useCallback((): void => {
    setHighlightedNodeIds([]);
    setSearchResultCount(0);
    setSearchProjectCount(0);
  }, []);

  // Listen for external search/reset requests (e.g. from QuickAccess web part)
  useEffect(() => {
    const searchHandler = (e: CustomEvent): void => {
      if (!e.detail?.query || !graph) return;
      const query = (e.detail.query as string).toLowerCase().trim();
      const matched = graph.nodes.filter((n) => {
        if (query === "documents" || query === "docs") return n.type === "document";
        if (query === "projects") return n.type === "project";
        if (query === "people" || query === "team") return n.type === "person";
        return n.label.toLowerCase().includes(query);
      });
      handleSearchResults(matched.map((n) => n.id));
    };
    const resetHandler = (): void => handleClearSearch();

    window.addEventListener("galaxy-search", searchHandler as EventListener);
    window.addEventListener("galaxy-reset", resetHandler);
    return () => {
      window.removeEventListener("galaxy-search", searchHandler as EventListener);
      window.removeEventListener("galaxy-reset", resetHandler);
    };
  }, [graph, handleSearchResults, handleClearSearch]);

  const handleFindRelated = useCallback(
    (nodeId: string): void => {
      if (!graph) return;

      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const cascadedIds = new Set<string>([nodeId]);

      if (node.type === "project") {
        graph.nodes
          .filter((n) => n.parentId === nodeId)
          .forEach((person) => {
            cascadedIds.add(person.id);
            graph.nodes
              .filter((n) => n.parentId === person.id)
              .forEach((doc) => cascadedIds.add(doc.id));
          });
      }

      if (node.type === "person") {
        graph.nodes
          .filter((n) => n.parentId === nodeId)
          .forEach((doc) => cascadedIds.add(doc.id));
      }

      // Also include directly connected edge nodes
      graph.edges
        .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
        .forEach((e) => {
          cascadedIds.add(e.sourceId);
          cascadedIds.add(e.targetId);
        });

      setHighlightedNodeIds(Array.from(cascadedIds));
      setSearchResultCount(cascadedIds.size);
      setSelectedNode(null);

      // Fly camera to centroid of the highlighted cluster for project nodes
      if (node.type === "project" && galaxyRendererRef.current) {
        const allHighlightedNodes = graph.nodes.filter((n) =>
          cascadedIds.has(n.id),
        );
        const positions = allHighlightedNodes.map((n) => n.position);
        if (positions.length > 0) {
          const centroid = {
            x: positions.reduce((s, p) => s + p.x, 0) / positions.length,
            y: positions.reduce((s, p) => s + p.y, 0) / positions.length,
            z: positions.reduce((s, p) => s + p.z, 0) / positions.length,
          };
          galaxyRendererRef.current.flyToCentroid(centroid, 60);
        }
      }
    },
    [graph],
  );

  const handleClosePanel = useCallback((): void => {
    setSelectedNode(null);
  }, []);

  // -- Render ----------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      style={{ width: "100%", fontFamily: "Segoe UI, sans-serif" }}
      onMouseMove={handleMouseMove}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: "22px",
            fontWeight: 500,
            color: "#e8eaf0",
            marginBottom: "16px",
          }}
        >
          {title}
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && graph && (
        <StatsBar graph={graph} highlightedCount={highlightedNodeIds.length} />
      )}

      {/* Main galaxy container */}
      <div style={{ position: "relative", width: "100%" }}>
        {isLoading ? (
          <LoadingScreen nodeCount={graph?.nodes.length ?? 0} />
        ) : graph ? (
          <>
            <GalaxyRenderer
              ref={galaxyRendererRef}
              graph={graph}
              config={renderConfig}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              highlightedNodeIds={highlightedNodeIds}
              selectedNodeId={selectedNode?.id ?? null}
            />

            <SearchPanel
              graph={graph}
              onSearchResults={handleSearchResults}
              onClearSearch={handleClearSearch}
              isSearching={highlightedNodeIds.length > 0}
              resultCount={searchResultCount}
              projectCount={searchProjectCount}
            />

            <NodeDetailPanel
              node={selectedNode}
              graph={graph}
              onClose={handleClosePanel}
              onFindRelated={handleFindRelated}
            />

            <GalaxyLegend />

            {hoveredNode && tooltipPosition && (
              <NodeTooltip node={hoveredNode} position={tooltipPosition} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default KnowledgeGalaxy;
