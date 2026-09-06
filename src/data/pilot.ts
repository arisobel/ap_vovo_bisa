import seed from './apartment.json';
import { pixelDistance, planToWorld, type Point, type Transform } from '../plan/spatial';

export type Parameter = { value: number; status: 'estimado'; evidence: string };
export type ParameterName = 'wallHeight' | 'wallThickness' | 'doorHeight' | 'windowBase' | 'windowHeight';
export type Opening = { id: string; wallId: string; type: 'door' | 'window'; offsetPixels: number; widthPixels: number; base: 0 | 'windowBase'; heightParameter: 'doorHeight' | 'windowHeight'; status: 'proposto'; evidence: string };
export type Pilot = { id: 'living-pilot'; name: 'LIVING'; status: 'proposto'; evidence: string; contour: Point[]; parameters: Record<ParameterName, Parameter>; walls: { id: string; edge: number; evidence: string }[]; openings: Opening[] };
export const parameterNames: ParameterName[] = ['wallHeight', 'wallThickness', 'doorHeight', 'windowBase', 'windowHeight'];
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Piloto: ${message}`); }
const record = (v: unknown): Record<string, any> => { assert(v && typeof v === 'object' && !Array.isArray(v), 'objeto inválido.'); return v as Record<string, any>; };
const finite = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const evidence = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 5000;

export function validatePilot(value: unknown): Pilot {
  const p = record(value);
  assert(p.id === 'living-pilot' && p.name === 'LIVING' && p.status === 'proposto' && evidence(p.evidence), 'identificação, estado ou evidência inválidos.');
  assert(Array.isArray(p.contour) && p.contour.length >= 4 && p.contour.length <= 64, 'contorno inválido.');
  const contour: Point[] = p.contour.map((v: unknown) => { const q = record(v); assert(finite(q.u, 0, 506) && finite(q.v, 0, 854), 'ponto fora da planta.'); return { u: q.u, v: q.v }; });
  // Piloto ortogonal: rejeitar arestas degeneradas, cruzadas ou sobrepostas.
  let area = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    assert(pixelDistance(a, b) >= 1 && (a.u === b.u || a.v === b.v), 'arestas devem ser ortogonais e não degeneradas.');
    area += a.u * b.v - b.u * a.v;
    for (let j = i + 1; j < contour.length; j++) {
      if (j === i + 1 || (i === 0 && j === contour.length - 1)) continue;
      const c = contour[j], d = contour[(j + 1) % contour.length];
      const overlapX = Math.max(Math.min(a.u,b.u),Math.min(c.u,d.u)) <= Math.min(Math.max(a.u,b.u),Math.max(c.u,d.u));
      const overlapY = Math.max(Math.min(a.v,b.v),Math.min(c.v,d.v)) <= Math.min(Math.max(a.v,b.v),Math.max(c.v,d.v));
      assert(!(overlapX && overlapY), 'contorno se cruza ou se toca.');
    }
  }
  assert(area > 0, 'contorno deve seguir sentido horário na planta e ter área positiva.');
  const rawParams = record(p.parameters);
  const parameters = {} as Pilot['parameters'];
  for (const name of parameterNames) {
    const v = record(rawParams[name]);
    const bounds = name === 'wallThickness' ? [.05, .6] : name === 'windowBase' ? [0, 3] : [.2, 5];
    assert(finite(v.value, bounds[0], bounds[1]) && v.status === 'estimado' && evidence(v.evidence), `parâmetro inválido: ${name}.`);
    parameters[name] = { value: v.value, status: 'estimado', evidence: v.evidence };
  }
  assert(Array.isArray(p.walls) && p.walls.length > 0 && p.walls.length <= contour.length, 'paredes inválidas.');
  const ids = new Set<string>(), edges = new Set<number>();
  const walls = p.walls.map((item: unknown) => {
    const w = record(item);
    assert(typeof w.id === 'string' && /^[a-z0-9-]{1,80}$/.test(w.id) && !ids.has(w.id), 'ID de parede inválido/duplicado.');
    assert(Number.isInteger(w.edge) && w.edge >= 0 && w.edge < contour.length && !edges.has(w.edge) && evidence(w.evidence), 'aresta/evidência da parede inválida.');
    ids.add(w.id); edges.add(w.edge); return { id: w.id as string, edge: w.edge as number, evidence: w.evidence as string };
  });
  assert(Array.isArray(p.openings) && p.openings.length <= 64, 'aberturas inválidas.');
  const openingIds = new Set<string>();
  const openings: Opening[] = p.openings.map((item: unknown) => {
    const o = record(item);
    assert(typeof o.id === 'string' && /^[a-z0-9-]{1,80}$/.test(o.id) && !openingIds.has(o.id), 'ID de abertura inválido/duplicado.');
    openingIds.add(o.id);
    const wall = walls.find(w => w.id === o.wallId);
    assert(wall && (o.type === 'door' || o.type === 'window') && o.status === 'proposto' && evidence(o.evidence), 'parede/tipo/evidência da abertura inválidos.');
    const length = pixelDistance(contour[wall.edge], contour[(wall.edge + 1) % contour.length]);
    assert(finite(o.offsetPixels, 0, length) && finite(o.widthPixels, 1, length) && o.offsetPixels + o.widthPixels <= length, 'abertura fora dos limites da parede.');
    assert(o.type === 'door' ? o.base === 0 && o.heightParameter === 'doorHeight' : o.base === 'windowBase' && o.heightParameter === 'windowHeight', 'base/altura incompatível com o tipo.');
    const base = o.base === 0 ? 0 : parameters.windowBase.value;
    const height = parameters[o.heightParameter as 'doorHeight' | 'windowHeight'].value;
    assert(base + height <= parameters.wallHeight.value, 'abertura excede a altura da parede.');
    return { id: o.id, wallId: o.wallId, type: o.type, offsetPixels: o.offsetPixels, widthPixels: o.widthPixels, base: o.base, heightParameter: o.heightParameter, status: 'proposto', evidence: o.evidence };
  });
  for (const wall of walls) {
    const slots = openings.filter(o => o.wallId === wall.id).sort((a,b) => a.offsetPixels - b.offsetPixels);
    for (let i = 1; i < slots.length; i++) assert(slots[i].offsetPixels >= slots[i-1].offsetPixels + slots[i-1].widthPixels, 'aberturas sobrepostas.');
  }
  return { id: 'living-pilot', name: 'LIVING', status: 'proposto', evidence: p.evidence, contour, parameters, walls, openings };
}
export function initialPilot(): Pilot { return validatePilot(seed); }

export type WallPiece = { start: number; end: number; base: number; height: number };
export function wallPieces(length: number, height: number, openings: { offset: number; width: number; base: number; height: number }[]): WallPiece[] {
  assert(finite(length, Number.MIN_VALUE, 1e6) && finite(height, Number.MIN_VALUE, 5), 'dimensões métricas inválidas.');
  const pieces: WallPiece[] = [];
  let cursor = 0;
  const add = (start: number, end: number, base: number, h: number) => { if (end > start && h > 0) pieces.push({ start, end, base, height: h }); };
  for (const o of [...openings].sort((a,b) => a.offset - b.offset)) {
    assert([o.offset,o.width,o.base,o.height].every(Number.isFinite) && o.offset >= cursor && o.width > 0 && o.base >= 0 && o.height > 0 && o.base + o.height <= height && o.offset + o.width <= length + 1e-9, 'vão métrico inválido ou sobreposto.');
    add(cursor, o.offset, 0, height);
    add(o.offset, o.offset + o.width, 0, o.base);
    add(o.offset, o.offset + o.width, o.base + o.height, height - o.base - o.height);
    cursor = o.offset + o.width;
  }
  add(cursor, length, 0, height); return pieces;
}
export function derivePilot(pilot: Pilot, transform: Transform) {
  assert(Number.isFinite(transform.metersPerPixel) && transform.metersPerPixel > 0 && Number.isFinite(transform.origin.u) && Number.isFinite(transform.origin.v), 'transformação inválida.');
  const p = validatePilot(pilot);
  const contour = p.contour.map(point => planToWorld(point, transform));
  const walls = p.walls.map(w => {
    const start = contour[w.edge], end = contour[(w.edge + 1) % contour.length];
    const length = Math.hypot(end.x-start.x, end.z-start.z);
    const openings = p.openings.filter(o => o.wallId === w.id).map(o => ({ ...o, offset: o.offsetPixels * transform.metersPerPixel, width: o.widthPixels * transform.metersPerPixel, base: o.base === 0 ? 0 : p.parameters.windowBase.value, height: p.parameters[o.heightParameter].value }));
    return { id: w.id, start, end, length, height: p.parameters.wallHeight.value, thickness: p.parameters.wallThickness.value, openings, pieces: wallPieces(length, p.parameters.wallHeight.value, openings) };
  });
  return { contour, walls };
}
