import * as React from "react";
import { useState, useCallback } from "react";
import { GalaxyGraph } from "../models/GalaxyTypes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ISearchPanelProps {
  graph: GalaxyGraph;
  onSearchResults: (matchedNodeIds: string[]) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  resultCount: number;
  projectCount: number;
}

// ---------------------------------------------------------------------------
// Quick chip definition
// ---------------------------------------------------------------------------

interface QuickChip {
  label: string;
  action: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MAX_RECENT = 5;

const SearchPanel: React.FC<ISearchPanelProps> = ({
  graph,
  onSearchResults,
  onClearSearch,
  resultCount,
  projectCount,
}) => {
  const [query, setQuery] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [chipHover, setChipHover] = useState<string | null>(null);

  // ── Search logic ──────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (q: string): void => {
      const trimmed = q.toLowerCase().trim();
      if (!trimmed) {
        onClearSearch();
        return;
      }

      let matched = graph.nodes.filter((node) => {
        // Type keyword shortcuts
        if (trimmed === "documents" || trimmed === "docs") {
          return node.type === "document";
        }
        if (trimmed === "people" || trimmed === "team") {
          return node.type === "person";
        }
        if (trimmed === "projects") {
          return node.type === "project";
        }

        // Field-level matching
        if (node.label.toLowerCase().includes(trimmed)) return true;
        if (node.metadata.fileType?.toLowerCase().includes(trimmed))
          return true;
        if (node.metadata.department?.toLowerCase().includes(trimmed))
          return true;
        if (node.metadata.jobTitle?.toLowerCase().includes(trimmed))
          return true;
        if (node.metadata.description?.toLowerCase().includes(trimmed))
          return true;
        return false;
      });

      // Handle type keyword matches that aren't caught by field matching
      if (
        trimmed === "documents" ||
        trimmed === "docs" ||
        trimmed === "people" ||
        trimmed === "team" ||
        trimmed === "projects"
      ) {
        // already handled inside filter above — matched is correct
      }

      // Cascade: project → people → docs; person → docs
      const cascadedIds = new Set<string>(matched.map((n) => n.id));
      matched.forEach((matchedNode) => {
        if (matchedNode.type === "project") {
          graph.nodes
            .filter((n) => n.parentId === matchedNode.id)
            .forEach((person) => {
              cascadedIds.add(person.id);
              graph.nodes
                .filter((n) => n.parentId === person.id)
                .forEach((doc) => cascadedIds.add(doc.id));
            });
        }
        if (matchedNode.type === "person") {
          graph.nodes
            .filter((n) => n.parentId === matchedNode.id)
            .forEach((doc) => cascadedIds.add(doc.id));
        }
      });
      onSearchResults(Array.from(cascadedIds));
      setRecentSearches((prev) => {
        const deduped = [trimmed, ...prev.filter((s) => s !== trimmed)];
        return deduped.slice(0, MAX_RECENT);
      });
    },
    [graph.nodes, onSearchResults, onClearSearch],
  );

  const handleClear = useCallback((): void => {
    setQuery("");
    onClearSearch();
  }, [onClearSearch]);

  // ── Quick chip actions ────────────────────────────────────────────────────

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const quickChips: QuickChip[] = [
    {
      label: "Recent documents",
      action: () => {
        const ids = graph.nodes
          .filter(
            (n) =>
              n.type === "document" &&
              n.metadata.lastModified instanceof Date &&
              n.metadata.lastModified >= thirtyDaysAgo,
          )
          .map((n) => n.id);
        onSearchResults(ids);
      },
    },
    {
      label: "My team",
      action: () => {
        const ids = graph.nodes
          .filter((n) => n.type === "person")
          .map((n) => n.id);
        onSearchResults(ids);
      },
    },
    {
      label: "All projects",
      action: () => {
        const ids = graph.nodes
          .filter((n) => n.type === "project")
          .map((n) => n.id);
        onSearchResults(ids);
      },
    },
    {
      label: "Untagged content",
      action: () => {
        const ids = graph.nodes
          .filter(
            (n) => n.type === "document" && n.metadata.fileType === "other",
          )
          .map((n) => n.id);
        onSearchResults(ids);
      },
    },
    {
      label: "Large files",
      action: () => {
        const ids = graph.nodes
          .filter(
            (n) =>
              n.type === "document" && (n.metadata.sizeBytes ?? 0) > 2_000_000,
          )
          .map((n) => n.id);
        onSearchResults(ids);
      },
    },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  const styles = {
    outer: {
      position: "absolute" as const,
      top: "20px",
      left: "20px",
      zIndex: 100,
      width: "320px",
      fontFamily: "Segoe UI, sans-serif",
    },
    card: {
      background: "rgba(6, 8, 15, 0.92)",
      border: "0.5px solid #1e2a4a",
      borderRadius: "12px",
      padding: "16px",
      backdropFilter: "blur(8px)",
    },
    headerRow: {
      display: "flex" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: "12px",
    },
    headerLabel: {
      fontSize: "13px",
      color: "#4a6fa8",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
    toggleBtn: {
      background: "none",
      border: "0.5px solid #1e2a4a",
      borderRadius: "4px",
      color: "#4a6fa8",
      fontSize: "14px",
      cursor: "pointer",
      lineHeight: "1",
      padding: "0 6px",
    },
    inputRow: {
      position: "relative" as const,
      marginBottom: "10px",
    },
    input: {
      width: "100%",
      background: "#08091a",
      border: "0.5px solid #1e2a4a",
      borderRadius: "8px",
      padding: "10px 48px 10px 14px",
      color: "#c8d0e8",
      fontSize: "15px",
      outline: "none",
      boxSizing: "border-box" as const,
    },
    goBtn: {
      position: "absolute" as const,
      right: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "#1a3a7a",
      border: "none",
      borderRadius: "6px",
      padding: "4px 10px",
      color: "#a8c4ff",
      fontSize: "11px",
      cursor: "pointer",
    },
    chipArea: {
      marginBottom: "10px",
    },
    chip: (hovered: boolean): React.CSSProperties => ({
      display: "inline-block",
      background: "#0a0d1a",
      border: `0.5px solid ${hovered ? "#2a4a7a" : "#1e2a4a"}`,
      borderRadius: "12px",
      padding: "4px 10px",
      fontSize: "13px",
      color: hovered ? "#a8b8f8" : "#6878a0",
      cursor: "pointer",
      margin: "3px 3px 0 0",
      transition: "color 0.15s, border-color 0.15s",
    }),
    resultsBadge: {
      background: "#0d1e3a",
      borderRadius: "6px",
      padding: "6px 12px",
      fontSize: "13px",
      color: "#4a90d9",
      marginTop: "10px",
      display: "flex" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    clearBtn: {
      background: "none",
      border: "none",
      color: "#4a5a78",
      fontSize: "13px",
      cursor: "pointer",
    },
    recentSection: {
      marginTop: "10px",
      borderTop: "0.5px solid #0e1020",
      paddingTop: "8px",
    },
    recentLabel: {
      fontSize: "12px",
      color: "#2a3448",
      marginBottom: "6px",
    },
    recentItem: {
      fontSize: "13px",
      color: "#4a5a78",
      cursor: "pointer",
      padding: "2px 0",
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        {/* Header row */}
        <div style={styles.headerRow}>
          <span style={styles.headerLabel}>Knowledge search</span>
          <button
            style={styles.toggleBtn}
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={
              isExpanded ? "Collapse search panel" : "Expand search panel"
            }
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Input row */}
            <div style={styles.inputRow}>
              <input
                style={styles.input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch(query);
                }}
                placeholder="Search the galaxy..."
                aria-label="Search knowledge galaxy"
              />
              <button
                style={styles.goBtn}
                onClick={() => handleSearch(query)}
                aria-label="Run search"
              >
                Go
              </button>
            </div>

            {/* Quick chips */}
            <div style={styles.chipArea}>
              {quickChips.map((chip) => (
                <span
                  key={chip.label}
                  style={styles.chip(chipHover === chip.label)}
                  onClick={() => chip.action()}
                  onMouseEnter={() => setChipHover(chip.label)}
                  onMouseLeave={() => setChipHover(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") chip.action();
                  }}
                  aria-label={`Quick search: ${chip.label}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>

            {/* Results badge */}
            {resultCount > 0 && (
              <div style={styles.resultsBadge}>
                <span>
                  {resultCount} node{resultCount !== 1 ? "s" : ""} across{" "}
                  {projectCount} project{projectCount !== 1 ? "s" : ""}
                </span>
                <button style={styles.clearBtn} onClick={handleClear}>
                  Clear
                </button>
              </div>
            )}

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div style={styles.recentSection}>
                <div style={styles.recentLabel}>Recent</div>
                {recentSearches.map((s) => (
                  <div
                    key={s}
                    style={styles.recentItem}
                    onClick={() => {
                      setQuery(s);
                      handleSearch(s);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setQuery(s);
                        handleSearch(s);
                      }
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
