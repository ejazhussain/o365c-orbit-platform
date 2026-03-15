import * as React from "react";
import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import {
  GalaxyGraph,
  GalaxyNode,
  GalaxyRenderConfig,
} from "../models/GalaxyTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Convenience alias – every node mesh uses MeshStandardMaterial. */
type StdMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

/** Spherical camera coordinate state. */
interface SphericalCoord {
  theta: number;
  phi: number;
  radius: number;
}

/** Previous mouse position used for drag-rotation delta. */
interface MousePos {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IGalaxyRendererProps {
  graph: GalaxyGraph;
  config: GalaxyRenderConfig;
  onNodeClick: (node: GalaxyNode) => void;
  onNodeHover: (node: GalaxyNode | null) => void;
  highlightedNodeIds: string[];
  selectedNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Ref handle (imperative API)
// ---------------------------------------------------------------------------

export interface GalaxyRendererHandle {
  /** Immediately apply highlight/dim state to all meshes. */
  highlightNodes: (nodeIds: string[]) => void;
  /** Smoothly fly the camera to orbit around the given world-space centroid. */
  flyToCentroid: (
    centroid: { x: number; y: number; z: number },
    targetRadius: number,
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Creates a soft radial gradient canvas texture for circular point sprites. */
function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Creates a billboard text-label sprite for a project node. */
function createTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Transparent background
  ctx.clearRect(0, 0, 256, 64);

  // Pill background
  ctx.fillStyle = "rgba(6, 8, 15, 0.75)";
  ctx.beginPath();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).roundRect(4, 4, 248, 56, 12);
  ctx.fill();

  // Pill border in project colour
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).roundRect(4, 4, 248, 56, 12);
  ctx.stroke();

  // Colour dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(28, 32, 8, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.fillStyle = "#e8eaf0";
  ctx.font = "bold 22px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 46, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 3, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GalaxyRenderer = forwardRef<GalaxyRendererHandle, IGalaxyRendererProps>(
  (props, ref) => {
    const {
      graph,
      config,
      onNodeClick,
      onNodeHover,
      highlightedNodeIds,
      selectedNodeId,
    } = props;

    // ── DOM ────────────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Three.js core objects ──────────────────────────────────────────────
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());

    // ── Scene state ────────────────────────────────────────────────────────
    const nodeMeshesRef = useRef<Map<string, StdMesh>>(new Map());
    const animFrameRef = useRef<number>(0);

    // ── Camera interaction ─────────────────────────────────────────────────
    const isDraggingRef = useRef<boolean>(false);
    const previousMouseRef = useRef<MousePos>({ x: 0, y: 0 });
    const sphericalRef = useRef<SphericalCoord>({
      theta: 0,
      phi: Math.PI / 2,
      radius: 250,
    });

    // ── Fly-to target ──────────────────────────────────────────────────────
    const targetNodeRef = useRef<GalaxyNode | null>(null);

    // ── Active fly animation frame id (cancelable) ────────────────────────
    const flyAnimRef = useRef<number>(0);

    // ── Mouse-down position for click-vs-drag detection ───────────────────
    const mouseDownPosRef = useRef<MousePos>({ x: 0, y: 0 });

    // ── Hover raycasting frame-skip counter ────────────────────────────────
    const hoverFrameRef = useRef<number>(0);

    // ── Mutable copies of nodes for orbital animation ──────────────────────
    const mutableNodesRef = useRef<GalaxyNode[]>([]);
    const nodeMapRef = useRef<Map<string, GalaxyNode>>(new Map());

    // ── Prop refs to avoid stale closures in rAF ──────────────────────────
    const highlightedIdsRef = useRef<string[]>(highlightedNodeIds);
    const selectedIdRef = useRef<string | null>(selectedNodeId);
    const configRef = useRef<GalaxyRenderConfig>(config);
    const onNodeClickRef = useRef<(node: GalaxyNode) => void>(onNodeClick);
    const onNodeHoverRef =
      useRef<(node: GalaxyNode | null) => void>(onNodeHover);

    // Sync prop refs
    useEffect(() => {
      highlightedIdsRef.current = highlightedNodeIds;
    }, [highlightedNodeIds]);
    useEffect(() => {
      selectedIdRef.current = selectedNodeId;
    }, [selectedNodeId]);
    useEffect(() => {
      configRef.current = config;
    }, [config]);
    useEffect(() => {
      onNodeClickRef.current = onNodeClick;
    }, [onNodeClick]);
    useEffect(() => {
      onNodeHoverRef.current = onNodeHover;
    }, [onNodeHover]);

    // ── Imperative handle ──────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      highlightNodes: (nodeIds: string[]) => {
        highlightedIdsRef.current = nodeIds;
      },
      flyToCentroid: (
        centroid: { x: number; y: number; z: number },
        targetRadius: number,
      ): void => {
        const duration = 90;
        let frame = 0;
        const startTheta = sphericalRef.current.theta;
        const startPhi = sphericalRef.current.phi;
        const startRadius = sphericalRef.current.radius;
        const targetTheta = Math.atan2(centroid.z, centroid.x);
        const targetPhi = Math.PI / 2.2;

        const easeInOut = (t: number): number =>
          t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const step = (): void => {
          if (frame >= duration) return;
          const t = easeInOut(frame / duration);
          sphericalRef.current.theta =
            startTheta + (targetTheta - startTheta) * t;
          sphericalRef.current.phi = clamp(
            startPhi + (targetPhi - startPhi) * t,
            0.1,
            Math.PI - 0.1,
          );
          sphericalRef.current.radius =
            startRadius + (targetRadius - startRadius) * t;
          frame++;
          requestAnimationFrame(step);
        };
        step();
      },
    }));

    // ─────────────────────────────────────────────────────────────────────
    // flyToNode
    // ─────────────────────────────────────────────────────────────────────

    const flyToNode = useCallback((node: GalaxyNode): void => {
      // Type-based zoom levels
      const targetRadius =
        node.type === "project" ? 35 : node.type === "person" ? 20 : 12;

      const targetPos = node.position;
      const duration = 80;
      let frame = 0;

      const startTheta = sphericalRef.current.theta;
      const startPhi = sphericalRef.current.phi;
      const startRadius = sphericalRef.current.radius;

      // Compute angles pointing directly at the node
      const dist = Math.sqrt(
        targetPos.x * targetPos.x +
          targetPos.y * targetPos.y +
          targetPos.z * targetPos.z,
      );
      const targetTheta = Math.atan2(targetPos.z, targetPos.x);
      const targetPhi =
        dist > 0.001
          ? Math.acos(clamp(targetPos.y / dist, -1, 1))
          : Math.PI / 2;

      const easeInOut = (t: number): number =>
        t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Cancel any in-progress fly
      cancelAnimationFrame(flyAnimRef.current);

      const step = (): void => {
        if (frame >= duration) {
          targetNodeRef.current = null;
          return;
        }
        const t = easeInOut(frame / duration);

        // Shortest-path theta interpolation
        let dTheta = targetTheta - startTheta;
        if (dTheta > Math.PI) dTheta -= Math.PI * 2;
        if (dTheta < -Math.PI) dTheta += Math.PI * 2;

        sphericalRef.current.theta = startTheta + dTheta * t;
        sphericalRef.current.phi = clamp(
          startPhi + (targetPhi - startPhi) * t,
          0.1,
          Math.PI - 0.1,
        );
        sphericalRef.current.radius =
          startRadius + (targetRadius - startRadius) * t;

        frame++;
        flyAnimRef.current = requestAnimationFrame(step);
      };
      flyAnimRef.current = requestAnimationFrame(step);
    }, []);

    // ─────────────────────────────────────────────────────────────────────
    // Raycasting helper
    // ─────────────────────────────────────────────────────────────────────

    const raycastNode = useCallback(
      (clientX: number, clientY: number): GalaxyNode | null => {
        const canvas = canvasRef.current;
        const camera = cameraRef.current;
        if (!canvas || !camera) return null;

        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

        const meshes = Array.from(
          nodeMeshesRef.current.values(),
        ) as THREE.Mesh[];
        const intersects = raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const nodeId = hit.userData["nodeId"] as string | undefined;
          if (nodeId) {
            return nodeMapRef.current.get(nodeId) ?? null;
          }
        }
        return null;
      },
      [],
    );

    // ─────────────────────────────────────────────────────────────────────
    // Event handlers
    // ─────────────────────────────────────────────────────────────────────

    const handleMouseDown = useCallback((e: MouseEvent): void => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback(
      (e: MouseEvent): void => {
        if (isDraggingRef.current) {
          const dx = e.clientX - previousMouseRef.current.x;
          const dy = e.clientY - previousMouseRef.current.y;
          sphericalRef.current.theta -= dx * 0.003;
          sphericalRef.current.phi = clamp(
            sphericalRef.current.phi - dy * 0.003,
            0.1,
            Math.PI - 0.1,
          );
          previousMouseRef.current = { x: e.clientX, y: e.clientY };
        } else {
          hoverFrameRef.current++;
          if (hoverFrameRef.current % 3 === 0) {
            const node = raycastNode(e.clientX, e.clientY);
            onNodeHoverRef.current(node);
            if (canvasRef.current) {
              canvasRef.current.style.cursor = node ? "pointer" : "default";
            }
          }
        }
      },
      [raycastNode],
    );

    const handleMouseUp = useCallback(
      (e: MouseEvent): void => {
        // Distinguish a click (low displacement) from a drag
        const dx = e.clientX - mouseDownPosRef.current.x;
        const dy = e.clientY - mouseDownPosRef.current.y;
        const wasDrag = Math.sqrt(dx * dx + dy * dy) > 4;
        isDraggingRef.current = false;
        if (!wasDrag) {
          const node = raycastNode(e.clientX, e.clientY);
          if (node) {
            targetNodeRef.current = node;
            flyToNode(node);
            onNodeClickRef.current(node);
          }
        }
      },
      [raycastNode, flyToNode],
    );

    // mouseleave only needs to end drag without raycasting
    const handleMouseLeave = useCallback((): void => {
      isDraggingRef.current = false;
    }, []);

    const handleWheel = useCallback((e: WheelEvent): void => {
      e.preventDefault();
      const zoomSpeed = 0.08;
      const target = clamp(
        sphericalRef.current.radius + e.deltaY * zoomSpeed,
        10,
        160,
      );
      const zoomLerp = (): void => {
        const diff = target - sphericalRef.current.radius;
        if (Math.abs(diff) > 0.1) {
          sphericalRef.current.radius += diff * 0.12;
          requestAnimationFrame(zoomLerp);
        } else {
          sphericalRef.current.radius = target;
        }
      };
      zoomLerp();
    }, []);

    const handleDblClick = useCallback(
      (e: MouseEvent): void => {
        const node = raycastNode(e.clientX, e.clientY);
        if (node) {
          targetNodeRef.current = node;
          flyToNode(node);
          onNodeClickRef.current(node);
        }
      },
      [raycastNode, flyToNode],
    );

    // ─────────────────────────────────────────────────────────────────────
    // Scene initialisation + animation loop (runs once on mount)
    // ─────────────────────────────────────────────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      const w = container ? container.clientWidth : canvas.clientWidth;
      const h = container ? container.clientHeight : canvas.clientHeight;

      // ── Renderer ──────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor("#020408");
      rendererRef.current = renderer;

      // ── Scene ──────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // ── Camera ────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      camera.position.set(0, 0, 100);
      scene.add(camera);
      cameraRef.current = camera;
      sphericalRef.current = { theta: 0, phi: Math.PI / 2, radius: 100 };

      // ── Lighting ──────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight("#111133", 0.4));

      const pointLightDefs: [THREE.Vector3Tuple, string][] = [
        [[50, 50, 50], "#334466"],
        [[-50, 30, -50], "#334466"],
        [[0, -50, 50], "#334466"],
      ];
      pointLightDefs.forEach(([pos, col]) => {
        const pl = new THREE.PointLight(col, 0.6, 200);
        pl.position.set(...pos);
        scene.add(pl);
      });

      // ── Shared sprite texture (circular soft glow) ────────────────────
      const circleTexture = createCircleTexture();

      // ── Background star field ──────────────────────────────────────────
      {
        const starCount = configRef.current.starFieldCount || 3000;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 200 + Math.random() * 100;
          positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = r * Math.cos(phi);
          positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        const starMat = new THREE.PointsMaterial({
          color: "#FFFFFF",
          size: 0.3,
          sizeAttenuation: true,
          map: circleTexture,
          alphaTest: 0.01,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        scene.add(new THREE.Points(starGeo, starMat));
      }

      // ── Node meshes ────────────────────────────────────────────────────
      const nodeMeshMap = new Map<string, StdMesh>();
      const mutableNodes: GalaxyNode[] = graph.nodes.map((n) => ({
        ...n,
        position: n.position.clone(),
        connections: [...n.connections],
        metadata: { ...n.metadata },
      }));
      const nodeMap = new Map<string, GalaxyNode>(
        mutableNodes.map((n) => [n.id, n]),
      );

      const projectColors = [
        "#4A90D9",
        "#7B68EE",
        "#50C878",
        "#FF6B6B",
        "#FFD700",
        "#00CED1",
        "#FF69B4",
        "#FFA500",
      ];
      let projectColorIndex = 0;

      mutableNodes.forEach((node) => {
        let geo: THREE.BufferGeometry;
        const mat = new THREE.MeshStandardMaterial({
          color: node.color,
          transparent: true,
          opacity: 1,
        });

        if (node.type === "project") {
          const projectColor =
            projectColors[projectColorIndex % projectColors.length];
          projectColorIndex++;
          geo = new THREE.SphereGeometry(1.0, 16, 16);
          mat.color.set(projectColor);
          mat.emissive = new THREE.Color(projectColor);
          mat.emissiveIntensity = 0.5;

          // Nebula glow light
          const pl = new THREE.PointLight(projectColor, 0.8, 40);
          pl.position.copy(node.position);
          scene.add(pl);

          // Particle cloud
          const cloudCount = 400;
          const cloudPositions = new Float32Array(cloudCount * 3);
          for (let i = 0; i < cloudCount; i++) {
            cloudPositions[i * 3] = (Math.random() - 0.5) * 36;
            cloudPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            cloudPositions[i * 3 + 2] = (Math.random() - 0.5) * 36;
          }
          const cloudGeo = new THREE.BufferGeometry();
          cloudGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(cloudPositions, 3),
          );
          const cloudMat = new THREE.PointsMaterial({
            color: projectColor,
            size: 0.8,
            opacity: 0.55,
            map: circleTexture,
            alphaTest: 0.01,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
          });
          const cloud = new THREE.Points(cloudGeo, cloudMat);
          cloud.position.copy(node.position);
          cloud.userData = { projectId: node.id };
          scene.add(cloud);
        } else if (node.type === "person") {
          geo = new THREE.SphereGeometry(0.8, 12, 12);
          mat.emissive = new THREE.Color("#223355");
          mat.emissiveIntensity = 0.8;
        } else {
          // document
          geo = new THREE.SphereGeometry(Math.max(0.4, node.size * 0.8), 8, 8);
          mat.color.set(node.color);
          mat.emissive = new THREE.Color(node.color);
          mat.emissiveIntensity = 0.5;
          mat.transparent = false;
          mat.roughness = 0.3;
          mat.metalness = 0.1;
        }

        const mesh: StdMesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(node.position);
        mesh.userData = { nodeId: node.id, nodeType: node.type };
        scene.add(mesh);
        nodeMeshMap.set(node.id, mesh);

        // Floating label for project nodes
        if (node.type === "project") {
          const labelColor = "#" + mat.color.getHexString();
          const label = createTextSprite(node.label, labelColor);
          const baseY = node.position.y + 3.5;
          label.position.set(node.position.x, baseY, node.position.z);
          label.userData = {
            isLabel: true,
            projectId: node.id,
            baseY,
          };
          scene.add(label);
        }
      });

      nodeMeshesRef.current = nodeMeshMap;
      mutableNodesRef.current = mutableNodes;
      nodeMapRef.current = nodeMap;

      // ── Edges ──────────────────────────────────────────────────────────
      graph.edges.forEach((edge) => {
        if (edge.strength <= 0.6) return;

        const srcNode = nodeMap.get(edge.sourceId);
        const tgtNode = nodeMap.get(edge.targetId);
        if (!srcNode || !tgtNode) return;

        const points = [srcNode.position.clone(), tgtNode.position.clone()];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: "#4466AA",
          opacity: edge.strength * 0.15,
          transparent: true,
        });
        scene.add(new THREE.Line(lineGeo, lineMat));
      });

      clockRef.current.start();

      // ── Animation loop ─────────────────────────────────────────────────
      let introFrame = 0;
      function animate(): void {
        animFrameRef.current = requestAnimationFrame(animate);

        const delta = clockRef.current.getDelta();
        const elapsed = clockRef.current.getElapsedTime();

        const highlightedIds = highlightedIdsRef.current;
        const selectedId = selectedIdRef.current;
        const cfg = configRef.current;

        // 0. Intro fly-in: lerp radius from 250 → 100 over first 120 frames
        if (introFrame < 120) {
          introFrame++;
          sphericalRef.current.radius +=
            (100 - sphericalRef.current.radius) * 0.04;
        }

        // 1. Auto-rotate
        if (!isDraggingRef.current && !targetNodeRef.current) {
          sphericalRef.current.theta += cfg.autoRotateSpeed * 0.5;
        }

        // 2. Update camera from spherical
        const { theta, phi, radius } = sphericalRef.current;
        if (cameraRef.current) {
          cameraRef.current.position.x =
            radius * Math.sin(phi) * Math.cos(theta);
          cameraRef.current.position.y = radius * Math.cos(phi);
          cameraRef.current.position.z =
            radius * Math.sin(phi) * Math.sin(theta);
          cameraRef.current.lookAt(0, 0, 0);
        }

        // 3. Animate document orbital movement
        mutableNodesRef.current.forEach((node) => {
          if (
            node.type === "document" &&
            node.orbitRadius &&
            node.orbitSpeed &&
            node.parentId
          ) {
            node.orbitAngle =
              (node.orbitAngle ?? 0) + node.orbitSpeed * delta * 60;
            const parent = nodeMapRef.current.get(node.parentId);
            if (parent) {
              const mesh = nodeMeshesRef.current.get(node.id);
              if (mesh) {
                mesh.position.x =
                  parent.position.x +
                  node.orbitRadius * Math.cos(node.orbitAngle);
                mesh.position.y =
                  parent.position.y + Math.sin(node.orbitAngle) * 2;
                mesh.position.z =
                  parent.position.z +
                  node.orbitRadius * Math.sin(node.orbitAngle);
              }
            }
          }
        });

        // 4. Pulse highlighted nodes
        highlightedIds.forEach((id) => {
          const mesh = nodeMeshesRef.current.get(id);
          if (mesh) {
            const scale = 1.3 + Math.sin(elapsed * 3) * 0.15;
            mesh.scale.setScalar(scale);
            mesh.material.emissiveIntensity = 0.8 + Math.sin(elapsed * 3) * 0.2;
          }
        });

        // 5. Dim non-highlighted nodes when a selection is active
        if (highlightedIds.length > 0) {
          nodeMeshesRef.current.forEach((mesh, id) => {
            const isVisible = highlightedIds.includes(id) || id === selectedId;
            if (isVisible) {
              mesh.material.opacity = 1.0;
              mesh.material.transparent = false;
            } else {
              mesh.material.opacity = 0.04;
              mesh.material.transparent = true;
              mesh.material.emissiveIntensity = 0.0;
            }
          });
          // Dim nebula clouds — keep only clouds whose project is highlighted
          sceneRef.current?.traverse((obj) => {
            if (obj instanceof THREE.Points) {
              const pid = obj.userData["projectId"] as string | undefined;
              if (pid === undefined) return; // leave star field untouched
              const mat = obj.material as THREE.PointsMaterial;
              mat.opacity = highlightedIds.includes(pid) ? 0.55 : 0.02;
            }
          });
        } else {
          // No selection — restore everything to full visibility
          nodeMeshesRef.current.forEach((mesh) => {
            const nodeType = mesh.userData["nodeType"] as string;
            mesh.material.opacity = 1.0;
            mesh.material.transparent = nodeType !== "document";
            mesh.material.emissiveIntensity = nodeType === "person" ? 0.8 : 0.5;
          });
          sceneRef.current?.traverse((obj) => {
            if (obj instanceof THREE.Points) {
              const pid = obj.userData["projectId"] as string | undefined;
              if (pid === undefined) return; // leave star field untouched
              const mat = obj.material as THREE.PointsMaterial;
              mat.opacity = 0.55;
            }
          });
        }

        // 6. Selected node ring pulse
        if (selectedId) {
          const mesh = nodeMeshesRef.current.get(selectedId);
          if (mesh) {
            mesh.scale.setScalar(1.5 + Math.sin(elapsed * 2) * 0.1);
          }
        }

        // 7. Animate project labels — bob, zoom-fade, selection-fade
        sceneRef.current?.traverse((obj) => {
          if (!(obj instanceof THREE.Sprite) || !obj.userData["isLabel"])
            return;
          const spriteMat = obj.material as THREE.SpriteMaterial;
          const pid = obj.userData["projectId"] as string;
          const baseY = obj.userData["baseY"] as number;

          // Gentle vertical bob
          obj.position.y = baseY + Math.sin(elapsed * 0.8 + pid.length) * 0.3;

          // Zoom-based fade: fully visible 70–160, fade out below 70
          const camRadius = sphericalRef.current.radius;
          const zoomOpacity =
            camRadius > 50 ? Math.min(1, (camRadius - 50) / 20) : 0;

          // Selection-based fade
          if (highlightedIds.length > 0) {
            spriteMat.opacity = highlightedIds.includes(pid) ? zoomOpacity : 0;
          } else {
            spriteMat.opacity = zoomOpacity;
          }
        });

        // 8. Render
        renderer.render(scene, camera);
      }

      animate();

      // ── Event listeners ────────────────────────────────────────────────
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseLeave);
      canvas.addEventListener("wheel", handleWheel, { passive: false });

      // ── Escape key → fly back to overview ─────────────────────────────────
      function handleKeyDown(e: KeyboardEvent): void {
        if (e.key !== "Escape") return;
        const duration = 80;
        let frame = 0;
        const startRadius = sphericalRef.current.radius;
        const startPhi = sphericalRef.current.phi;
        const easeInOut = (t: number): number =>
          t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        cancelAnimationFrame(flyAnimRef.current);
        const step = (): void => {
          if (frame >= duration) return;
          const t = easeInOut(frame / duration);
          sphericalRef.current.radius = startRadius + (100 - startRadius) * t;
          sphericalRef.current.phi = startPhi + (Math.PI / 2 - startPhi) * t;
          frame++;
          flyAnimRef.current = requestAnimationFrame(step);
        };
        flyAnimRef.current = requestAnimationFrame(step);
      }
      window.addEventListener("keydown", handleKeyDown);

      // ── Resize handler ─────────────────────────────────────────────────
      function handleResize(): void {
        const c = canvasRef.current;
        if (!c || !rendererRef.current || !cameraRef.current) return;
        const parent = c.parentElement;
        const rw = parent ? parent.clientWidth : c.clientWidth;
        const rh = parent ? parent.clientHeight : c.clientHeight;
        rendererRef.current.setSize(rw, rh);
        cameraRef.current.aspect = rw / rh;
        cameraRef.current.updateProjectionMatrix();
      }

      window.addEventListener("resize", handleResize);

      // ── Cleanup ────────────────────────────────────────────────────────
      return () => {
        cancelAnimationFrame(animFrameRef.current);
        cancelAnimationFrame(flyAnimRef.current);

        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
        canvas.removeEventListener("wheel", handleWheel);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);

        // Dispose all geometries and materials in scene
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              object.material.dispose();
            }
          } else if (object instanceof THREE.Line) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        renderer.dispose();
        nodeMeshesRef.current.clear();
        mutableNodesRef.current = [];
        nodeMapRef.current.clear();
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
      };
      // Intentionally empty deps — scene is built once from graph snapshot on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────

    return (
      <div
        style={{
          width: "100%",
          height: "700px",
          position: "relative",
          background: "#020408",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    );
  },
);

GalaxyRenderer.displayName = "GalaxyRenderer";

export default GalaxyRenderer;
