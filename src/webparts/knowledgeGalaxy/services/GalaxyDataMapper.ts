import * as THREE from "three";
import { FileTypeColor, GalaxyGraph, GalaxyNode } from "../models/GalaxyTypes";

// ---------------------------------------------------------------------------
// Return type for getGraphStats
// ---------------------------------------------------------------------------

export interface GalaxyGraphStats {
  totalNodes: number;
  totalEdges: number;
  projectCount: number;
  personCount: number;
  documentCount: number;
  avgConnectionsPerNode: number;
}

// ---------------------------------------------------------------------------
// GalaxyDataMapper
// ---------------------------------------------------------------------------

/**
 * Pure-static service that calculates world-space positions for every node
 * in a {@link GalaxyGraph} and exposes a set of graph analytics helpers.
 *
 * Input graphs may have all positions zeroed (e.g. from {@link MockDataService}).
 * Calling {@link mapPositions} returns a new graph with fully resolved positions
 * without mutating the original.
 */
export class GalaxyDataMapper {
  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 1 — mapPositions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Main entry point. Deep-clones the graph, applies colours, then
   * positions projects → people → documents in order.
   *
   * @param graph - Source graph with zeroed positions.
   * @returns A new {@link GalaxyGraph} with every node positioned and coloured.
   */
  public static mapPositions(graph: GalaxyGraph): GalaxyGraph {
    // Work on cloned nodes so the original is never mutated.
    const clonedNodes: GalaxyNode[] = graph.nodes.map((n) => ({
      ...n,
      position: n.position.clone(),
      connections: [...n.connections],
      metadata: { ...n.metadata },
    }));

    const projectNodes = clonedNodes.filter((n) => n.type === "project");
    const personNodes = clonedNodes.filter((n) => n.type === "person");
    const documentNodes = clonedNodes.filter((n) => n.type === "document");

    // Apply colour first so position helpers can read it if needed.
    clonedNodes.forEach((n) => {
      n.color = GalaxyDataMapper.getNodeColor(n);
    });

    const positionedProjects = GalaxyDataMapper.positionProjects(projectNodes);
    const positionedPeople = GalaxyDataMapper.positionPeople(
      personNodes,
      positionedProjects,
    );
    const positionedDocs = GalaxyDataMapper.positionDocuments(
      documentNodes,
      positionedPeople,
    );

    // Merge back in original order.
    const nodeById = new Map<string, GalaxyNode>();
    [...positionedProjects, ...positionedPeople, ...positionedDocs].forEach(
      (n) => nodeById.set(n.id, n),
    );

    const finalNodes = clonedNodes.map((n) => nodeById.get(n.id) ?? n);

    return {
      nodes: finalNodes,
      edges: graph.edges,
      lastUpdated: graph.lastUpdated,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 2 — positionProjects
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Distributes project (nebula) nodes across the sphere surface using the
   * golden-angle spiral so they are evenly spread with no polar clustering.
   *
   * @param nodes - Project nodes (position may be zeroed).
   * @returns The same array with updated positions and orbital fields.
   */
  public static positionProjects(nodes: GalaxyNode[]): GalaxyNode[] {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈ 137.508°
    const total = nodes.length;
    const radius = 45;

    return nodes.map((node, i) => {
      const t = i / total;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = goldenAngle * i;

      const x = radius * Math.sin(inclination) * Math.cos(azimuth);
      const y = radius * Math.cos(inclination) * 0.6; // flatten Y axis
      const z = radius * Math.sin(inclination) * Math.sin(azimuth);

      return {
        ...node,
        position: new THREE.Vector3(x, y, z),
        orbitRadius: 0,
        orbitSpeed: 0,
        size: 1.0,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 3 — positionPeople
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Places each person node in an orbit around its parent project.
   *
   * @param nodes - Person nodes (position may be zeroed).
   * @param projectNodes - Already-positioned project nodes.
   * @returns Person nodes with calculated positions and orbital fields.
   */
  public static positionPeople(
    nodes: GalaxyNode[],
    projectNodes: GalaxyNode[],
  ): GalaxyNode[] {
    const projectMap = new Map<string, GalaxyNode>(
      projectNodes.map((p) => [p.id, p]),
    );

    // Group people by project so angles are evenly distributed per-project.
    const peopleByProject = new Map<string, GalaxyNode[]>();
    for (const person of nodes) {
      const key = person.parentId ?? "__orphan__";
      const group = peopleByProject.get(key) ?? [];
      group.push(person);
      peopleByProject.set(key, group);
    }

    return nodes.map((node, globalIndex) => {
      const project = projectMap.get(node.parentId ?? "");
      if (!project) {
        // No parent found — position at origin and return unchanged.
        return { ...node, position: new THREE.Vector3(0, 0, 0) };
      }

      const siblings = peopleByProject.get(node.parentId ?? "") ?? [node];
      const personIndexWithinProject = siblings.findIndex(
        (p) => p.id === node.id,
      );
      const total = siblings.length;

      const angle = (personIndexWithinProject / total) * Math.PI * 2;
      const orbitRadius = 16 + ((globalIndex * 5) % 8); // 16–23 units
      const orbitSpeed = 0.0008 + ((globalIndex * 0.00015) % 0.0012); // unique per person

      const x = project.position.x + orbitRadius * Math.cos(angle);
      const y = project.position.y + ((globalIndex % 3) - 1) * 4; // slight Y variation
      const z = project.position.z + orbitRadius * Math.sin(angle);

      return {
        ...node,
        position: new THREE.Vector3(x, y, z),
        orbitRadius,
        orbitAngle: angle,
        orbitSpeed,
        size: 1.2,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 4 — positionDocuments
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Places each document node in an orbit around its parent person node.
   *
   * @param nodes - Document nodes (position may be zeroed).
   * @param personNodes - Already-positioned person nodes.
   * @returns Document nodes with calculated positions and orbital fields.
   */
  public static positionDocuments(
    nodes: GalaxyNode[],
    personNodes: GalaxyNode[],
  ): GalaxyNode[] {
    const personMap = new Map<string, GalaxyNode>(
      personNodes.map((p) => [p.id, p]),
    );

    // Build per-person document lists to derive within-person index and total.
    const docsByPerson = new Map<string, GalaxyNode[]>();
    for (const doc of nodes) {
      const key = doc.parentId ?? "__orphan__";
      const group = docsByPerson.get(key) ?? [];
      group.push(doc);
      docsByPerson.set(key, group);
    }

    return nodes.map((node) => {
      const person = personMap.get(node.parentId ?? "");
      if (!person) {
        return { ...node, position: new THREE.Vector3(0, 0, 0) };
      }

      const siblings = docsByPerson.get(node.parentId ?? "") ?? [node];
      const docIndexWithinPerson = siblings.findIndex((d) => d.id === node.id);
      const totalDocsForPerson = siblings.length;

      const angle = (docIndexWithinPerson / totalDocsForPerson) * Math.PI * 2;
      const orbitRadius = 4 + ((docIndexWithinPerson * 1.5) % 4); // 4–7 units
      const orbitSpeed = 0.002 + ((docIndexWithinPerson * 0.0008) % 0.003);
      const tilt = (docIndexWithinPerson % 3) * 0.4; // orbital tilt

      const viewCount = node.metadata.viewCount ?? 10;
      const size = 0.2 + Math.min(viewCount / 400, 0.8); // popularity-scaled

      const x = person.position.x + orbitRadius * Math.cos(angle);
      const y = person.position.y + Math.sin(angle + tilt) * 2;
      const z = person.position.z + orbitRadius * Math.sin(angle);

      return {
        ...node,
        position: new THREE.Vector3(x, y, z),
        orbitRadius,
        orbitAngle: angle,
        orbitSpeed,
        size,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 5 — getNodeColor
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolves the display colour for a node based on its type and,
   * for documents, its MIME/file-type sub-classification.
   *
   * @param node - Any {@link GalaxyNode}.
   * @returns A CSS hex colour string.
   */
  public static getNodeColor(node: GalaxyNode): string {
    switch (node.type) {
      case "project":
        return "#1D9E75";
      case "person":
        return "#AACCFF";
      case "document": {
        const ft = node.metadata.fileType ?? "other";
        const colorMap = FileTypeColor as Record<string, string>;
        return colorMap[ft] ?? colorMap["other"];
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 6 — getGraphStats
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Computes summary statistics for a {@link GalaxyGraph}.
   *
   * @param graph - Any graph (positioned or not).
   * @returns A {@link GalaxyGraphStats} plain object.
   */
  public static getGraphStats(graph: GalaxyGraph): GalaxyGraphStats {
    const totalNodes = graph.nodes.length;
    const totalEdges = graph.edges.length;

    const projectCount = graph.nodes.filter((n) => n.type === "project").length;
    const personCount = graph.nodes.filter((n) => n.type === "person").length;
    const documentCount = graph.nodes.filter(
      (n) => n.type === "document",
    ).length;

    const totalConnections = graph.nodes.reduce(
      (sum, n) => sum + n.connections.length,
      0,
    );
    const avgConnectionsPerNode =
      totalNodes > 0
        ? Math.round((totalConnections / totalNodes) * 10) / 10
        : 0;

    return {
      totalNodes,
      totalEdges,
      projectCount,
      personCount,
      documentCount,
      avgConnectionsPerNode,
    };
  }
}
