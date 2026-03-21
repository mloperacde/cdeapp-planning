/**
 * Layout3DView — isometric/perspective 3D preview of a room layout
 * Uses Three.js (via canvas) to render the room floor polygon and elements as boxes.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getElementConfig } from './ElementPalette';
import { X, RotateCcw } from 'lucide-react';

// Element type → approximate 3D height (in layout units / 10)
const ELEMENT_HEIGHTS = {
  machine: 9,
  container_bulk: 12,
  conveyor_belt: 3,
  inkjet_coder: 8,
  laser_coder: 8,
  cartoner: 10,
  material_cabinet: 14,
  work_table: 7,
  line_manager_desk: 7,
  entry: 1,
  exit: 1,
  storage: 16,
  walkway: 0.5,
  wall: 20,
  column: 22,
  other: 8,
};

const FLOOR_HEIGHT = 1;
const SCALE = 0.05; // layout px → 3D units

function hexToThree(hex) {
  return new THREE.Color(hex || '#888888');
}

// Build a shape from a list of {x, y} points (SVG coords → XZ plane)
function buildFloorShape(points) {
  const shape = new THREE.Shape();
  if (points.length < 3) return null;
  shape.moveTo(points[0].x * SCALE, -points[0].y * SCALE);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x * SCALE, -points[i].y * SCALE);
  }
  shape.closePath();
  return shape;
}

export default function Layout3DView({ elements = [], roomPolygon = [], canvasWidth = 1200, canvasHeight = 800, onClose }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const spherical = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 60 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e293b');
    scene.fog = new THREE.Fog('#1e293b', 80, 200);
    sceneRef.current = scene;

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.2);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xbdd9f7, 0x4a3000, 0.4));

    // ── Grid ───────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(100, 100, 0x475569, 0x334155);
    grid.position.y = 0;
    scene.add(grid);

    // ── Room floor ─────────────────────────────────────────────────────────
    if (roomPolygon.length >= 3) {
      const shape = buildFloorShape(roomPolygon);
      if (shape) {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: FLOOR_HEIGHT, bevelEnabled: false });
        const mat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);

        // Wall outline
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        wireframe.rotation.x = Math.PI / 2;
        wireframe.position.y = 0;
        scene.add(wireframe);
      }
    } else {
      // Fallback flat floor if no polygon
      const geo = new THREE.PlaneGeometry(canvasWidth * SCALE, canvasHeight * SCALE);
      const mat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1, side: THREE.DoubleSide });
      const floor = new THREE.Mesh(geo, mat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(canvasWidth * SCALE / 2, 0, -canvasHeight * SCALE / 2);
      floor.receiveShadow = true;
      scene.add(floor);
    }

    // ── Elements as boxes ──────────────────────────────────────────────────
    elements.forEach(el => {
      const cfg = getElementConfig(el.type);
      const elH = (ELEMENT_HEIGHTS[el.type] || 8) * SCALE * 10;
      const w = el.width * SCALE;
      const d = el.height * SCALE;

      const geo = new THREE.BoxGeometry(w, elH, d);
      const color = hexToThree(el.color || cfg.color);
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);

      // SVG: x right, y down → Three: x right, z forward (negated y)
      mesh.position.set(
        el.x * SCALE + w / 2,
        elH / 2 + FLOOR_HEIGHT * SCALE,
        -(el.y * SCALE + d / 2)
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Edge outline
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      scene.add(line);

      // Label sprite
      const label = el.label || cfg.label || el.type;
      if (label) {
        const canvas2d = document.createElement('canvas');
        canvas2d.width = 256; canvas2d.height = 64;
        const ctx = canvas2d.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.roundRect(4, 4, 248, 56, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.substring(0, 20), 128, 32);
        const tex = new THREE.CanvasTexture(canvas2d);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(w * 1.2, 0.8, 1);
        sprite.position.set(mesh.position.x, mesh.position.y + elH / 2 + 0.6, mesh.position.z);
        scene.add(sprite);
      }
    });

    // ── Camera orbit position ───────────────────────────────────────────────
    const centerX = canvasWidth * SCALE / 2;
    const centerZ = -canvasHeight * SCALE / 2;
    const target = new THREE.Vector3(centerX, 0, centerZ);

    const updateCamera = () => {
      const { theta, phi, radius } = spherical.current;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    };
    updateCamera();

    // ── Animation loop ──────────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    setLoaded(true);

    // ── Mouse orbit ────────────────────────────────────────────────────────
    const onMouseDown = (e) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      spherical.current.theta -= dx * 0.01;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.current.phi + dy * 0.01));
      updateCamera();
    };
    const onMouseUp = () => { isDragging.current = false; };
    const onWheel = (e) => {
      spherical.current.radius = Math.max(10, Math.min(150, spherical.current.radius + e.deltaY * 0.05));
      updateCamera();
      e.preventDefault();
    };
    const onTouchStart = (e) => { if (e.touches.length === 1) { isDragging.current = true; lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } };
    const onTouchMove = (e) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      spherical.current.theta -= dx * 0.01;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.current.phi + dy * 0.01));
      updateCamera();
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);

    const onResize = () => {
      if (!container) return;
      const W2 = container.clientWidth, H2 = container.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
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
  }, []);  // eslint-disable-line

  const resetCamera = () => {
    spherical.current = { theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 60 };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
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

      {/* Three.js mount */}
      <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
        {!loaded && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
          </div>
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-700 px-4 py-1.5 text-xs text-slate-500 text-center flex-shrink-0">
        Arrastra para rotar · Scroll para zoom · Los colores y etiquetas corresponden al layout 2D
      </div>
    </div>
  );
}