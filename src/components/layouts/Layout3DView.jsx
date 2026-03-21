/**
 * Layout3DView — perspective 3D preview of a room layout using Three.js
 * - Floor polygon correctly mapped (no Y mirror)
 * - Labels rendered as flat 2D text planes ON the element top face
 * - Realistic heights per element type
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getElementConfig } from './ElementPalette';
import { X, RotateCcw } from 'lucide-react';

// Layout px → 3D units scale
const SCALE = 0.05;
const FLOOR_H = 0.15; // floor slab height

// Realistic heights for industrial elements (in layout-unit scale before SCALE)
const ELEMENT_HEIGHTS = {
  machine: 160,
  filling_machine: 200,
  capper: 180,
  labeler: 160,
  cartoner: 170,
  wrapper: 160,
  star_plate: 100,
  rotary_accumulator: 80,
  nozzles: 120,
  dosing_cart: 140,
  conveyor_belt: 60,
  curved_conveyor: 60,
  transfer_pump: 120,
  container_loader: 200,
  container_bulk: 220,
  storage: 120,
  inkjet_coder: 140,
  laser_coder: 140,
  work_table: 90,
  material_cabinet: 200,
  line_manager_desk: 90,
  line_manager_desk: 90,
  outlet_220: 10,
  outlet_380: 10,
  entry: 240,
  exit: 240,
  walkway: 2,
  wall: 300,
  column: 320,
  other: 120,
};

function hexToThree(hex) {
  return new THREE.Color(hex || '#888888');
}

// Make a canvas texture with text for a flat label plane on top of element
function makeTextTexture(text, w3d, d3d) {
  const PX = 256, PY = 64;
  const c = document.createElement('canvas');
  c.width = PX; c.height = PY;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, PX, PY);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  ctx.roundRect(2, 2, PX - 4, PY - 4, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.substring(0, 22), PX / 2, PY / 2);
  return new THREE.CanvasTexture(c);
}

export default function Layout3DView({ elements = [], roomPolygon = [], canvasWidth = 1200, canvasHeight = 800, floorColor, onClose }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  // spherical coords around scene center
  const spherical = useRef({ theta: -Math.PI / 4, phi: Math.PI / 3.5, radius: 65 });
  const cameraRef = useRef(null);
  const targetRef = useRef(new THREE.Vector3());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth || 800;
    const H = container.clientHeight || 600;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    scene.fog = new THREE.FogExp2('#0f172a', 0.008);

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 600);
    cameraRef.current = camera;

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.position.set(50, 80, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xc9e4f7, 0x3d2b00, 0.35));

    // ── SVG → 3D coordinate mapping ──────────────────────────────────────
    // SVG: x right, y down → 3D: X right, Z forward (+Z = +Y in SVG)
    const svgToX = (x) => x * SCALE;
    const svgToZ = (y) => y * SCALE;  // no mirror — matches canvas orientation

    // ── Grid ───────────────────────────────────────────────────────────────
    const gridSize = Math.max(canvasWidth, canvasHeight) * SCALE * 1.2;
    const grid = new THREE.GridHelper(gridSize, 60, 0x1e3a5f, 0x172554);
    const centerX3 = canvasWidth * SCALE / 2;
    const centerZ3 = canvasHeight * SCALE / 2;
    grid.position.set(centerX3, 0, centerZ3);
    scene.add(grid);

    // ── Room floor polygon ─────────────────────────────────────────────────
    if (roomPolygon.length >= 3) {
      const shape = new THREE.Shape();
      // Map SVG coords directly (x→X, y→Z in 3D)
      shape.moveTo(svgToX(roomPolygon[0].x), svgToZ(roomPolygon[0].y));
      for (let i = 1; i < roomPolygon.length; i++) {
        shape.lineTo(svgToX(roomPolygon[i].x), svgToZ(roomPolygon[i].y));
      }
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape);
      // Rotate to lie flat on XZ plane
      const floorMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(floorColor || '#94a3b8'),
        side: THREE.DoubleSide,
      });
      const floor = new THREE.Mesh(geo, floorMat);
      floor.rotation.x = -Math.PI / 2;  // flat on ground
      floor.position.y = 0;
      floor.receiveShadow = true;
      scene.add(floor);

      // Wall outline from polygon
      const pts3D = roomPolygon.map(p => new THREE.Vector3(svgToX(p.x), 0, svgToZ(p.y)));
      pts3D.push(pts3D[0]); // close
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts3D);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, linewidth: 2 });
      scene.add(new THREE.Line(lineGeo, lineMat));

      // Thin walls extruded up
      for (let i = 0; i < roomPolygon.length; i++) {
        const p1 = roomPolygon[i];
        const p2 = roomPolygon[(i + 1) % roomPolygon.length];
        const wallH = 3.2;
        const dx = svgToX(p2.x) - svgToX(p1.x);
        const dz = svgToZ(p2.y) - svgToZ(p1.y);
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        const wallGeo = new THREE.BoxGeometry(len, wallH, 0.12);
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x334155, transparent: true, opacity: 0.55 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(
          svgToX(p1.x) + dx / 2,
          wallH / 2,
          svgToZ(p1.y) + dz / 2
        );
        wall.rotation.y = -Math.atan2(dz, dx);
        scene.add(wall);
      }
    } else {
      // fallback flat ground
      const geo = new THREE.PlaneGeometry(canvasWidth * SCALE, canvasHeight * SCALE);
      const mat = new THREE.MeshLambertMaterial({ color: 0x64748b, side: THREE.DoubleSide });
      const floor = new THREE.Mesh(geo, mat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(centerX3, 0, centerZ3);
      floor.receiveShadow = true;
      scene.add(floor);
    }

    // ── Elements as boxes ──────────────────────────────────────────────────
    elements.forEach(el => {
      const cfg = getElementConfig(el.type);
      const rawH = ELEMENT_HEIGHTS[el.type] || 120;
      const h3 = rawH * SCALE;
      const w3 = el.width * SCALE;
      const d3 = el.height * SCALE;  // depth = SVG height dimension

      const x3 = svgToX(el.x) + w3 / 2;
      const z3 = svgToZ(el.y) + d3 / 2;

      // Special: walkway is flat
      if (el.type === 'walkway') {
        const geo = new THREE.BoxGeometry(w3, 0.05, d3);
        const mat = new THREE.MeshLambertMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.5 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x3, 0.025, z3);
        scene.add(m);
        return;
      }

      // Outlet: flat disc on wall/floor
      if (el.type === 'outlet_220' || el.type === 'outlet_380') {
        const geo = new THREE.CylinderGeometry(w3 / 2.2, w3 / 2.2, 0.1, 16);
        const c = el.type === 'outlet_220' ? 0xFCD34D : 0xA78BFA;
        const mat = new THREE.MeshLambertMaterial({ color: c });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x3, 0.1, z3);
        scene.add(m);
        return;
      }

      // Main box
      const geo = new THREE.BoxGeometry(w3, h3, d3);
      const color = hexToThree(el.color || cfg.color);
      // Slight lighten for top face effect
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x3, FLOOR_H + h3 / 2, z3);
      if (el.rotation) mesh.rotation.y = -el.rotation * Math.PI / 180;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Edge outline
      const edges = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
      const edgeLines = new THREE.LineSegments(edges, edgeMat);
      edgeLines.position.copy(mesh.position);
      if (el.rotation) edgeLines.rotation.y = -el.rotation * Math.PI / 180;
      scene.add(edgeLines);

      // ── Label as flat plane on TOP of the element ──────────────────────
      const labelText = el.label || cfg.label || el.type;
      const tex = makeTextTexture(labelText, w3, d3);
      const labelW = Math.max(w3 * 0.9, 0.5);
      const labelH = Math.min(d3 * 0.6, 0.6);
      const planeGeo = new THREE.PlaneGeometry(labelW, labelH);
      const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      // position flat on top face
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(x3, FLOOR_H + h3 + 0.01, z3);
      if (el.rotation) plane.rotation.z = el.rotation * Math.PI / 180;
      scene.add(plane);
    });

    // ── Camera target = center of layout ───────────────────────────────────
    targetRef.current.set(centerX3, 0, centerZ3);

    const updateCamera = () => {
      const { theta, phi, radius } = spherical.current;
      const t = targetRef.current;
      camera.position.set(
        t.x + radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        t.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(t);
    };
    updateCamera();

    // ── Render loop ────────────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    setLoaded(true);

    // ── Controls: orbit ────────────────────────────────────────────────────
    const onMouseDown = (e) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      spherical.current.theta -= dx * 0.008;
      spherical.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, spherical.current.phi + dy * 0.008));
      updateCamera();
    };
    const onMouseUp = () => { isDragging.current = false; };
    const onWheel = (e) => {
      e.preventDefault();
      spherical.current.radius = Math.max(8, Math.min(180, spherical.current.radius + e.deltaY * 0.04));
      updateCamera();
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) { isDragging.current = true; lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    };
    const onTouchMove = (e) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      spherical.current.theta -= dx * 0.008;
      spherical.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, spherical.current.phi + dy * 0.008));
      updateCamera();
    };
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  const resetCamera = () => {
    spherical.current = { theta: -Math.PI / 4, phi: Math.PI / 3.5, radius: 65 };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">Vista 3D del Layout</span>
          <span className="text-slate-400 text-xs">{elements.length} elementos · {roomPolygon.length} puntos de sala</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs hidden md:block">Clic+arrastrar = rotar · Scroll = zoom</span>
          <button onClick={resetCamera} title="Restablecer vista"
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
        {!loaded && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
          </div>
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-700 px-4 py-1.5 text-xs text-slate-500 text-center flex-shrink-0">
        Arrastra para rotar · Scroll para zoom · Etiquetas visibles desde arriba
      </div>
    </div>
  );
}