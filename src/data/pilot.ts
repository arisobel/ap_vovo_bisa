import seed from './apartment.json';
import { pixelDistance, planToWorld, type Point, type Transform } from '../plan/spatial';

export type ParameterStatus = 'estimado' | 'confirmado';
export type Parameter = { value: number; status: ParameterStatus; evidence: string };
export type ParameterName = 'wallHeight' | 'railingHeight' | 'wallThickness' | 'doorHeight' | 'windowBase' | 'windowHeight';
// Alturas que uma parede pode assumir. A parede escolhe um parâmetro nomeado, nunca um número solto:
// altura é estimativa com evidência, e mudar a estimativa tem de mudar todas as paredes de uma vez.
export type WallHeightParameter = 'wallHeight' | 'railingHeight';
export const wallHeightParameters: WallHeightParameter[] = ['wallHeight', 'railingHeight'];
export type Parameters = Record<ParameterName, Parameter>;
export type Wall = { id: string; edge: number; heightParameter: WallHeightParameter; evidence: string };
export type Opening = { id: string; wallId: string; type: 'door' | 'window'; offsetPixels: number; widthPixels: number; base: 0 | 'windowBase'; heightParameter: 'doorHeight' | 'windowHeight'; status: 'proposto'; evidence: string };
export type Confidence = 'alta' | 'media';
export type Check = { id: string; kind: 'length' | 'area'; printed: number; pixels: number; confidence: Confidence; evidence: string };
// Tolerância aceita por confiança. Não é margem de erro medida: é o quanto se admite de divergência antes de tratar o traçado como suspeito.
export const checkTolerance: Record<Confidence, number> = { alta: 1.5, media: 3.5 };
export type Verification = 'cota-impressa' | 'sem-cota';
// Acabamento é cor nomeada com evidência, como a altura de parede: nenhum hexadecimal solto na cena.
export type Material = { color: string; status: 'proposto' | 'confirmado'; evidence: string };
export type Finishes = { floor: string; wall: string; ceiling: string; evidence: string };
export type Palette = { floor: string; wall: string; ceiling: string };
// Peça de mobília. A pegada é retangular e alinhada aos eixos, em pixels da planta, como o
// contorno dos cômodos: recalibrar move os móveis junto com as paredes.
export type Footprint = { u: number; v: number; width: number; depth: number };
export type FixtureKind = 'banheira' | 'vaso' | 'bide' | 'cuba' | 'bancada' | 'armario' | 'box' | 'geladeira';
export type Fixture = {
  id: string; kind: FixtureKind; footprint: Footprint;
  base: number; height: number; material: string;
  // loose = móvel solto, que pode ter mudado de lugar. false = elemento fixo.
  loose: boolean; status: 'proposto' | 'confirmado'; evidence: string;
};
export const fixtureKinds: FixtureKind[] = ['banheira', 'vaso', 'bide', 'cuba', 'bancada', 'armario', 'box', 'geladeira'];
// Usado quando o arquivo não declara acabamento, para que as bases anteriores continuem válidas.
export const defaultFinishes: Finishes = { floor: 'piso-externo', wall: 'parede-branca', ceiling: 'teto-branco', evidence: 'Acabamento não declarado no arquivo; neutro adotado.' };
export type Room = { id: string; name: string; status: 'proposto'; verification: Verification; evidence: string; finishes: Finishes; fixtures: Fixture[]; contour: Point[]; walls: Wall[]; openings: Opening[]; checks: Check[] };
export type Apartment = { schemaVersion: 2; planId: string; planWidth: number; planHeight: number; convention: string; parameters: Parameters; materials: Record<string, Material>; rooms: Room[] };
export const parameterNames: ParameterName[] = ['wallHeight', 'railingHeight', 'wallThickness', 'doorHeight', 'windowBase', 'windowHeight'];
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Estrutura: ${message}`); }
const record = (v: unknown): Record<string, any> => { assert(v && typeof v === 'object' && !Array.isArray(v), 'objeto inválido.'); return v as Record<string, any>; };
const finite = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const evidence = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 5000;
const identifier = (v: unknown) => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v);

function validateParameters(value: unknown): Parameters {
  const raw = record(value);
  const parameters = {} as Parameters;
  for (const name of parameterNames) {
    const v = record(raw[name]);
    const bounds = name === 'wallThickness' ? [.05, .6] : name === 'windowBase' ? [0, 3] : [.2, 5];
    assert(finite(v.value, bounds[0], bounds[1]) && (v.status === 'estimado' || v.status === 'confirmado') && evidence(v.evidence), `parâmetro inválido: ${name}.`);
    parameters[name] = { value: v.value, status: v.status, evidence: v.evidence };
  }
  return parameters;
}

// Contorno ortogonal fechado: rejeita arestas degeneradas, cruzadas ou sobrepostas.
function validateContour(value: unknown, planWidth: number, planHeight: number): Point[] {
  assert(Array.isArray(value) && value.length >= 4 && value.length <= 64, 'contorno inválido.');
  const contour: Point[] = value.map((v: unknown) => {
    const q = record(v);
    assert(finite(q.u, 0, planWidth) && finite(q.v, 0, planHeight), 'ponto fora da planta.');
    return { u: q.u, v: q.v };
  });
  let area = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    assert(pixelDistance(a, b) >= 1 && (a.u === b.u || a.v === b.v), 'arestas devem ser ortogonais e não degeneradas.');
    area += a.u * b.v - b.u * a.v;
    for (let j = i + 1; j < contour.length; j++) {
      if (j === i + 1 || (i === 0 && j === contour.length - 1)) continue;
      const c = contour[j], d = contour[(j + 1) % contour.length];
      const overlapX = Math.max(Math.min(a.u, b.u), Math.min(c.u, d.u)) <= Math.min(Math.max(a.u, b.u), Math.max(c.u, d.u));
      const overlapY = Math.max(Math.min(a.v, b.v), Math.min(c.v, d.v)) <= Math.min(Math.max(a.v, b.v), Math.max(c.v, d.v));
      assert(!(overlapX && overlapY), 'contorno se cruza ou se toca.');
    }
  }
  assert(area > 0, 'contorno deve seguir sentido horário na planta e ter área positiva.');
  return contour;
}

const HEX = /^#[0-9a-f]{6}$/;
function validateMaterials(value: unknown): Record<string, Material> {
  const p = record(value);
  const nomes = Object.keys(p);
  assert(nomes.length > 0 && nomes.length <= 64, 'lista de materiais inválida.');
  const materiais: Record<string, Material> = {};
  for (const nome of nomes) {
    assert(identifier(nome), `identificador de material inválido: ${nome}.`);
    const m = record(p[nome]);
    assert(typeof m.color === 'string' && HEX.test(m.color), `cor inválida em ${nome}: use #rrggbb minúsculo.`);
    assert(m.status === 'proposto' || m.status === 'confirmado', `estado inválido em ${nome}.`);
    assert(evidence(m.evidence), `material ${nome} sem evidência escrita.`);
    materiais[nome] = { color: m.color, status: m.status, evidence: m.evidence };
  }
  return materiais;
}

function validateFinishes(value: unknown, materiais: Record<string, Material>, roomId: string): Finishes {
  if (value === undefined || value === null) return { ...defaultFinishes };
  const f = record(value);
  const acabamento = {} as Finishes;
  for (const parte of ['floor', 'wall', 'ceiling'] as const) {
    const nome = f[parte];
    assert(typeof nome === 'string' && materiais[nome] !== undefined, `acabamento ${parte} de ${roomId} aponta para material inexistente: ${String(nome)}.`);
    acabamento[parte] = nome;
  }
  assert(evidence(f.evidence), `acabamento de ${roomId} sem evidência escrita.`);
  acabamento.evidence = f.evidence as string;
  return acabamento;
}

// A pegada tem de caber dentro do contorno do cômodo: móvel não atravessa parede.
function validateFixtures(value: unknown, parameters: Parameters, materiais: Record<string, Material>, contour: Point[], roomId: string): Fixture[] {
  if (value === undefined || value === null) return [];
  assert(Array.isArray(value) && value.length <= 48, `lista de mobília inválida em ${roomId}.`);
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const f = record(item);
    assert(identifier(f.id) && !ids.has(f.id as string), `ID de mobília inválido/duplicado em ${roomId}.`);
    ids.add(f.id as string);
    assert(fixtureKinds.includes(f.kind as FixtureKind), `tipo de mobília desconhecido em ${f.id}: ${String(f.kind)}.`);
    const p = record(f.footprint);
    assert(finite(p.u, 0, 1e5) && finite(p.v, 0, 1e5) && finite(p.width, 1, 1e5) && finite(p.depth, 1, 1e5), `pegada inválida em ${f.id}.`);
    const u = p.u as number, v = p.v as number, w = p.width as number, d = p.depth as number;
    // Cantos puxados um décimo de pixel para dentro da própria pegada: peça encostada na
    // parede é o caso normal, e a parede é justamente o contorno.
    const e = Math.min(.1, w / 4, d / 4);
    for (const canto of [{ u: u + e, v: v + e }, { u: u + w - e, v: v + e }, { u: u + e, v: v + d - e }, { u: u + w - e, v: v + d - e }]) {
      assert(containsPoint(contour, canto), `a mobília ${f.id} não cabe dentro do contorno de ${roomId}.`);
    }
    assert(finite(f.base, 0, 5) && finite(f.height, .01, 5), `altura inválida em ${f.id}.`);
    assert((f.base as number) + (f.height as number) <= parameters.wallHeight.value + 1e-9, `a mobília ${f.id} passa do pé-direito.`);
    assert(typeof f.material === 'string' && materiais[f.material] !== undefined, `material inexistente em ${f.id}: ${String(f.material)}.`);
    assert(typeof f.loose === 'boolean', `${f.id} deve declarar se é móvel solto.`);
    assert(f.status === 'proposto' || f.status === 'confirmado', `estado inválido em ${f.id}.`);
    assert(evidence(f.evidence), `a mobília ${f.id} não registra evidência.`);
    return {
      id: f.id as string, kind: f.kind as FixtureKind, footprint: { u, v, width: w, depth: d },
      base: f.base as number, height: f.height as number, material: f.material as string,
      loose: f.loose as boolean, status: f.status as 'proposto' | 'confirmado', evidence: f.evidence as string,
    };
  });
}

function validateRoom(value: unknown, parameters: Parameters, materiais: Record<string, Material>, planWidth: number, planHeight: number): Room {
  const p = record(value);
  assert(identifier(p.id) && typeof p.name === 'string' && p.name.trim().length > 0 && p.status === 'proposto' && evidence(p.evidence), 'identificação, estado ou evidência do cômodo inválidos.');
  assert(p.verification === 'cota-impressa' || p.verification === 'sem-cota', `verificação inválida em ${p.id}.`);
  const finishes = validateFinishes(p.finishes, materiais, p.id as string);
  const contour = validateContour(p.contour, planWidth, planHeight);
  assert(Array.isArray(p.walls) && p.walls.length > 0 && p.walls.length <= contour.length, `paredes inválidas em ${p.id}.`);
  const ids = new Set<string>(), edges = new Set<number>();
  const walls: Wall[] = p.walls.map((item: unknown) => {
    const w = record(item);
    assert(identifier(w.id) && !ids.has(w.id), 'ID de parede inválido/duplicado.');
    assert(Number.isInteger(w.edge) && w.edge >= 0 && w.edge < contour.length && !edges.has(w.edge) && evidence(w.evidence), 'aresta/evidência da parede inválida.');
    // Ausente significa parede de pé-direito: os arquivos anteriores continuam válidos.
    const heightParameter = (w.heightParameter ?? 'wallHeight') as WallHeightParameter;
    assert(wallHeightParameters.includes(heightParameter), `altura de parede desconhecida em ${w.id}: ${String(w.heightParameter)}.`);
    assert(parameters.railingHeight.value <= parameters.wallHeight.value, 'guarda-corpo mais alto que o pé-direito.');
    ids.add(w.id); edges.add(w.edge); return { id: w.id as string, edge: w.edge as number, heightParameter, evidence: w.evidence as string };
  });
  assert(Array.isArray(p.openings) && p.openings.length <= 64, 'aberturas inválidas.');
  const openingIds = new Set<string>();
  const openings: Opening[] = p.openings.map((item: unknown) => {
    const o = record(item);
    assert(identifier(o.id) && !openingIds.has(o.id), 'ID de abertura inválido/duplicado.');
    openingIds.add(o.id);
    const wall = walls.find(w => w.id === o.wallId);
    assert(wall && (o.type === 'door' || o.type === 'window') && o.status === 'proposto' && evidence(o.evidence), 'parede/tipo/evidência da abertura inválidos.');
    const length = pixelDistance(contour[wall.edge], contour[(wall.edge + 1) % contour.length]);
    assert(finite(o.offsetPixels, 0, length) && finite(o.widthPixels, 1, length) && o.offsetPixels + o.widthPixels <= length, 'abertura fora dos limites da parede.');
    assert(o.type === 'door' ? o.base === 0 && o.heightParameter === 'doorHeight' : o.base === 'windowBase' && o.heightParameter === 'windowHeight', 'base/altura incompatível com o tipo.');
    const base = o.base === 0 ? 0 : parameters.windowBase.value;
    const height = parameters[o.heightParameter as 'doorHeight' | 'windowHeight'].value;
    // Contra a altura DESTA parede: um guarda-corpo de 1,10 m não comporta uma porta de 2,10 m.
    assert(base + height <= parameters[wall!.heightParameter].value, `abertura ${o.id} excede a altura da parede ${wall!.id}.`);
    return { id: o.id, wallId: o.wallId, type: o.type, offsetPixels: o.offsetPixels, widthPixels: o.widthPixels, base: o.base, heightParameter: o.heightParameter, status: 'proposto', evidence: o.evidence };
  });
  for (const wall of walls) {
    const slots = openings.filter(o => o.wallId === wall.id).sort((a, b) => a.offsetPixels - b.offsetPixels);
    for (let i = 1; i < slots.length; i++) assert(slots[i].offsetPixels >= slots[i - 1].offsetPixels + slots[i - 1].widthPixels, 'aberturas sobrepostas.');
  }
  const fixtures = validateFixtures(p.fixtures, parameters, materiais, contour, p.id as string);
  assert(Array.isArray(p.checks) && p.checks.length <= 16, 'lista de conferências inválida.');
  // Só é dispensado de conferência o cômodo que declara não ter número impresso na planta.
  assert(p.verification === 'sem-cota' || p.checks.length > 0, `o cômodo ${p.id} declara conferência por cota impressa mas não registra nenhuma.`);
  assert(p.verification === 'cota-impressa' || p.checks.length === 0, `o cômodo ${p.id} declara não ter cota impressa mas registra conferências.`);
  const checkIds = new Set<string>();
  const checks: Check[] = p.checks.map((item: unknown) => {
    const c = record(item);
    assert(identifier(c.id) && !checkIds.has(c.id), 'ID de conferência inválido/duplicado.');
    checkIds.add(c.id);
    assert((c.kind === 'length' || c.kind === 'area') && finite(c.printed, 1e-6, 1e4) && finite(c.pixels, 1e-6, 1e7) && evidence(c.evidence), 'conferência inválida.');
    assert(c.confidence === 'alta' || c.confidence === 'media', 'confiança da conferência inválida.');
    return { id: c.id, kind: c.kind, printed: c.printed, pixels: c.pixels, confidence: c.confidence, evidence: c.evidence };
  });
  return { id: p.id, name: p.name, status: 'proposto', verification: p.verification, evidence: p.evidence, finishes, contour, walls, openings, fixtures, checks };
}

export function validateApartment(value: unknown): Apartment {
  const p = record(value);
  assert(p.schemaVersion === 2 && p.planId === 'planta_apartamento' && evidence(p.convention), 'versão, planta ou convenção incompatível.');
  assert(finite(p.planWidth, 1, 1e5) && finite(p.planHeight, 1, 1e5), 'dimensões da planta inválidas.');
  const parameters = validateParameters(p.parameters);
  const materials = validateMaterials(p.materials);
  assert(Array.isArray(p.rooms) && p.rooms.length > 0 && p.rooms.length <= 40, 'lista de cômodos inválida.');
  const roomIds = new Set<string>();
  const rooms = p.rooms.map((item: unknown) => {
    const room = validateRoom(item, parameters, materials, p.planWidth, p.planHeight);
    assert(!roomIds.has(room.id), `cômodo duplicado: ${room.id}.`);
    roomIds.add(room.id);
    return room;
  });
  return { schemaVersion: 2, planId: 'planta_apartamento', planWidth: p.planWidth, planHeight: p.planHeight, convention: p.convention, parameters, materials, rooms };
}

export function initialApartment(): Apartment { return validateApartment(seed); }

// Ponto dentro do contorno, em pixels da planta. Usado para amarrar a pose de uma foto ao cômodo declarado.
export function containsPoint(contour: Point[], p: Point): boolean {
  let dentro = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const a = contour[i], b = contour[j];
    if ((a.v > p.v) !== (b.v > p.v) && p.u < (b.u - a.u) * (p.v - a.v) / (b.v - a.v) + a.u) dentro = !dentro;
  }
  return dentro;
}
export function findRoom(apartment: Apartment, id: string): Room {
  const room = apartment.rooms.find(r => r.id === id);
  assert(room, `cômodo desconhecido: ${id}.`);
  return room;
}

// Confere a medida impressa na planta contra a escala proposta. Não confirma nada: apenas mede o desvio.
export function checkDeviation(check: Check, transform: Transform) {
  assert(Number.isFinite(transform.metersPerPixel) && transform.metersPerPixel > 0, 'transformação inválida.');
  const measured = check.kind === 'length' ? check.pixels * transform.metersPerPixel : check.pixels * transform.metersPerPixel ** 2;
  const deviation = measured - check.printed;
  return { measured, deviation, deviationPercent: deviation / check.printed * 100 };
}

export type WallPiece = { start: number; end: number; base: number; height: number };
export function wallPieces(length: number, height: number, openings: { offset: number; width: number; base: number; height: number }[]): WallPiece[] {
  assert(finite(length, Number.MIN_VALUE, 1e6) && finite(height, Number.MIN_VALUE, 5), 'dimensões métricas inválidas.');
  const pieces: WallPiece[] = [];
  let cursor = 0;
  const add = (start: number, end: number, base: number, h: number) => { if (end > start && h > 0) pieces.push({ start, end, base, height: h }); };
  for (const o of [...openings].sort((a, b) => a.offset - b.offset)) {
    assert([o.offset, o.width, o.base, o.height].every(Number.isFinite) && o.offset >= cursor && o.width > 0 && o.base >= 0 && o.height > 0 && o.base + o.height <= height && o.offset + o.width <= length + 1e-9, 'vão métrico inválido ou sobreposto.');
    add(cursor, o.offset, 0, height);
    add(o.offset, o.offset + o.width, 0, o.base);
    add(o.offset, o.offset + o.width, o.base + o.height, height - o.base - o.height);
    cursor = o.offset + o.width;
  }
  add(cursor, length, 0, height); return pieces;
}

// Resolve os nomes de acabamento do cômodo nas cores declaradas.
export function palette(room: Room, materials: Record<string, Material>): Palette {
  const cor = (nome: string) => {
    const m = materials[nome];
    assert(m, `material não declarado: ${nome}.`);
    return m.color;
  };
  return { floor: cor(room.finishes.floor), wall: cor(room.finishes.wall), ceiling: cor(room.finishes.ceiling) };
}

export function deriveRoom(room: Room, parameters: Parameters, materials: Record<string, Material>, transform: Transform) {
  assert(Number.isFinite(transform.metersPerPixel) && transform.metersPerPixel > 0 && Number.isFinite(transform.origin.u) && Number.isFinite(transform.origin.v), 'transformação inválida.');
  const contour = room.contour.map(point => planToWorld(point, transform));
  const walls = room.walls.map(w => {
    const start = contour[w.edge], end = contour[(w.edge + 1) % contour.length];
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const openings = room.openings.filter(o => o.wallId === w.id).map(o => ({ ...o, offset: o.offsetPixels * transform.metersPerPixel, width: o.widthPixels * transform.metersPerPixel, base: o.base === 0 ? 0 : parameters.windowBase.value, height: parameters[o.heightParameter].value }));
    const height = parameters[w.heightParameter].value;
    return { id: w.id, start, end, length, height, heightParameter: w.heightParameter, thickness: parameters.wallThickness.value, openings, pieces: wallPieces(length, height, openings) };
  });
  const fixtures = room.fixtures.map(f => {
    const a = planToWorld({ u: f.footprint.u, v: f.footprint.v }, transform);
    const b = planToWorld({ u: f.footprint.u + f.footprint.width, v: f.footprint.v + f.footprint.depth }, transform);
    return {
      id: f.id, kind: f.kind, loose: f.loose, color: materials[f.material].color,
      center: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      size: { width: Math.abs(b.x - a.x), depth: Math.abs(b.z - a.z) },
      base: f.base, height: f.height,
    };
  });
  const checks = room.checks.map(c => ({ ...c, ...checkDeviation(c, transform) }));
  return { id: room.id, name: room.name, verification: room.verification, finishes: palette(room, materials), contour, walls, fixtures, checks };
}

export function deriveApartment(apartment: Apartment, transform: Transform) {
  return apartment.rooms.map(room => deriveRoom(room, apartment.parameters, apartment.materials, transform));
}
