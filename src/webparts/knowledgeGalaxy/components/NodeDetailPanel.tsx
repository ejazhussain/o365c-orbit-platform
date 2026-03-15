import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { GalaxyGraph, GalaxyNode } from "../models/GalaxyTypes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface INodeDetailPanelProps {
  node: GalaxyNode | null;
  graph: GalaxyGraph;
  onClose: () => void;
  onFindRelated: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RelatedNode {
  node: GalaxyNode;
  strength: number;
}

function getRelatedNodes(node: GalaxyNode, graph: GalaxyGraph): GalaxyNode[] {
  const related: RelatedNode[] = [];
  for (const edge of graph.edges) {
    let otherId: string | null = null;
    if (edge.sourceId === node.id) otherId = edge.targetId;
    else if (edge.targetId === node.id) otherId = edge.sourceId;
    if (otherId) {
      const other = graph.nodes.find((n) => n.id === otherId);
      if (other) related.push({ node: other, strength: edge.strength });
    }
  }
  return related
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map((r) => r.node);
}

function getNodesByParent(parentId: string, graph: GalaxyGraph): GalaxyNode[] {
  return graph.nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => (b.metadata.viewCount ?? 0) - (a.metadata.viewCount ?? 0))
    .slice(0, 5);
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDate(date: Date | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

function getFileTypeLabel(fileType: string | undefined): string {
  switch (fileType) {
    case "pdf":
      return "PDF Document";
    case "docx":
      return "Word Document";
    case "xlsx":
      return "Excel Spreadsheet";
    case "pptx":
      return "PowerPoint";
    default:
      return "Document";
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  panel: (visible: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    width: "360px",
    background: "rgba(6, 8, 15, 0.96)",
    borderLeft: "0.5px solid #1e2a4a",
    zIndex: 200,
    overflowY: "auto",
    transition: "transform 0.3s ease",
    transform: visible ? "translateX(0)" : "translateX(100%)",
    fontFamily: "Segoe UI, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  }),

  closeBtn: {
    position: "absolute" as const,
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#4a5a78",
    fontSize: "18px",
    cursor: "pointer",
    lineHeight: "1",
  },

  badge: (type: "document" | "person" | "project"): React.CSSProperties => {
    const map = {
      document: { background: "#0d1e3a", color: "#4a90d9" },
      person: { background: "#1a1240", color: "#7f77dd" },
      project: { background: "#061e18", color: "#1d9e75" },
    };
    return {
      display: "inline-block",
      fontSize: "11px",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: "10px",
      marginBottom: "10px",
      ...map[type],
    };
  },

  title: {
    fontSize: "22px",
    fontWeight: 500,
    color: "#e8eaf0",
    marginBottom: "4px",
    wordBreak: "break-word" as const,
  } as React.CSSProperties,

  subtitle: {
    fontSize: "14px",
    color: "#6878a0",
    marginBottom: "16px",
  },

  sectionHeader: {
    fontSize: "12px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    color: "#4a6fa8",
    marginBottom: "8px",
    marginTop: "20px",
    borderBottom: "0.5px solid #0e1020",
    paddingBottom: "6px",
  },

  metaRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    padding: "6px 0",
    borderBottom: "0.5px solid #080a18",
  },

  metaLabel: {
    fontSize: "13px",
    color: "#4a5a78",
  },

  metaValue: {
    fontSize: "13px",
    color: "#a8b8f8",
    textAlign: "right" as const,
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#1a1a3a",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: "14px",
    fontWeight: 500 as const,
    color: "#a8b8f8",
    marginBottom: "12px",
  },

  actionBtn: (hovered: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    background: hovered ? "#0d1a38" : "#0a1428",
    border: "0.5px solid #1e2a4a",
    borderRadius: "8px",
    padding: "10px 16px",
    color: "#a8b8f8",
    fontSize: "14px",
    cursor: "pointer",
    textAlign: "left",
    marginBottom: "8px",
    transition: "background 0.15s",
    boxSizing: "border-box" as const,
  }),

  relatedChip: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#08091a",
    border: "0.5px solid #0e1020",
    marginBottom: "6px",
    cursor: "pointer",
  },

  dot: (color: string): React.CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),

  chipLabel: {
    fontSize: "13px",
    color: "#6878a0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },

  titleRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    marginBottom: "4px",
  },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div style={S.metaRow}>
      <span style={S.metaLabel}>{label}</span>
      <span style={S.metaValue} title={value}>
        {value}
      </span>
    </div>
  );
}

function RelatedChip({
  node,
  onClick,
}: {
  node: GalaxyNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <div
      style={S.relatedChip}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div style={S.dot(node.color)} />
      <span style={S.chipLabel}>{node.label}</span>
    </div>
  );
}

function PersonChip({
  node,
  onClick,
}: {
  node: GalaxyNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <div
      style={S.relatedChip}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div
        style={{
          ...S.avatar,
          width: "28px",
          height: "28px",
          fontSize: "10px",
          marginBottom: 0,
        }}
      >
        {getInitials(node.label)}
      </div>
      <span style={S.chipLabel}>{node.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const NodeDetailPanel: React.FC<INodeDetailPanelProps> = ({
  node,
  graph,
  onClose,
  onFindRelated,
}) => {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFindRelated = useCallback((): void => {
    if (node) onFindRelated(node.id);
  }, [node, onFindRelated]);

  // -- Derived data (safe to compute when node is null) ----------------------
  const relatedNodes = node ? getRelatedNodes(node, graph) : [];

  const parentPerson = node?.parentId
    ? (graph.nodes.find((n) => n.id === node.parentId) ?? null)
    : null;

  const parentProject =
    node?.type === "document" && parentPerson?.parentId
      ? (graph.nodes.find((n) => n.id === parentPerson.parentId) ?? null)
      : node?.type === "person" && node.parentId
        ? (graph.nodes.find((n) => n.id === node.parentId) ?? null)
        : null;

  const childNodes = node ? getNodesByParent(node.id, graph) : [];

  const ownedDocCount =
    node?.type === "person"
      ? graph.nodes.filter(
          (n) => n.type === "document" && n.parentId === node.id,
        ).length
      : 0;

  // --------------------------------------------------------------------------
  // Layout helpers
  // --------------------------------------------------------------------------

  function renderDocumentLayout(): JSX.Element {
    if (!node) return <></>;
    const { metadata } = node;
    return (
      <>
        <div style={S.badge("document")}>Document</div>

        <div style={S.titleRow}>
          <div style={S.dot(node.color)} />
          <div style={S.title}>{node.label}</div>
        </div>
        <div style={S.subtitle}>{getFileTypeLabel(metadata.fileType)}</div>

        <div style={S.sectionHeader}>Details</div>
        <MetaRow
          label="Last modified"
          value={formatDate(metadata.lastModified)}
        />
        <MetaRow label="File size" value={formatFileSize(metadata.sizeBytes)} />
        <MetaRow label="Views" value={String(metadata.viewCount ?? "—")} />
        <MetaRow label="Author" value={parentPerson?.label ?? "—"} />
        <MetaRow label="Project" value={parentProject?.label ?? "—"} />

        <div style={S.sectionHeader}>Actions</div>
        {metadata.webUrl && (
          <button
            style={S.actionBtn(hoveredAction === "open")}
            onMouseEnter={() => setHoveredAction("open")}
            onMouseLeave={() => setHoveredAction(null)}
            onClick={() => window.open(metadata.webUrl, "_blank")}
          >
            Open document ↗
          </button>
        )}
        <button
          style={S.actionBtn(hoveredAction === "related")}
          onMouseEnter={() => setHoveredAction("related")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={handleFindRelated}
        >
          Find related
        </button>

        {childNodes.length === 0 && parentPerson && (
          <>
            <div style={S.sectionHeader}>More from {parentPerson.label}</div>
            {getNodesByParent(parentPerson.id, graph)
              .filter((n) => n.id !== node.id)
              .slice(0, 4)
              .map((n) => (
                <RelatedChip
                  key={n.id}
                  node={n}
                  onClick={() => onFindRelated(n.id)}
                />
              ))}
          </>
        )}

        {relatedNodes.length > 0 && (
          <>
            <div style={S.sectionHeader}>Related nodes</div>
            {relatedNodes.map((n) => (
              <RelatedChip
                key={n.id}
                node={n}
                onClick={() => onFindRelated(n.id)}
              />
            ))}
          </>
        )}
      </>
    );
  }

  function renderPersonLayout(): JSX.Element {
    if (!node) return <></>;
    const { metadata } = node;
    return (
      <>
        <div style={S.badge("person")}>Person</div>

        <div style={S.avatar}>{getInitials(node.label)}</div>
        <div style={S.title}>{node.label}</div>
        <div style={S.subtitle}>
          {[metadata.jobTitle, metadata.department].filter(Boolean).join(" · ")}
        </div>

        <div style={S.sectionHeader}>Details</div>
        <MetaRow label="Email" value={metadata.email ?? "—"} />
        <MetaRow label="Department" value={metadata.department ?? "—"} />
        <MetaRow label="Documents" value={String(ownedDocCount)} />
        <MetaRow label="Project" value={parentProject?.label ?? "—"} />

        <div style={S.sectionHeader}>Actions</div>
        {metadata.email && (
          <button
            style={S.actionBtn(hoveredAction === "profile")}
            onMouseEnter={() => setHoveredAction("profile")}
            onMouseLeave={() => setHoveredAction(null)}
            onClick={() => window.open(`mailto:${metadata.email}`, "_blank")}
          >
            View profile ↗
          </button>
        )}
        <button
          style={S.actionBtn(hoveredAction === "related")}
          onMouseEnter={() => setHoveredAction("related")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={handleFindRelated}
        >
          Highlight all my documents
        </button>

        {childNodes.length > 0 && (
          <>
            <div style={S.sectionHeader}>Recent documents</div>
            {childNodes.map((n) => (
              <RelatedChip
                key={n.id}
                node={n}
                onClick={() => onFindRelated(n.id)}
              />
            ))}
          </>
        )}
      </>
    );
  }

  function renderProjectLayout(): JSX.Element {
    if (!node) return <></>;
    const { metadata } = node;

    // Derive real counts from the live graph rather than stale metadata
    const projectPeople = graph.nodes.filter(
      (n) => n.parentId === node.id && n.type === "person",
    );
    const personIds = projectPeople.map((p) => p.id);
    const actualDocCount = graph.nodes.filter(
      (n) => n.type === "document" && personIds.includes(n.parentId ?? ""),
    ).length;
    const actualMemberCount = projectPeople.length;

    const teamMembers = projectPeople.slice(0, 5);

    return (
      <>
        <div style={S.badge("project")}>Project</div>

        <div style={S.titleRow}>
          <div style={S.dot(node.color)} />
          <div style={S.title}>{node.label}</div>
        </div>
        <div style={S.subtitle}>{metadata.description ?? ""}</div>

        <div style={S.sectionHeader}>Details</div>
        <MetaRow label="Documents" value={String(actualDocCount)} />
        <MetaRow label="Members" value={String(actualMemberCount)} />
        {metadata.description && (
          <MetaRow label="Description" value={metadata.description} />
        )}

        <div style={S.sectionHeader}>Actions</div>
        <button
          style={S.actionBtn(hoveredAction === "explore")}
          onMouseEnter={() => setHoveredAction("explore")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={handleFindRelated}
        >
          Explore all {actualDocCount} documents in galaxy
        </button>

        {teamMembers.length > 0 && (
          <>
            <div style={S.sectionHeader}>Team members</div>
            {teamMembers.map((n) => (
              <PersonChip
                key={n.id}
                node={n}
                onClick={() => onFindRelated(n.id)}
              />
            ))}
          </>
        )}

        {relatedNodes.length > 0 && (
          <>
            <div style={S.sectionHeader}>Related nodes</div>
            {relatedNodes.map((n) => (
              <RelatedChip
                key={n.id}
                node={n}
                onClick={() => onFindRelated(n.id)}
              />
            ))}
          </>
        )}
      </>
    );
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!node) return null;

  return (
    <div
      style={S.panel(node !== null)}
      role="complementary"
      aria-label="Node details"
    >
      <button style={S.closeBtn} onClick={onClose} aria-label="Close panel">
        ×
      </button>

      {node !== null && (
        <>
          {node.type === "document" && renderDocumentLayout()}
          {node.type === "person" && renderPersonLayout()}
          {node.type === "project" && renderProjectLayout()}
        </>
      )}
    </div>
  );
};

export default NodeDetailPanel;
