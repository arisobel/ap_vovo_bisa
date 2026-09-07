import { AmbientLight, BoxGeometry, CanvasTexture, Color, DirectionalLight, DoubleSide, GridHelper, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry, Scene, Shape, ShapeGeometry, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type Ponto = { x: number; z: number };
type Trecho = { start: number; end: number; base: number; height: number };
type Vao = { type: 'door' | 'window'; offset: number; width: number; base: number; height: number };
export type SceneWall = { id: string; start: Ponto; end: Ponto; height: number; thickness: number; openings: Vao[]; pieces: Trecho[] };
export type ScenePalette = { floor: string; wall: string; ceiling: string };
export type SceneFixture = {
  id: string; kind: string; loose: boolean; color: string;
  center: Ponto; size: { width: number; depth: number }; base: number; height: number;
};
// Cor mais as propriedades ópticas declaradas no material. A cena atual usa só a cor; quem monta
// materiais PBR precisa do resto. Opcional para que dados anteriores continuem válidos.
export type SceneOptic = { color: string; roughness: number; metalness: number; pattern?: { kind: 'espinha'; rotationDeg: number } };
export type SceneOptics = { floor: SceneOptic; wall: SceneOptic; ceiling: SceneOptic };
export type SceneRoom = { id: string; name: string; verification: 'cota-impressa' | 'sem-cota'; finishes: ScenePalette; optics?: SceneOptics; contour: Ponto[]; walls: SceneWall[]; fixtures: SceneFixture[] };

// Acesso ao interior da cena, para um módulo que a estende sem fazer parte dela. Existe para que o
// modo experimental viva em arquivo próprio e fora do pacote da visita: quem o instancia é o editor.
export type SceneAccess = {
  scene: Scene; renderer: WebGLRenderer;
  pisos: Group; paredes: Group; moveis: Group;
  ambiente: AmbientLight; sol: DirectionalLight;
  render: () => void;
};
// `rebuilt` avisa que as malhas foram refeitas e as antigas não existem mais. `interior` avisa que
// a câmera passou a olhar de dentro — no passeio ou na pose de uma fotografia —, que é quando um
// teto faz sentido e a vista geral de cima não.
export type SceneListener = { rebuilt(rooms: SceneRoom[] | null): void; interior(inside: boolean): void };
export type SceneStats = { calls: number; triangles: number; frameMs: number | null };
// 'materiais' pinta com os acabamentos lidos nas fotos; 'conferencia' volta às cores que
// distinguem cômodo com cota impressa de cômodo sem cota. As duas leituras são úteis.
export type PaletteMode = 'materiais' | 'conferencia';
export type PreviewHandle = {
  show(rooms: SceneRoom[] | null): void;
  setWallsVisible(visible: boolean): void;
  lookFromTop(): void;
  frame(): void;
  enterWalk(from?: PoseView | null): void;
  exitWalk(): void;
  viewFromPose(pose: PoseView | null): void;
  setPalette(mode: PaletteMode): void;
  setFurniture(visible: boolean): void;
  setLabels(visible: boolean): void;
  setDimensions(visible: boolean): void;
  setClickToWalk(handler: (() => void) | null): void;
  toggleFullscreen(): void;
  isFullscreen(): boolean;
  setWalkListener(listener: (state: WalkState | null) => void): void;
  access(): SceneAccess | null;
  setSceneListener(listener: SceneListener | null): void;
  stats(): SceneStats;
  dispose(): void;
};

const PISO_CONFERIDO = '#e9d9cc';
const PISO_SEM_COTA = '#d5dde9';
const PAREDE = '#cfcabf';
const ESQUADRIA = '#d8d9d8';
const VIDRO = '#cfe0e6';
export const ALTURA_OLHOS = 1.6;
const ALTURA_CORPO = 1.8;
const RAIO_CORPO = .28;
const VELOCIDADE = 2.6;

// Onde quem caminha está e para onde olha, na mesma convenção de azimute da planta.
export type WalkState = { x: number; z: number; headingDeg: number; hFovDeg: number };

export const FOV_PASSEIO = 42;
export const FOV_MIN = 24;
export const FOV_MAX = 78;

// Roda do mouse no passeio: aproxima e afasta mudando o campo de visão, não a posição.
export function zoomFov(atual: number, deltaY: number): number {
  return Math.max(FOV_MIN, Math.min(FOV_MAX, atual + Math.sign(deltaY) * 3));
}

export type TouchPoint = { x: number; y: number };
// Um dedo gira a vista; dois dedos aproximam ou afastam. `pinch` é a variação da distância
// entre os dedos, em pixels: positiva quando eles se afastam.
export type TouchGesture = { look: { dx: number; dy: number } | null; pinch: number };

function separacao(dedos: TouchPoint[]): number {
  return Math.hypot(dedos[0].x - dedos[1].x, dedos[0].y - dedos[1].y);
}

export function touchGesture(anterior: TouchPoint[], atual: TouchPoint[]): TouchGesture {
  if (anterior.length === 1 && atual.length === 1) {
    return { look: { dx: atual[0].x - anterior[0].x, dy: atual[0].y - anterior[0].y }, pinch: 0 };
  }
  if (anterior.length >= 2 && atual.length >= 2) return { look: null, pinch: separacao(atual) - separacao(anterior) };
  // Um dedo a mais ou a menos: o quadro seguinte recomeça do zero, senão a vista daria um salto.
  return { look: null, pinch: 0 };
}

// O arrasto do dedo cobre menos pixels que o mouse com o ponteiro preso: sem este ganho,
// virar o corpo no celular exigiria vários arrastos.
export const TOQUE_SENSIBILIDADE = 1.5;

// Campo horizontal a partir do vertical e da proporção da tela. Mesma fórmula do contrato
// das fotografias; repetida aqui para a cena não depender do módulo de dados.
export function horizontalFovDeg(verticalFovDeg: number, aspect: number): number {
  return 2 * Math.atan(Math.tan(verticalFovDeg * Math.PI / 180 / 2) * aspect) * 180 / Math.PI;
}

// Inversa de poseRotation: o yaw da câmera do Three.js de volta para azimute de planta.
export function headingFromYaw(yaw: number): number {
  return ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
}

export type WallBlock = { position: [number, number, number]; size: [number, number, number]; rotationY: number };

// Uma peça de mobília vira uma caixa alinhada aos eixos: a pegada é retangular por contrato.
export function fixtureBlock(fixture: SceneFixture): WallBlock {
  return {
    position: [fixture.center.x, fixture.base + fixture.height / 2, fixture.center.z],
    size: [fixture.size.width, fixture.height, fixture.size.depth],
    rotationY: 0,
  };
}

export type OpeningPart = WallBlock & { part: 'frame' | 'glass' };

// Batente e vidro de um vão. Não fecha passagem: o batente é uma moldura fina na borda do vão
// e o vidro só aparece em janela, onde o peitoril já barra quem caminha.
export function openingParts(wall: SceneWall, frameWidth = .06): OpeningPart[] {
  const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  if (!(comprimento > 0)) return [];
  const dx = (wall.end.x - wall.start.x) / comprimento;
  const dz = (wall.end.z - wall.start.z) / comprimento;
  const nx = dz, nz = -dx;
  const rotationY = Math.atan2(-dz, dx);
  const partes: OpeningPart[] = [];
  const emMetros = (centro: number, y: number, largura: number, altura: number, espessura: number, part: 'frame' | 'glass') => {
    if (!(largura > 0) || !(altura > 0)) return;
    partes.push({
      position: [
        wall.start.x + dx * centro + nx * wall.thickness / 2,
        y,
        wall.start.z + dz * centro + nz * wall.thickness / 2,
      ],
      size: [largura, altura, espessura],
      rotationY,
      part,
    });
  };
  for (const vao of wall.openings) {
    const topo = vao.base + vao.height;
    if (!(vao.width > 0) || !(vao.height > 0) || topo > wall.height + 1e-9) continue;
    const espessura = wall.thickness + .02;
    // Montantes laterais e travessa superior; peitoril só quando o vão não nasce no piso.
    emMetros(vao.offset + frameWidth / 2, vao.base + vao.height / 2, frameWidth, vao.height, espessura, 'frame');
    emMetros(vao.offset + vao.width - frameWidth / 2, vao.base + vao.height / 2, frameWidth, vao.height, espessura, 'frame');
    emMetros(vao.offset + vao.width / 2, topo - frameWidth / 2, vao.width, frameWidth, espessura, 'frame');
    if (vao.base > 0) emMetros(vao.offset + vao.width / 2, vao.base + frameWidth / 2, vao.width, frameWidth, espessura, 'frame');
    if (vao.type === 'window') {
      const largura = Math.max(0, vao.width - frameWidth * 2);
      const altura = Math.max(0, vao.height - frameWidth * (vao.base > 0 ? 2 : 1));
      emMetros(vao.offset + vao.width / 2, vao.base + (vao.base > 0 ? frameWidth : 0) + altura / 2, largura, altura, .02, 'glass');
    }
  }
  return partes;
}

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

// Limite de inclinação do passeio, em radianos. Uma pose muito inclinada é aparada aqui,
// e não silenciosamente ignorada: quem anda não deve nascer olhando para trás por cima.
export const PITCH_LIMITE = 1.2;

// Estado inicial do passeio a partir de uma pose fotográfica: mesmo ponto, mesma direção,
// mesma altura de olho. O campo de visão não vem junto — ele é da fotografia, não de quem anda.
export function walkStartFromPose(pose: PoseView) {
  return {
    x: pose.x,
    z: pose.z,
    eyeHeight: pose.height,
    yaw: -pose.headingDeg * Math.PI / 180,
    pitch: Math.max(-PITCH_LIMITE, Math.min(PITCH_LIMITE, pose.pitchDeg * Math.PI / 180)),
  };
}

// Rotação da câmera para um azimute da planta, na ordem YXZ do Three.js.
// Azimute 0 aponta ao topo da planta (-Z), 90 à direita (+X), como manda SPATIAL_RULES.
export function poseRotation(pose: Pick<PoseView, 'headingDeg' | 'pitchDeg'>) {
  return { x: pose.pitchDeg * Math.PI / 180, y: -pose.headingDeg * Math.PI / 180 };
}
export type Barrier = { cx: number; cz: number; halfW: number; halfD: number; angle: number };

// Só barra quem o corpo encontra. A verga sobre a porta fica acima da cabeça e deixa passar;
// o peitoril sob a janela fica na altura da cintura e não deixa.
export function barriersFrom(rooms: SceneRoom[], bodyTop = ALTURA_CORPO, comMobilia = false): Barrier[] {
  const barreiras: Barrier[] = [];
  for (const room of rooms) {
    if (comMobilia) for (const fixture of room.fixtures) {
      const bloco = fixtureBlock(fixture);
      const base = bloco.position[1] - bloco.size[1] / 2;
      const topo = bloco.position[1] + bloco.size[1] / 2;
      if (base >= bodyTop || topo <= 0) continue;
      barreiras.push({ cx: bloco.position[0], cz: bloco.position[2], halfW: bloco.size[0] / 2, halfD: bloco.size[2] / 2, angle: 0 });
    }
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

// Ponto mais folgado dentro do contorno: serve tanto para começar o passeio quanto para
// pousar o rótulo do cômodo sem que ele encoste nas paredes.
export function innerPoint(contour: Ponto[], passos = 24): Ponto | null {
  const xs = contour.map(p => p.x), zs = contour.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  let melhor: Ponto | null = null, folga = 0;
  for (let i = 1; i < passos; i++) {
    for (let j = 1; j < passos; j++) {
      const p = { x: minX + (maxX - minX) * i / passos, z: minZ + (maxZ - minZ) * j / passos };
      if (!dentro(contour, p.x, p.z)) continue;
      const d = distanciaAoContorno(contour, p.x, p.z);
      if (d > folga) { folga = d; melhor = p; }
    }
  }
  return melhor;
}

// Área do contorno em metros quadrados, pela fórmula do laço. É a área DO TRAÇADO,
// não a impressa na planta: as duas divergem, e o rótulo descreve o que está na tela.
export function roomArea(contour: Ponto[]): number {
  let soma = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    soma += a.x * b.z - b.x * a.z;
  }
  return Math.abs(soma) / 2;
}

// Onde e de que tamanho o rótulo é desenhado no piso. Largura limitada pela folga do
// cômodo, para que o texto não vaze por cima das paredes.
export function labelPlacement(room: SceneRoom) {
  const centro = innerPoint(room.contour);
  if (!centro) return null;
  const xs = room.contour.map(p => p.x), zs = room.contour.map(p => p.z);
  const largura = Math.max(...xs) - Math.min(...xs);
  const profundidade = Math.max(...zs) - Math.min(...zs);
  const folga = distanciaAoContorno(room.contour, centro.x, centro.z);
  const width = Math.min(largura * .8, profundidade * 1.6, folga * 3.4, 3.2);
  return { center: centro, width: Math.max(.5, width), area: roomArea(room.contour) };
}

// Seta do letreiro de porta. Aponta para cima, no sentido de "siga por aqui", e não para
// o lado, que sugeria uma direção lateral que a porta não tem.
export const SETA_DESTINO = '↑';

export type SurfaceLabel = { text: string; x: number; y: number; z: number; rotationY: number; width: number; kind: 'parede' | 'porta' };

// Direção para onde a superfície olha, a partir da rotação em Y.
export function labelFacing(rotationY: number) {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

// Faixa cheia mais larga da parede: o rótulo não pode cair em cima de um vão.
function trechoMaisLargo(wall: SceneWall) {
  let melhor: Trecho | null = null;
  for (const trecho of wall.pieces) {
    if (trecho.base > 0.01) continue;
    if (trecho.height < wall.height - 0.01) continue;
    if (!melhor || trecho.end - trecho.start > melhor.end - melhor.start) melhor = trecho;
  }
  return melhor;
}

// Nome do cômodo escrito no alto da face interna das paredes mais longas. No passeio,
// é o que diz onde se está sem precisar olhar para o chão.
export function wallLabels(room: SceneRoom, quantas = 2): SurfaceLabel[] {
  const candidatas = room.walls
    .map(wall => ({ wall, trecho: trechoMaisLargo(wall) }))
    .filter((c): c is { wall: SceneWall; trecho: Trecho } => c.trecho !== null && c.trecho.end - c.trecho.start >= 1.1)
    .sort((a, b) => (b.trecho.end - b.trecho.start) - (a.trecho.end - a.trecho.start))
    .slice(0, quantas);
  return candidatas.map(({ wall, trecho }) => {
    const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const dx = (wall.end.x - wall.start.x) / comprimento;
    const dz = (wall.end.z - wall.start.z) / comprimento;
    // A parede cresce para fora; o lado de dentro é o oposto da normal externa.
    const dentroX = -dz, dentroZ = dx;
    const meio = (trecho.start + trecho.end) / 2;
    const rotationY = Math.atan2(dentroX, dentroZ);
    return {
      text: room.name,
      x: wall.start.x + dx * meio + dentroX * .03,
      y: Math.max(.6, wall.height - .34),
      z: wall.start.z + dz * meio + dentroZ * .03,
      rotationY,
      width: Math.min((trecho.end - trecho.start) * .78, 2.3),
      kind: 'parede' as const,
    };
  });
}

// Sobre cada porta, o nome do cômodo do outro lado. A vizinhança é geométrica: um passo
// para fora da parede, a partir do meio do vão, cai dentro do cômodo vizinho.
export function doorwayLabels(rooms: SceneRoom[]): SurfaceLabel[] {
  const rotulos: SurfaceLabel[] = [];
  for (const room of rooms) {
    for (const wall of room.walls) {
      const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
      if (!(comprimento > 0)) continue;
      const dx = (wall.end.x - wall.start.x) / comprimento;
      const dz = (wall.end.z - wall.start.z) / comprimento;
      const foraX = dz, foraZ = -dx;
      for (const vao of wall.openings) {
        if (vao.type !== 'door') continue;
        const topo = vao.base + vao.height;
        if (topo + .3 > wall.height) continue;
        const meio = vao.offset + vao.width / 2;
        const px = wall.start.x + dx * meio, pz = wall.start.z + dz * meio;
        const alem = { x: px + foraX * (wall.thickness + .25), z: pz + foraZ * (wall.thickness + .25) };
        const vizinho = rooms.find(r => r !== room && dentro(r.contour, alem.x, alem.z));
        if (!vizinho) continue;
        rotulos.push({
          text: `${SETA_DESTINO} ${vizinho.name}`,
          x: px - foraX * .03,
          y: Math.min(topo + .22, wall.height - .12),
          z: pz - foraZ * .03,
          rotationY: Math.atan2(-foraX, -foraZ),
          width: Math.min(vao.width * .95, 1.5),
          kind: 'porta' as const,
        });
      }
    }
  }
  return rotulos;
}

export type WallDimension = { x: number; z: number; rotationY: number; length: number; text: string; wallId: string };

// Cota de cada parede, deitada no piso e recuada para dentro do cômodo. O comprimento é o
// da parede traçada; a cota impressa da planta continua sendo outra coisa, conferida em checks.
export function wallDimensions(room: SceneRoom, recuo = .32): WallDimension[] {
  const cotas: WallDimension[] = [];
  for (const wall of room.walls) {
    const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    if (comprimento < .6) continue;
    const dx = (wall.end.x - wall.start.x) / comprimento;
    const dz = (wall.end.z - wall.start.z) / comprimento;
    // A parede cresce para fora; a cota vai para o lado de dentro.
    const dentroX = -dz, dentroZ = dx;
    const meioX = (wall.start.x + wall.end.x) / 2 + dentroX * recuo;
    const meioZ = (wall.start.z + wall.end.z) / 2 + dentroZ * recuo;
    cotas.push({
      x: meioX, z: meioZ,
      rotationY: Math.atan2(-dz, dx),
      length: comprimento,
      text: `${comprimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`,
      wallId: wall.id,
    });
  }
  return cotas;
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
  return innerPoint(melhorSala.contour);
}

export function mountPreview(host: HTMLElement, report: (message: string) => void, fullscreenTarget?: HTMLElement): PreviewHandle {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: true, alpha: false }); }
  catch {
    report('WebGL indisponível. A planta, a calibração e as fotos continuam disponíveis.');
    return { show() {}, setWallsVisible() {}, lookFromTop() {}, frame() {}, enterWalk() {}, exitWalk() {}, viewFromPose() {}, setPalette() {}, setFurniture() {}, setLabels() {}, setDimensions() {}, setClickToWalk() {}, toggleFullscreen() {}, isFullscreen() { return false; }, setWalkListener() {}, access() { return null; }, setSceneListener() {}, stats() { return { calls: 0, triangles: 0, frameMs: null }; }, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  host.prepend(renderer.domElement);
  const tela = renderer.domElement;
  tela.setAttribute('aria-label', 'Vista 3D do apartamento, gerada a partir do traçado da planta');
  tela.tabIndex = 0;

  const scene = new Scene();
  scene.background = new Color('#eeeee7');
  const ambiente = new AmbientLight('#ffffff', 1.9);
  scene.add(ambiente);
  const sol = new DirectionalLight('#ffffff', 1.1);
  sol.position.set(-6, 14, 8);
  scene.add(sol);

  const grade = new GridHelper(16, 16, '#bcc9bd', '#d8dfd3');
  scene.add(grade);
  const pisos = new Group();
  const moveis = new Group();
  const rotulos = new Group();
  const letreiros = new Group();
  const cotasGrupo = new Group();
  const paredes = new Group();
  scene.add(pisos, paredes, moveis, rotulos, letreiros, cotasGrupo);

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
  // Um material por cor declarada, reaproveitado: a cena tem centenas de blocos e poucas cores.
  const porCor = new Map<string, MeshLambertMaterial>();
  const material = (cor: string, faceDupla = false) => {
    const chave = `${cor}|${faceDupla}`;
    let m = porCor.get(chave);
    if (!m) { m = new MeshLambertMaterial({ color: cor, side: faceDupla ? DoubleSide : undefined }); porCor.set(chave, m); }
    return m;
  };
  const materialEsquadria = new MeshLambertMaterial({ color: ESQUADRIA });
  const materialVidro = new MeshLambertMaterial({ color: VIDRO, transparent: true, opacity: .34 });
  let paleta: PaletteMode = 'materiais';
  let comMobilia = true;
  let comRotulos = true;
  let comCotas = false;
  let ultimasSalas: SceneRoom[] | null = null;

  let limites = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };
  let barreiras: Barrier[] = [];
  let partida: Ponto | null = null;
  let andando = false;
  let emPose = false;
  let alturaOlhos = ALTURA_OLHOS;
  const alvoTelaCheia = fullscreenTarget ?? host;
  let trocaDeTela = 0;
  let aoClicarNaCena: (() => void) | null = null;
  let ouvinteDaCena: SceneListener | null = null;
  // Média móvel do intervalo entre quadros do passeio. É a única medida de desempenho que vale:
  // com a cena parada o renderizador não desenha nada e qualquer número seria fictício.
  let mediaQuadro: number | null = null;
  const avisarInterior = () => ouvinteDaCena?.interior(andando || emPose);
  // Telas de toque não têm ponteiro para prender nem teclado à mão: o passeio precisa de
  // controles próprios, e pedir a trava do ponteiro ali só produziria um erro silencioso.
  const ponteiroGrosso = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let apertou: { x: number; y: number; t: number } | null = null;

  // Clique curto na cena parada entra no passeio. Arrastar continua girando a órbita:
  // a diferença é deslocamento e tempo, não o botão.
  const marcarAperto = (event: PointerEvent) => { apertou = andando ? null : { x: event.clientX, y: event.clientY, t: performance.now() }; };
  const talvezPassear = (event: PointerEvent) => {
    const inicio = apertou;
    apertou = null;
    if (!inicio || andando || !aoClicarNaCena) return;
    if (Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y) > 5) return;
    if (performance.now() - inicio.t > 400) return;
    aoClicarNaCena();
  };

  function alternarTelaCheia() {
    trocaDeTela = performance.now();
    if (document.fullscreenElement === alvoTelaCheia) document.exitFullscreen?.().catch(() => {});
    else alvoTelaCheia.requestFullscreen?.().catch(() => report('O navegador recusou a tela cheia.'));
  }

  // Entrar ou sair de tela cheia solta o ponteiro em alguns navegadores. Sem isto, o passeio
  // terminaria sozinho no instante em que a tela cheia é acionada.
  const aoTrocarTelaCheia = () => {
    if (!andando) return;
    trocaDeTela = performance.now();
    if (!ponteiroGrosso() && document.pointerLockElement !== tela) tela.requestPointerLock?.();
  };
  let poseDeOrigem: PoseView | null = null;
  let avisarPasseio: (state: WalkState | null) => void = () => {};
  let ultimo: WalkState | null = null;

  // Só avisa quando de fato mudou: a planta não precisa ser redesenhada 60 vezes por segundo.
  function avisarPosicao() {
    const estado: WalkState = {
      x: camera.position.x, z: camera.position.z, headingDeg: headingFromYaw(yaw),
      hFovDeg: horizontalFovDeg(camera.fov, camera.aspect),
    };
    if (ultimo && Math.abs(ultimo.x - estado.x) < 0.01 && Math.abs(ultimo.z - estado.z) < 0.01
      && Math.abs(ultimo.headingDeg - estado.headingDeg) < 0.5
      && Math.abs(ultimo.hFovDeg - estado.hFovDeg) < 0.5) return;
    ultimo = estado;
    avisarPasseio(estado);
  }
  const teclas = new Set<string>();
  let avancoDoMouse = false;
  let dedos: TouchPoint[] = [];

  // Botões na própria cena: no celular não há W nem seta, e o arrasto já está ocupado
  // girando a vista. Cada botão apenas segura a mesma tecla que o teclado seguraria.
  const comandos = document.createElement('div');
  comandos.className = 'walk-pad';
  comandos.hidden = true;
  for (const [tecla, sinal, titulo] of [
    ['w', '▲', 'Andar para a frente'],
    ['a', '◀', 'Deslocar para a esquerda'],
    ['s', '▼', 'Andar para trás'],
    ['d', '▶', 'Deslocar para a direita'],
  ] as [string, string, string][]) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = sinal;
    botao.title = titulo;
    botao.setAttribute('aria-label', titulo);
    botao.dataset.dir = tecla;
    botao.addEventListener('pointerdown', event => { event.preventDefault(); teclas.add(tecla); });
    for (const fim of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
      botao.addEventListener(fim, () => teclas.delete(tecla));
    }
    comandos.appendChild(botao);
  }
  host.appendChild(comandos);

  const pontosDeToque = (event: TouchEvent): TouchPoint[] =>
    Array.from(event.touches, toque => ({ x: toque.clientX, y: toque.clientY }));

  const aoTocar = (event: TouchEvent) => {
    if (!andando) return;
    event.preventDefault();
    dedos = pontosDeToque(event);
  };
  const aoArrastarDedo = (event: TouchEvent) => {
    if (!andando) return;
    event.preventDefault();
    const atual = pontosDeToque(event);
    const gesto = touchGesture(dedos, atual);
    dedos = atual;
    if (gesto.look) olhar(gesto.look.dx * TOQUE_SENSIBILIDADE, gesto.look.dy * TOQUE_SENSIBILIDADE);
    // Uma pinça pequena é tremor de dedo, não intenção de aproximar.
    if (Math.abs(gesto.pinch) > 2) {
      camera.fov = zoomFov(camera.fov, -gesto.pinch);
      camera.updateProjectionMatrix();
    }
    avisarPosicao();
    render();
  };
  let yaw = 0, pitch = 0, quadro = 0, instante = 0;

  function limpar(grupo: Group) {
    for (const filho of grupo.children) {
      if (!(filho instanceof Mesh)) continue;
      filho.geometry.dispose();
      // Rótulos têm textura própria por cômodo; sem descartar, cada remontagem vaza memória.
      const material = filho.material;
      if (material instanceof MeshBasicMaterial && material.map) { material.map.dispose(); material.dispose(); }
    }
    grupo.clear();
  }

  // Uma linha de texto virando textura. Serve ao piso e às paredes.
  function textoEmPlano(linhas: string[], largura: number, corPrincipal: string, fundo?: string) {
    const escala = 256;
    const canvas = document.createElement('canvas');
    canvas.width = escala; canvas.height = Math.round(escala / (linhas.length > 1 ? 2.6 : 4.2));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (fundo) {
      ctx.fillStyle = fundo;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, canvas.height * .22);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = corPrincipal;
    const tamanho = Math.round(canvas.height * (linhas.length > 1 ? .34 : .52));
    ctx.font = `600 ${tamanho}px "Segoe UI", system-ui, sans-serif`;
    linhas.forEach((linha, i) => {
      const y = linhas.length === 1 ? canvas.height / 2 : canvas.height * (i === 0 ? .34 : .72);
      ctx.fillText(linha, canvas.width / 2, y, canvas.width * .92);
    });
    const altura = largura * (canvas.height / canvas.width);
    return new Mesh(
      new PlaneGeometry(largura, altura),
      // `toneMapped: false` mantém nome de cômodo, área e destino com o mesmo contraste em qualquer
      // configuração de exposição: o texto é instrumento de leitura, não superfície iluminada.
      new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false }),
    );
  }

  // A cota é desenhada inteira numa textura: linha, setas nas pontas e o número no meio.
  // Um plano por parede, deitado no piso — mais barato que montar cada traço em geometria.
  function montarCota(cota: WallDimension) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const y = canvas.height * .62, m = 14;
    ctx.strokeStyle = '#7c5a3f'; ctx.fillStyle = '#7c5a3f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(canvas.width - m, y); ctx.stroke();
    // Traços de extremidade e setas apontando para elas.
    for (const [x, sentido] of [[m, 1], [canvas.width - m, -1]] as [number, number][]) {
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + sentido * 22, y - 9); ctx.lineTo(x + sentido * 22, y + 9);
      ctx.closePath(); ctx.fill();
    }
    ctx.font = '600 40px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const largura = ctx.measureText(cota.text).width + 18;
    ctx.fillStyle = '#f7f4ecee';
    ctx.fillRect(canvas.width / 2 - largura / 2, y - 30, largura, 36);
    ctx.fillStyle = '#5d4028';
    ctx.fillText(cota.text, canvas.width / 2, y - 4);
    const altura = cota.length * (canvas.height / canvas.width);
    const mesh = new Mesh(
      new PlaneGeometry(cota.length, altura),
      new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false }),
    );
    mesh.rotation.order = 'YXZ';
    mesh.rotation.set(-Math.PI / 2, cota.rotationY, 0);
    mesh.position.set(cota.x, .015, cota.z);
    cotasGrupo.add(mesh);
  }

  // Nome do cômodo no alto da parede e destino escrito sobre cada porta: é o que orienta
  // quem caminha, já que o rótulo do piso fica fora do campo de visão a 1,60 m de altura.
  function montarLetreiro(label: SurfaceLabel) {
    const mesh = textoEmPlano(
      [label.text],
      label.width,
      label.kind === 'porta' ? '#7a4a33' : '#41544a',
      label.kind === 'porta' ? '#fdf7f0e6' : '#f7f8f2cc',
    );
    if (!mesh) return;
    mesh.position.set(label.x, label.y, label.z);
    mesh.rotation.y = label.rotationY;
    letreiros.add(mesh);
  }

  // O rótulo é uma textura de canvas deitada no piso. Não usa fonte externa nem geometria
  // de texto: é a forma mais barata de escrever no chão sem dependência nova.
  function montarRotulo(room: SceneRoom) {
    const lugar = labelPlacement(room);
    if (!lugar) return;
    const area = lugar.area.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mesh = textoEmPlano([room.name, `${area} m²`], lugar.width, '#2b3b33');
    if (!mesh) return;
    mesh.rotation.x = -Math.PI / 2;
    // Um centímetro acima do piso: evita o cintilar de duas superfícies no mesmo plano.
    mesh.position.set(lugar.center.x, .01, lugar.center.z);
    rotulos.add(mesh);
  }

  function montarPiso(room: SceneRoom) {
    const forma = new Shape();
    room.contour.forEach((p, i) => (i === 0 ? forma.moveTo(p.x, -p.z) : forma.lineTo(p.x, -p.z)));
    forma.closePath();
    const cor = paleta === 'materiais'
      ? material(room.finishes.floor, true)
      : room.verification === 'sem-cota' ? materiais.semCota : materiais.conferido;
    const piso = new Mesh(new ShapeGeometry(forma), cor);
    piso.rotation.x = -Math.PI / 2;
    // Etiqueta de origem: é o que permite a outro módulo achar as malhas de um cômodo sem
    // reconstruir a cena nem manter uma segunda lista para se desencontrar da primeira.
    piso.userData = { roomId: room.id, kind: 'piso' };
    pisos.add(piso);
  }

  function montarParede(wall: SceneWall, room: SceneRoom) {
    const corParede = paleta === 'materiais' ? material(room.finishes.wall) : materiais.parede;
    for (const bloco of wallBlocks(wall)) {
      const mesh = new Mesh(new BoxGeometry(bloco.size[0], bloco.size[1], bloco.size[2]), corParede);
      mesh.position.set(bloco.position[0], bloco.position[1], bloco.position[2]);
      mesh.rotation.y = bloco.rotationY;
      mesh.userData = { roomId: room.id, kind: 'parede' };
      paredes.add(mesh);
    }
    for (const parte of openingParts(wall)) {
      const mesh = new Mesh(new BoxGeometry(parte.size[0], parte.size[1], parte.size[2]), parte.part === 'glass' ? materialVidro : materialEsquadria);
      mesh.position.set(parte.position[0], parte.position[1], parte.position[2]);
      mesh.rotation.y = parte.rotationY;
      mesh.userData = { roomId: room.id, kind: parte.part === 'glass' ? 'vidro' : 'esquadria' };
      paredes.add(mesh);
    }
  }

  function show(rooms: SceneRoom[] | null) {
    ultimasSalas = rooms;
    exitWalk();
    viewFromPose(null);
    limpar(pisos);
    limpar(paredes);
    limpar(moveis);
    limpar(rotulos);
    limpar(letreiros);
    limpar(cotasGrupo);
    grade.visible = !rooms || rooms.length === 0;
    barreiras = []; partida = null;
    if (!rooms || rooms.length === 0) { limites = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 }; frame(); return; }
    const xs: number[] = [], zs: number[] = [];
    for (const room of rooms) {
      montarPiso(room);
      if (comRotulos) montarRotulo(room);
      if (comCotas) for (const cota of wallDimensions(room)) montarCota(cota);
      for (const label of wallLabels(room)) montarLetreiro(label);
      for (const wall of room.walls) montarParede(wall, room);
      if (comMobilia) for (const fixture of room.fixtures) {
        const bloco = fixtureBlock(fixture);
        const mesh = new Mesh(new BoxGeometry(bloco.size[0], bloco.size[1], bloco.size[2]), material(fixture.color));
        mesh.position.set(bloco.position[0], bloco.position[1], bloco.position[2]);
        mesh.userData = { roomId: room.id, kind: 'movel' };
        moveis.add(mesh);
      }
      for (const p of room.contour) { xs.push(p.x); zs.push(p.z); }
    }
    for (const label of doorwayLabels(rooms)) montarLetreiro(label);
    // Letreiros de parede e de porta só fazem sentido de dentro: na visão geral seriam ruído.
    letreiros.visible = andando;
    limites = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
    barreiras = barriersFrom(rooms, ALTURA_CORPO, comMobilia);
    partida = startingPoint(rooms);
    // A cena foi remontada: quem a estende precisa refazer o que dependia das malhas antigas, e o
    // mapa de sombra, se houver, está descrito sobre geometria que não existe mais.
    ouvinteDaCena?.rebuilt(rooms);
    renderer.shadowMap.needsUpdate = true;
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
      camera.fov = FOV_PASSEIO;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      avisarInterior();
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
    avisarInterior();
    render();
  }

  function olhar(dx: number, dy: number) {
    yaw -= dx * .0026;
    pitch = Math.max(-PITCH_LIMITE, Math.min(PITCH_LIMITE, pitch - dy * .0026));
  }
  const aoMover = (event: MouseEvent) => { if (andando) olhar(event.movementX, event.movementY); };
  // Segurar o botão do mouse anda para a frente: em tela cheia, é o gesto natural, e o
  // teclado deixa de ser obrigatório para avançar.
  const aoApertarMouse = (event: MouseEvent) => { if (andando && event.button === 0) { avancoDoMouse = true; event.preventDefault(); } };
  const aoSoltarMouse = (event: MouseEvent) => { if (event.button === 0) avancoDoMouse = false; };
  const aoRolar = (event: WheelEvent) => {
    if (!andando) return;
    event.preventDefault();
    camera.fov = zoomFov(camera.fov, event.deltaY);
    camera.updateProjectionMatrix();
    avisarPosicao();
    render();
  };
  const aoTeclar = (event: KeyboardEvent) => {
    if (!andando) return;
    if (event.key === 'Escape') { exitWalk(); return; }
    if (event.key === 'f' || event.key === 'F') { event.preventDefault(); alternarTelaCheia(); return; }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    teclas.add(event.key.toLowerCase());
  };
  const aoSoltar = (event: KeyboardEvent) => teclas.delete(event.key.toLowerCase());
  const aoTrocarTrava = () => {
    if (!andando || document.pointerLockElement === tela) return;
    // Perda de ponteiro logo após uma troca de tela cheia é da transição, não do usuário.
    if (performance.now() - trocaDeTela < 900) { tela.requestPointerLock?.(); return; }
    exitWalk();
  };

  function passo(agora: number) {
    if (!andando) return;
    quadro = requestAnimationFrame(passo);
    const dt = Math.min(.05, (agora - instante) / 1000 || 0);
    const ms = agora - instante;
    if (ms > 0 && ms < 500) mediaQuadro = mediaQuadro === null ? ms : mediaQuadro * .9 + ms * .1;
    instante = agora;
    let frente = 0, lado = 0;
    if (teclas.has('w') || teclas.has('arrowup') || avancoDoMouse) frente += 1;
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
    camera.position.y = alturaOlhos;
    avisarPosicao();
    render();
  }

  function enterWalk(from?: PoseView | null) {
    if (andando || (!partida && !from)) return;
    andando = true;
    controls.enabled = false;
    // Entrando de uma fotografia, o passeio começa exatamente onde ela foi tirada.
    // Sair do passeio devolve à mesma vista, em vez de reenquadrar o apartamento inteiro.
    poseDeOrigem = from ?? null;
    const inicial = from
      ? walkStartFromPose(from)
      : { x: partida!.x, z: partida!.z, eyeHeight: ALTURA_OLHOS, yaw: 0, pitch: 0 };
    alturaOlhos = inicial.eyeHeight;
    // Mesmo vindo de uma pose, a colisão vale: poses marcadas rentes à parede seriam
    // um começo dentro da alvenaria.
    const inicio = resolveCollision(inicial.x, inicial.z, RAIO_CORPO, barreiras);
    camera.position.set(inicio.x, alturaOlhos, inicio.z);
    yaw = inicial.yaw; pitch = inicial.pitch;
    emPose = false;
    camera.fov = FOV_PASSEIO;
    camera.updateProjectionMatrix();
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    teclas.clear();
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('keyup', aoSoltar);
    document.addEventListener('mousemove', aoMover);
    document.addEventListener('pointerlockchange', aoTrocarTrava);
    tela.addEventListener('wheel', aoRolar, { passive: false });
    tela.addEventListener('mousedown', aoApertarMouse);
    document.addEventListener('mouseup', aoSoltarMouse);
    tela.addEventListener('touchstart', aoTocar, { passive: false });
    tela.addEventListener('touchmove', aoArrastarDedo, { passive: false });
    tela.addEventListener('touchend', aoTocar, { passive: false });
    tela.addEventListener('touchcancel', aoTocar, { passive: false });
    document.addEventListener('fullscreenchange', aoTrocarTelaCheia);
    letreiros.visible = true;
    tela.focus();
    comandos.hidden = !ponteiroGrosso();
    if (!ponteiroGrosso()) tela.requestPointerLock?.();
    instante = performance.now();
    quadro = requestAnimationFrame(passo);
    ultimo = null;
    mediaQuadro = null;
    avisarInterior();
    avisarPosicao();
  }

  function exitWalk() {
    if (!andando) return;
    andando = false;
    cancelAnimationFrame(quadro);
    window.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('keyup', aoSoltar);
    document.removeEventListener('mousemove', aoMover);
    document.removeEventListener('pointerlockchange', aoTrocarTrava);
    tela.removeEventListener('wheel', aoRolar);
    tela.removeEventListener('mousedown', aoApertarMouse);
    document.removeEventListener('mouseup', aoSoltarMouse);
    tela.removeEventListener('touchstart', aoTocar);
    tela.removeEventListener('touchmove', aoArrastarDedo);
    tela.removeEventListener('touchend', aoTocar);
    tela.removeEventListener('touchcancel', aoTocar);
    avancoDoMouse = false;
    dedos = [];
    comandos.hidden = true;
    document.removeEventListener('fullscreenchange', aoTrocarTelaCheia);
    letreiros.visible = false;
    camera.fov = FOV_PASSEIO;
    camera.updateProjectionMatrix();
    if (document.pointerLockElement === tela) document.exitPointerLock?.();
    controls.enabled = true;
    ultimo = null;
    alturaOlhos = ALTURA_OLHOS;
    avisarPasseio(null);
    const volta = poseDeOrigem;
    poseDeOrigem = null;
    avisarInterior();
    if (volta) viewFromPose(volta);
    else frame();
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
    access() { return { scene, renderer, pisos, paredes, moveis, ambiente, sol, render }; },
    setSceneListener(listener) {
      ouvinteDaCena = listener;
      if (!listener) return;
      // Quem chega depois da cena montada recebe o estado atual, em vez de esperar a próxima troca.
      listener.rebuilt(ultimasSalas);
      listener.interior(andando || emPose);
    },
    stats() {
      const info = renderer.info.render;
      return { calls: info.calls, triangles: info.triangles, frameMs: mediaQuadro };
    },
    setClickToWalk(handler) {
      aoClicarNaCena = handler;
      tela.removeEventListener('pointerdown', marcarAperto);
      tela.removeEventListener('pointerup', talvezPassear);
      if (handler) { tela.addEventListener('pointerdown', marcarAperto); tela.addEventListener('pointerup', talvezPassear); }
    },
    toggleFullscreen() { alternarTelaCheia(); },
    isFullscreen() { return document.fullscreenElement === alvoTelaCheia; },
    setDimensions(visible) {
      if (visible === comCotas) return;
      comCotas = visible;
      if (ultimasSalas) show(ultimasSalas);
    },
    setLabels(visible) {
      if (visible === comRotulos) return;
      comRotulos = visible;
      if (ultimasSalas) show(ultimasSalas);
    },
    setFurniture(visible) {
      if (visible === comMobilia) return;
      comMobilia = visible;
      if (ultimasSalas) show(ultimasSalas);
    },
    setPalette(mode) {
      if (mode === paleta) return;
      paleta = mode;
      // Repinta remontando: os materiais são compartilhados por cor, não por malha.
      if (ultimasSalas) show(ultimasSalas);
    },
    dispose() {
      exitWalk();
      comandos.remove();
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
