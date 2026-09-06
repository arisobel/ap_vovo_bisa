import { Color, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountPreview(host: HTMLElement, report: (message: string) => void): () => void {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: true, alpha: false }); }
  catch { report('WebGL indisponível. A planta, a calibração e as fotos continuam disponíveis.'); return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Grade de orientação 3D, sem modelo do apartamento');
  const scene = new Scene();
  scene.background = new Color('#eeeee7');
  const grid = new GridHelper(16, 16, '#bcc9bd', '#d8dfd3');
  scene.add(grid);
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(11, 12, 13);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 35;
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  const observer = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    render();
  });
  observer.observe(host);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); report('A visualização 3D perdeu a conexão gráfica. Recarregue para tentar novamente; planta e fotos continuam disponíveis.');
  });
  return () => { observer.disconnect(); controls.dispose(); grid.geometry.dispose(); (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(m => m.dispose()); renderer.dispose(); };
}
