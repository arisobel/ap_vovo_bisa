import { AmbientLight, BoxGeometry, Color, DirectionalLight, DoubleSide, GridHelper, Group, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, Shape, ShapeGeometry, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type Ponto = { x: number; z: number };
type Trecho = { start: number; end: number; base: number; height: number };
export type SceneWall = { id: string; start: Ponto; end: Ponto; height: number; thickness: number; pieces: Trecho[] };
export type SceneRoom = { id: string; name: string; verification: 'cota-impressa' | 'sem-cota'; contour: Ponto[]; walls: SceneWall[] };
export type PreviewHandle = {
  show(rooms: SceneRoom[] | null): void;
  setWallsVisible(visible: boolean): void;
  lookFromTop(): void;
  frame(): void;
  enterWalk(): void;
  exitWalk(): void;
  viewFromPose(pose: PoseView | null): void;
  setWalkListener(listener: (walking: boolean) => void): void;
  dispose(): void;
};

const PISO_CONFERIDO = '#e9d9cc';
const PISO_SEM_COTA = '#d5dde9';
const PAREDE = '#cfcabf';
export const ALTURA_OLHOS = 1.6;
const ALTURA_CORPO = 1.8;
const RAIO_CORPO = .28;
const VELOCIDADE = 2.6;

export type WallBlock = { position: [number, number, number]; size: [number, number, number]; rotationY: number };

// Converte os trechos cheios de uma parede em caixas posicionadas no mundo.
// O contorno é horário na planta, então a parede cresce para fora dele: normal (dz, -dx).
export function wallBlocks(wall: SceneWall): WallBlock[] {
  const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  if (!(comprimento > 0)) return [];
  const dx = (wall.end.x - wall.start.x) / comprimento;
  const dz = (wall.end.z - wall.start.z) / comprimento;
  const nx = dz, nz = -dx;
  const blocos: WallBlock[] = [];
  for (const trecho of wall.pieces) {
    const largura = trecho.end - trecho.start;
    if (!(largura > 0) || !(trecho.height > 0)) continue;
    const meio = (trecho.start + trecho.end) / 2;
    blocos.push({
      position: [
        wall.start.x + dx * meio + nx * wall.thickness / 2,
        trecho.base + trecho.height / 2,
        wall.start.z + dz * meio + nz * wall.thickness / 2,
      ],
      size: [largura, trecho.height, wall.thickness],
      rotationY: Math.atan2(-dz, dx),
    });
  }
  return blocos;
}

export type PoseView = { x: number; z: number; height: number; headingDeg: number; pitchDeg: number; verticalFovDeg: number };

// Rotação da câmera para um azimute da planta, na ordem YXZ do Three.js.
// Azimute 0 aponta ao topo da planta (-Z), 90 à direita (+X), como manda SPATIAL_RULES.
export function poseRotation(pose: Pick<PoseView, 'headingDeg' | 'pitchDeg'>) {
  return { x: pose.pitchDeg * Math.PI / 180, y: -pose.headingDeg * Math.PI / 180 };
}
export type Barrier = { cx: number; cz: number; halfW: number; halfD: number; angle: number };

// Só barra quem o corpo encontra. A verga sobre a porta fica acima da cabeça e deixa passar;
// o peitoril sob a janela fica na altura da cintura e não deixa.
export function barriersFrom(rooms: SceneRoom[], bodyTop = ALTURA_CORPO): Barrier[] {
  const barreiras: Barrier[] = [];
  for (const room of rooms) {
    for (const wall of room.walls) {
      for (const bloco of wallBlocks(wall)) {
        const base = bloco.position[1] - bloco.size[1] / 2;
        const topo = bloco.position[1] + bloco.size[1] / 2;
        if (base >= bodyTop || topo <= 0) continue;
        barreiras.push({
          cx: bloco.position[0], cz: bloco.position[2],
          halfW: bloco.size[0] / 2, halfD: bloco.size[2] / 2,
          angle: bloco.rotationY,
        });
      }
    }
  }
  return barreiras;
}

// Empurra o caminhante para fora de qualquer barreira que ele esteja invadindo.
export function resolveCollision(x: number, z: number, radius: number, barriers: Barrier[]): Ponto {
  let px = x, pz = z;
  for (let passada = 0; passada < 3; passada++) {
    let mexeu = false;
    for (const b of barriers) {
      const ca = Math.cos(b.angle), sa = Math.sin(b.angle);
      const ox = px - b.cx, oz = pz - b.cz;
      const lx = ox * ca - oz * sa;
      const lz = ox * sa + oz * ca;
      const qx = Math.min(b.halfW, Math.max(-b.halfW, lx));
      const qz = Math.min(b.halfD, Math.max(-b.halfD, lz));
      let dx = lx - qx, dz = lz - qz;
      const dist = Math.hypot(dx, dz);
      if (dist >= radius) continue;
      let nlx: number, nlz: number;
      if (dist > 1e-9) {
        nlx = qx + dx / dist * radius;
        nlz = qz + dz / dist * radius;
      } else {
        // Centro dentro da caixa: sai pela face mais próxima.
        const folgaX = b.halfW + radius - Math.abs(lx);
        const folgaZ = b.halfD + radius - Math.abs(lz);
        if (folgaX < folgaZ) { nlx = Math.sign(lx || 1) * (b.halfW + radius); nlz = lz; }
        else { nlx = lx; nlz = Math.sign(lz || 1) * (b.halfD + radius); }
      }
      px = b.cx + nlx * ca + nlz * sa;
      pz = b.cz - nlx * sa + nlz * ca;
      mexeu = true;
    }
    if (!mexeu) break;
  }
  return { x: px, z: pz };
}

function dentro(contour: Ponto[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const a = contour[i], b = contour[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

// Ponto de partida do passeio: o ponto mais folgado do maior cômodo, longe de qualquer parede.
// O centro da caixa envolvente não serve: em cômodo em L ele cai em cima de uma divisória.
function distanciaAoContorno(contour: Ponto[], x: number, z: number): number {
  let menor = Infinity;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const comprimento = dx * dx + dz * dz;
    const t = comprimento > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / comprimento)) : 0;
    menor = Math.min(menor, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  return menor;
}

export function startingPoint(rooms: SceneRoom[]): Ponto | null {
  let melhorSala: SceneRoom | null = null, maiorArea = 0;
  for (const room of rooms) {
    let s = 0;
    for (let i = 0; i < room.contour.length; i++) {
      const a = room.contour[i], b = room.contour[(i + 1) % room.contour.length];
      s += a.x * b.z - b.x * a.z;
    }
    const area = Math.abs(s) / 2;
    if (area > maiorArea) { maiorArea = area; melhorSala = room; }
  }
  if (!melhorSala) return null;
  const contorno = melhorSala.contour;
  const xs = contorno.map(p => p.x), zs = contorno.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  let melhor: Ponto | null = null, folga = 0;
  const passos = 24;
  for (let i = 1; i < passos; i++) {
    for (let j = 1; j < passos; j++) {
      const p = { x: minX + (maxX - minX) * i / passos, z: minZ + (maxZ - minZ) * j / passos };
      if (!dentro(contorno, p.x, p.z)) continue;
      const d = distanciaAoContorno(contorno, p.x, p.z);
      if (d > folga) { folga = d; melhor = p; }
    }
  }
  return melhor;
}

export function mountPreview(host: HTMLElement, report: (message: string) => void): PreviewHandle {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: true, alpha: false }); }
  catch {
    report('WebGL indisponível. A planta, a calibração e as fotos continuam disponíveis.');
    return { show() {}, setWallsVisible() {}, lookFromTop() {}, frame() {}, enterWalk() {}, exitWalk() {}, viewFromPose() {}, setWalkListener() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  host.prepend(renderer.domElement);
  const tela = renderer.domElement;
  tela.setAttribute('aria-label', 'Vista 3D do apartamento, gerada a partir do traçado da planta');
  tela.tabIndex = 0;

  const scene = new Scene();
  scene.background = new Color('#eeeee7');
  scene.add(new AmbientLight('#ffffff', 1.9));
  const sol = new DirectionalLight('#ffffff', 1.1);
  sol.position.set(-6, 14, 8);
  scene.add(sol);

  const grade = new GridHelper(16, 16, '#bcc9bd', '#d8dfd3');
  scene.add(grade);
  const pisos = new Group();
  const paredes = new Group();
  scene.add(pisos, paredes);

  const camera = new PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(11, 12, 13);
  const controls = new OrbitControls(camera, tela);
  controls.enablePan = true;
  controls.minDistance = 2;
  controls.maxDistance = 120;
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', () => { if (!andando) render(); });

  const materiais = {
    conferido: new MeshLambertMaterial({ color: PISO_CONFERIDO, side: DoubleSide }),
    semCota: new MeshLambertMaterial({ color: PISO_SEM_COTA, side: DoubleSide }),
    parede: new MeshLambertMaterial({ color: PAREDE }),
  };

  let limites = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };
  let barreiras: Barrier[] = [];
  let partida: Ponto | null = null;
  let andando = false;
  let emPose = false;
  let avisarPasseio: (walking: boolean) => void = () => {};
  const teclas = new Set<string>();
  let yaw = 0, pitch = 0, quadro = 0, instante = 0;

  function limpar(grupo: Group) {
    for (const filho of grupo.children) if (filho instanceof Mesh) filho.geometry.dispose();
    grupo.clear();
  }

  function montarPiso(room: SceneRoom) {
    const forma = new Shape();
    room.contour.forEach((p, i) => (i === 0 ? forma.moveTo(p.x, -p.z) : forma.lineTo(p.x, -p.z)));
    forma.closePath();
    const piso = new Mesh(new ShapeGeometry(forma), room.verification === 'sem-cota' ? materiais.semCota : materiais.conferido);
    piso.rotation.x = -Math.PI / 2;
    pisos.add(piso);
  }

  function montarParede(wall: SceneWall) {
    for (const bloco of wallBlocks(wall)) {
      const mesh = new Mesh(new BoxGeometry(bloco.size[0], bloco.size[1], bloco.size[2]), materiais.parede);
      mesh.position.set(bloco.position[0], bloco.position[1], bloco.position[2]);
      mesh.rotation.y = bloco.rotationY;
      paredes.add(mesh);
    }
  }

  function show(rooms: SceneRoom[] | null) {
    exitWalk();
    viewFromPose(null);
    limpar(pisos);
    limpar(paredes);
    grade.visible = !rooms || rooms.length === 0;
    barreiras = []; partida = null;
    if (!rooms || rooms.length === 0) { limites = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 }; frame(); return; }
    const xs: number[] = [], zs: number[] = [];
    for (const room of rooms) {
      montarPiso(room);
      for (const wall of room.walls) montarParede(wall);
      for (const p of room.contour) { xs.push(p.x); zs.push(p.z); }
    }
    limites = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
    barreiras = barriersFrom(rooms);
    partida = startingPoint(rooms);
    frame();
  }

  const centro = () => ({ x: (limites.minX + limites.maxX) / 2, z: (limites.minZ + limites.maxZ) / 2 });
  const tamanho = () => Math.max(limites.maxX - limites.minX, limites.maxZ - limites.minZ, 4);

  function frame() {
    if (andando || emPose) return;
    const c = centro(), t = tamanho();
    camera.rotation.set(0, 0, 0);
    controls.target.set(c.x, 0, c.z);
    camera.position.set(c.x + t * .55, t * .85, c.z + t * .75);
    controls.update();
    render();
  }
  function lookFromTop() {
    if (andando || emPose) return;
    const c = centro(), t = tamanho();
    controls.target.set(c.x, 0, c.z);
    camera.position.set(c.x, t * 1.25, c.z + .01);
    controls.update();
    render();
  }
  function setWallsVisible(visible: boolean) { paredes.visible = visible; render(); }

  // Câmera na pose de uma fotografia. O azimute segue a convenção da planta: 0 aponta ao topo, 90 à direita.
  // O campo de visão é o vertical; o horizontal sai da proporção do quadro, que o chamador ajusta.
  function viewFromPose(pose: PoseView | null) {
    if (!pose) {
      if (!emPose) return;
      emPose = false;
      camera.fov = 42;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      frame();
      return;
    }
    exitWalk();
    emPose = true;
    controls.enabled = false;
    camera.position.set(pose.x, pose.height, pose.z);
    const giro = poseRotation(pose);
    camera.rotation.set(giro.x, giro.y, 0, 'YXZ');
    camera.fov = pose.verticalFovDeg;
    camera.updateProjectionMatrix();
    render();
  }

  function olhar(dx: number, dy: number) {
    yaw -= dx * .0026;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * .0026));
  }
  const aoMover = (event: MouseEvent) => { if (andando) olhar(event.movementX, event.movementY); };
  const aoTeclar = (event: KeyboardEvent) => {
    if (!andando) return;
    if (event.key === 'Escape') { exitWalk(); return; }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    teclas.add(event.key.toLowerCase());
  };
  const aoSoltar = (event: KeyboardEvent) => teclas.delete(event.key.toLowerCase());
  const aoTrocarTrava = () => { if (andando && document.pointerLockElement !== tela) exitWalk(); };

  function passo(agora: number) {
    if (!andando) return;
    quadro = requestAnimationFrame(passo);
    const dt = Math.min(.05, (agora - instante) / 1000 || 0);
    instante = agora;
    let frente = 0, lado = 0;
    if (teclas.has('w') || teclas.has('arrowup')) frente += 1;
    if (teclas.has('s') || teclas.has('arrowdown')) frente -= 1;
    if (teclas.has('d') || teclas.has('arrowright')) lado += 1;
    if (teclas.has('a') || teclas.has('arrowleft')) lado -= 1;
    if (frente || lado) {
      const norma = Math.hypot(frente, lado);
      const passoM = VELOCIDADE * dt * (teclas.has('shift') ? 1.8 : 1);
      const dx = (-Math.sin(yaw) * frente + Math.cos(yaw) * lado) / norma * passoM;
      const dz = (-Math.cos(yaw) * frente - Math.sin(yaw) * lado) / norma * passoM;
      const livre = resolveCollision(camera.position.x + dx, camera.position.z + dz, RAIO_CORPO, barreiras);
      camera.position.x = livre.x;
      camera.position.z = livre.z;
    }
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.position.y = ALTURA_OLHOS;
    render();
  }

  function enterWalk() {
    if (andando || !partida) return;
    andando = true;
    controls.enabled = false;
    const inicio = resolveCollision(partida.x, partida.z, RAIO_CORPO, barreiras);
    camera.position.set(inicio.x, ALTURA_OLHOS, inicio.z);
    yaw = 0; pitch = 0;
    camera.rotation.set(0, 0, 0, 'YXZ');
    teclas.clear();
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('keyup', aoSoltar);
    document.addEventListener('mousemove', aoMover);
    document.addEventListener('pointerlockchange', aoTrocarTrava);
    tela.focus();
    tela.requestPointerLock?.();
    instante = performance.now();
    quadro = requestAnimationFrame(passo);
    avisarPasseio(true);
  }

  function exitWalk() {
    if (!andando) return;
    andando = false;
    cancelAnimationFrame(quadro);
    window.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('keyup', aoSoltar);
    document.removeEventListener('mousemove', aoMover);
    document.removeEventListener('pointerlockchange', aoTrocarTrava);
    if (document.pointerLockElement === tela) document.exitPointerLock?.();
    controls.enabled = true;
    avisarPasseio(false);
    frame();
  }

  const observer = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    render();
  });
  observer.observe(host);
  tela.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    exitWalk();
    report('A visualização 3D perdeu a conexão gráfica. Recarregue para tentar novamente; planta e fotos continuam disponíveis.');
  });

  return {
    show, setWallsVisible, lookFromTop, frame, enterWalk, exitWalk, viewFromPose,
    setWalkListener(listener) { avisarPasseio = listener; },
    dispose() {
      exitWalk();
      observer.disconnect();
      controls.dispose();
      limpar(pisos); limpar(paredes);
      grade.geometry.dispose();
      (Array.isArray(grade.material) ? grade.material : [grade.material]).forEach(m => m.dispose());
      Object.values(materiais).forEach(m => m.dispose());
      renderer.dispose();
    },
  };
}
