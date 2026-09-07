import './style.css';
import { confidences, initialProject, parseProject, poseToWorld, roomOptions, validateProject, type Pose, type Project, type Reference } from './data/validation';
import { worldToPlan, pixelDistance, azimuthBetween, calibrate, compareMeasurement, type Point, type Measurement } from './plan/spatial';
import { MIN_HEADING_PIXELS, routePlanClick, type PosePick } from './plan/planmode';

const STORAGE = 'vovo-bisa-project-v1';
let project: Project = initialProject();
let startupMessage = '';
try {
  const draft = localStorage.getItem(STORAGE);
  if (draft) { project = parseProject(draft); startupMessage = 'Rascunho local recuperado. Exporte um JSON para guardar uma cópia portátil.'; }
} catch { startupMessage = 'Não foi possível recuperar o rascunho local. As referências originais foram carregadas.'; }
let mode: 'reference' | 'check' = 'reference';
let selected: Point[] = [];
let selectedPhoto: Reference | null = null;
let scene: import('./scene/preview').PreviewHandle | null = null;
let apartment: import('./data/pilot').Apartment | null = null;
let derive: typeof import('./data/pilot').deriveApartment | null = null;
let sceneInfo = '';
let walking = false;
let posePick: PosePick = 'idle';
let mouse: { u: number; v: number } | null = null;
let walker: { u: number; v: number; headingDeg: number } | null = null;
let poseDraft: { u: number; v: number } | null = null;
let comparing = false;
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const fmt = (n: number, digits = 3) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const title = (r: Reference) => r.id.replace(/^foto_/, '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="Apartamento da Vovó Bisa, início"><span class="brand-icon">⌂</span><span>Memórias de casa<small>ACERVO DO APARTAMENTO</small></span></a>
    <span class="phase"><span></span> F0 · Base verificável</span>
    <div class="file-actions"><button id="import">↓ Importar JSON</button><button id="export" class="primary">↑ Exportar JSON</button><input id="file" type="file" accept=".json,application/json" hidden></div>
  </header>
  <main>
    <section class="intro"><div><p class="eyebrow">UM LUGAR, MUITAS HISTÓRIAS</p><h1>Apartamento da Vovó Bisa</h1><p>Da planta às fotografias, o primeiro passo para revisitar cada ambiente.</p></div><div class="intro-meta"><strong>01 <span>planta</span> <i>/</i> 11 <span>fotografias</span></strong><small>Acervo original · reconstrução em preparação</small></div></section>
    <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
    <section class="workspace" aria-label="Planta e visualização">
      <article class="panel plan-panel">
        <div class="panel-heading"><div><span class="step">01</span><h2>Planta de referência</h2></div><span id="scale-status" class="badge">Escala não definida</span></div>
        <div class="plan-tools"><span id="plan-mode">Selecione dois pontos de uma cota</span><div><button id="zoom-out" aria-label="Diminuir planta">−</button><button id="zoom-reset" aria-label="Ajustar planta">Ajustar</button><button id="zoom-in" aria-label="Ampliar planta">+</button></div></div>
        <div class="plan-scroll"><svg id="plan" role="img" aria-label="Planta original. Use o formulário abaixo para inserir pontos pelo teclado." viewBox="0 0 ${project.plan.width} ${project.plan.height}"><image id="plan-image" width="${project.plan.width}" height="${project.plan.height}" href="${asset(project.plan.path)}"></image><g id="markers"></g></svg></div>
        <p id="plan-error" class="error" hidden>Não foi possível carregar a planta. Verifique public/assets/references/planta_apartamento.jpeg.</p>
        <div class="calibration">
          <div class="tabs" role="group" aria-label="Tipo de medida"><button id="reference-mode" class="active" aria-pressed="true">1. Definir escala</button><button id="check-mode" aria-pressed="false">2. Conferir outra cota</button></div>
          <p id="selection-help">Marque A e B nas extremidades de uma medida conhecida.</p>
          <form id="calibrate-form">
            <div class="measure-row"><label>Distância real (m)<input id="distance" type="text" inputmode="decimal" placeholder="Ex.: 3,70" required autocomplete="off"></label><button class="primary" id="apply" type="submit">Aplicar escala</button><button type="button" id="clear">Limpar pontos</button></div>
            <details><summary>Inserir coordenadas em pixels</summary><div class="point-inputs"><label>A · u<input id="a-u" type="number" step="any" min="0"></label><label>A · v<input id="a-v" type="number" step="any" min="0"></label><label>B · u<input id="b-u" type="number" step="any" min="0"></label><label>B · v<input id="b-v" type="number" step="any" min="0"></label></div><button id="use-coordinates" type="button">Usar coordenadas</button></details>
          </form>
          <p id="calibration-result" class="result">Sem medida informada. Nenhuma dimensão foi presumida.</p><p id="check-result" class="result" hidden></p>
        </div>
      </article>
      <article class="panel visual-panel">
        <div class="panel-heading"><div><span class="step">02</span><h2>Visualização</h2></div><button id="show-3d" hidden>Voltar à visão 3D</button><span id="visual-badge" class="badge">Sem escala definida</span></div>
        <div class="plan-tools" id="scene-tools" hidden><span id="scene-info"></span><div><button id="scene-walk" class="primary">Andar por dentro</button><button id="scene-frame">Enquadrar</button><button id="scene-top">Vista superior</button><button id="scene-walls" aria-pressed="true">Ocultar paredes</button><button id="scene-palette" aria-pressed="true">Cores: acabamento</button><button id="scene-furniture" aria-pressed="true">Com mobília</button></div></div>
        <div id="preview"><div class="preview-note" id="preview-note"><span class="cube-icon">◇</span><p class="eyebrow">CADA MEMÓRIA TEM SEU ESPAÇO</p><h3>O apartamento começa<br>pela planta.</h3><p>Defina a escala ao lado para levantar<br>as paredes do traçado.<br>Sem escala não há metro, e sem metro<br>não há parede.</p><span class="subtle-pill">Grade ilustrativa · sem geometria do imóvel</span></div><p id="webgl-status" class="webgl-status" role="status"></p></div>
        <div id="photo-view" hidden><div class="photo-stage" id="photo-stage"><img id="large-photo" alt=""><p id="photo-error" class="error" hidden></p></div><div class="photo-description"><p class="eyebrow">FOTOGRAFIA ORIGINAL</p><h3 id="photo-title"></h3><p id="photo-meta"></p><p id="photo-state" class="muted"></p><label for="observations">Observações da referência</label><textarea id="observations" rows="2" maxlength="5000"></textarea><button id="save-notes">Salvar observações no rascunho</button><details id="pose-editor"><summary>Ambiente, ponto e direção</summary><label for="pose-room">Ambiente</label><select id="pose-room"></select><div class="measure-row"><button id="pose-mark" type="button">Marcar ponto e direção na planta</button><button id="pose-leave" hidden>Voltar a medir cotas</button><button id="pose-clear" type="button">Limpar pose</button></div><p id="pose-help" class="muted"></p><div class="point-inputs"><label>Altura da câmera (m)<input id="pose-height" type="number" step="0.05" min="0.3" max="2.5"></label><label>Azimute (°)<input id="pose-heading" type="number" step="1" min="0" max="359"></label><label>Inclinação (°)<input id="pose-pitch" type="number" step="1" min="-60" max="60"></label><label>Campo vertical (°)<input id="pose-fov" type="number" step="1" min="20" max="100"></label></div><label for="pose-confidence">Confiança da associação</label><select id="pose-confidence"></select><label for="pose-evidence">Evidência (por que esta foto é deste ponto)</label><textarea id="pose-evidence" rows="2" maxlength="5000"></textarea><div class="measure-row"><button id="pose-save" class="primary" type="button">Salvar como proposta</button><button id="pose-confirm" type="button">Confirmar</button><button id="pose-compare" type="button">Comparar com o modelo</button></div></details></div></div>
        <div class="visual-footer"><span class="dot"></span><span>Uma reconstrução aproximada, guiada por evidências.</span></div>
      </article>
    </section>
    <section class="catalog" aria-labelledby="catalog-title"><div class="catalog-heading"><div><p class="eyebrow">AS REFERÊNCIAS REAIS</p><h2 id="catalog-title">Um olhar por cada canto <span>11</span></h2></div><p>Selecione uma foto para ver os detalhes.<br>Os nomes dos arquivos não confirmam os ambientes.</p></div><div id="photos" class="photo-grid"></div></section>
    <footer><span>Vovó Bisa <i>·</i> Acervo & planta</span><p>O rascunho fica neste navegador. Exportar JSON não grava automaticamente no repositório.</p></footer>
  </main>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function notify(message: string, error = false) { const n = el('notice'); n.textContent = message; n.hidden = false; n.classList.toggle('error', error); }
function persist(message: string) {
  try { localStorage.setItem(STORAGE, JSON.stringify(project)); notify(message); }
  catch { notify(`${message} O navegador não salvou o rascunho; exporte o JSON para preservar as alterações.`, true); }
}
function imageFailure(img: HTMLImageElement, message: HTMLElement) {
  img.addEventListener('error', () => { img.hidden = true; message.hidden = false; });
  img.addEventListener('load', () => { img.hidden = false; message.hidden = true; });
}
const svg = document.getElementById('plan') as unknown as SVGSVGElement;
document.getElementById('plan-image')!.addEventListener('error', () => { el('plan-error').hidden = false; });
let zoom = 1;
function setZoom(value: number) { zoom = Math.min(4, Math.max(1, value)); svg.style.width = `${zoom * 100}%`; svg.style.height = `${zoom * 100}%`; }
el('zoom-in').onclick = () => setZoom(zoom + .5);
el('zoom-out').onclick = () => setZoom(zoom - .5);
el('zoom-reset').onclick = () => setZoom(1);

// Converte um evento do mouse em coordenada de pixel da planta.
function planPoint(event: MouseEvent) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 0 || p.y < 0 || p.x > project.plan.width || p.y > project.plan.height) return null;
  return { u: Math.round(p.x * 100) / 100, v: Math.round(p.y * 100) / 100 };
}

// Direcao que o rascunho mostra: o mouse enquanto se aponta, o campo depois de apontado.
function draftHeading(from: { u: number; v: number }): number | null {
  if (posePick === 'heading') return mouse && pixelDistance(from, mouse) >= MIN_HEADING_PIXELS ? azimuthBetween(from, mouse) : null;
  if (poseDraft) { const n = el<HTMLInputElement>('pose-heading').valueAsNumber; return Number.isFinite(n) ? n : null; }
  return selectedPhoto?.pose?.headingDeg ?? null;
}

function drawMarkers() {
  const g = document.getElementById('markers')!;
  g.replaceChildren();
  const make = (tag: string, attrs: Record<string, string>) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    g.append(element); return element;
  };
  const medindo = posePick === 'idle';
  if (medindo && selected.length === 2) make('line', { x1: `${selected[0].u}`, y1: `${selected[0].v}`, x2: `${selected[1].u}`, y2: `${selected[1].v}`, stroke: '#b34e30', 'stroke-width': '3', 'stroke-dasharray': '7 4' });
  if (medindo) selected.forEach((p, index) => {
    make('circle', { cx: `${p.u}`, cy: `${p.v}`, r: '7', fill: '#b34e30', stroke: 'white', 'stroke-width': '2' });
    const text = make('text', { x: `${Math.min(p.u + 12, project.plan.width - 18)}`, y: `${Math.max(20, p.v - 12)}`, fill: '#92381f', 'font-size': '20', 'font-weight': '700', stroke: 'white', 'stroke-width': '3', 'paint-order': 'stroke' });
    text.textContent = index === 0 ? 'A' : 'B';
  });
  const pose = poseDraft ?? (selectedPhoto?.pose ? { u: selectedPhoto.pose.u, v: selectedPhoto.pose.v } : null);
  if (pose) {
    make('circle', { cx: `${pose.u}`, cy: `${pose.v}`, r: '8', fill: '#244d42', stroke: 'white', 'stroke-width': '2' });
    const grau = draftHeading(pose);
    if (grau !== null) {
      const rad = grau * Math.PI / 180;
      const previa = posePick === 'heading';
      const alcance = previa ? 78 : 52;
      const px = pose.u + Math.sin(rad) * alcance, py = pose.v - Math.cos(rad) * alcance;
      const linha: Record<string, string> = { x1: `${pose.u}`, y1: `${pose.v}`, x2: `${px}`, y2: `${py}`, stroke: '#244d42', 'stroke-width': '4' };
      if (previa) linha['stroke-dasharray'] = '9 6';
      make('line', linha);
      // Ponta da seta, para a direcao ser lida de relance.
      const asa = (lado: number) => `${px - Math.sin(rad + lado) * 15},${py + Math.cos(rad + lado) * 15}`;
      make('polyline', { points: `${asa(-0.42)} ${px},${py} ${asa(0.42)}`, fill: 'none', stroke: '#244d42', 'stroke-width': '4' });
      const texto = make('text', { x: `${Math.min(px + 10, project.plan.width - 40)}`, y: `${Math.max(18, py - 10)}`, fill: '#1d4b3d', 'font-size': '19', 'font-weight': '700', stroke: 'white', 'stroke-width': '3.5', 'paint-order': 'stroke' });
      texto.textContent = `${Math.round(grau)}°`;
    }
  }
  if (walker) {
    const rad = walker.headingDeg * Math.PI / 180;
    const px = walker.u + Math.sin(rad) * 34, py = walker.v - Math.cos(rad) * 34;
    make('line', { x1: `${walker.u}`, y1: `${walker.v}`, x2: `${px}`, y2: `${py}`, stroke: '#b34e30', 'stroke-width': '3' });
    const asa = (lado: number) => `${px - Math.sin(rad + lado) * 12},${py + Math.cos(rad + lado) * 12}`;
    make('polyline', { points: `${asa(-0.45)} ${px},${py} ${asa(0.45)}`, fill: 'none', stroke: '#b34e30', 'stroke-width': '3' });
    make('circle', { cx: `${walker.u}`, cy: `${walker.v}`, r: '7', fill: '#f4f6ef', stroke: '#b34e30', 'stroke-width': '3' });
  }
  ['a-u', 'a-v', 'b-u', 'b-v'].forEach((id, index) => { const p = selected[Math.floor(index / 2)]; el<HTMLInputElement>(id).value = p ? String(p[index % 2 === 0 ? 'u' : 'v']) : ''; });
  el('selection-help').textContent = !medindo
    ? 'Marcacao de foto em andamento. A medicao de cotas volta quando ela terminar ou for cancelada.'
    : selected.length === 2 ? `A (${fmt(selected[0].u, 1)}; ${fmt(selected[0].v, 1)}) → B (${fmt(selected[1].u, 1)}; ${fmt(selected[1].v, 1)}). Informe a distância real.` : selected.length === 1 ? 'Ponto A marcado. Agora selecione o ponto B.' : 'Marque A e B nas extremidades de uma medida conhecida.';
}
svg.addEventListener('click', event => {
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 0 || p.y < 0 || p.x > project.plan.width || p.y > project.plan.height) return;
  const clique = { u: Math.round(p.x * 100) / 100, v: Math.round(p.y * 100) / 100 };
  const acao = routePlanClick(posePick, poseDraft, clique);
  if (acao.target === 'ignored') { notify(acao.reason, true); return; }
  if (acao.target === 'pose-point') { poseDraft = acao.point; setPosePick('heading'); return; }
  if (acao.target === 'pose-heading') {
    el<HTMLInputElement>('pose-heading').value = String(Math.round(acao.headingDeg));
    setPosePick('done');
    notify(`Direção registrada: ${Math.round(acao.headingDeg)}°. Escreva a evidência e salve como proposta.`);
    return;
  }
  if (selected.length === 2) selected = [];
  selected.push(acao.point); drawMarkers();
});
svg.addEventListener('mousemove', event => {
  if (posePick !== 'heading') return;
  const p = planPoint(event);
  if (p && mouse && p.u === mouse.u && p.v === mouse.v) return;
  mouse = p; drawMarkers();
});
svg.addEventListener('mouseleave', () => { if (mouse) { mouse = null; drawMarkers(); } });
// Sair da marcacao pelo teclado, sem precisar procurar o botao.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && posePick !== 'idle') { if (posePick !== 'done') poseDraft = null; setPosePick('idle'); }
});
el('use-coordinates').onclick = () => {
  const values = ['a-u', 'a-v', 'b-u', 'b-v'].map(id => el<HTMLInputElement>(id).valueAsNumber);
  if (!values.every(Number.isFinite) || values.some((v, i) => v < 0 || v > (i % 2 === 0 ? project.plan.width : project.plan.height))) { notify('Informe quatro coordenadas dentro dos limites da planta.', true); return; }
  selected = [{ u: values[0], v: values[1] }, { u: values[2], v: values[3] }]; drawMarkers();
};
function changeMode(next: typeof mode) {
  mode = next;
  for (const name of ['reference', 'check']) { const button = el(`${name}-mode`); button.classList.toggle('active', name === mode); button.setAttribute('aria-pressed', String(name === mode)); }
  const measurement = mode === 'reference' ? project.calibration?.reference : project.calibration?.check;
  selected = measurement ? structuredClone(measurement.points) : [];
  el<HTMLInputElement>('distance').value = measurement ? String(measurement.distanceMeters).replace('.', ',') : '';
  el('apply').textContent = mode === 'reference' ? 'Aplicar escala' : 'Comparar cota';
  drawMarkers();
}
el('reference-mode').onclick = () => { setPosePick('idle'); changeMode('reference'); };
el('check-mode').onclick = () => { setPosePick('idle'); changeMode('check'); };
el('clear').onclick = () => { selected = []; drawMarkers(); };
function renderCalibration() {
  const c = project.calibration;
  el('scale-status').textContent = c ? 'Escala proposta' : 'Escala não definida';
  el('calibration-result').textContent = c ? `Escala proposta: ${fmt(c.transform.metersPerPixel, 6)} m/px. Origem: A (${fmt(c.transform.origin.u)}; ${fmt(c.transform.origin.v)}). Validação humana pendente.` : 'Sem medida informada. Nenhuma dimensão foi presumida.';
  el('check-result').hidden = !c;
  if (c?.check) {
    const result = compareMeasurement(c.check, c.transform);
    el('check-result').textContent = `Conferência: ${fmt(result.measuredMeters)} m na escala × ${fmt(c.check.distanceMeters)} m informados. Desvio: ${fmt(result.deviationMeters)} m (${fmt(result.deviationPercent, 2)}%). A imagem não foi deformada. Confira preferencialmente uma cota em outro eixo.`;
  } else if (c) el('check-result').textContent = 'Conferência pendente. Selecione “2. Conferir outra cota”, de preferência em outro eixo.';
  renderScene();
}
el('calibrate-form').onsubmit = event => {
  event.preventDefault();
  try {
    if (selected.length !== 2) throw new Error('Selecione os dois pontos na planta antes de continuar.');
    const distanceMeters = Number(el<HTMLInputElement>('distance').value.trim().replace(',', '.'));
    const measurement: Measurement = { points: structuredClone(selected) as [Point, Point], distanceMeters };
    const transform = calibrate(measurement);
    if (mode === 'reference') project.calibration = { reference: measurement, transform, check: project.calibration?.check ?? null, status: 'proposto' };
    else { if (!project.calibration) throw new Error('Defina a escala antes de conferir outra cota.'); project.calibration.check = measurement; }
    renderCalibration(); persist(mode === 'reference' ? 'Escala proposta salva no rascunho. Confira uma segunda cota.' : 'Conferência salva no rascunho. O desvio é informativo; não confirma a precisão da planta.');
  } catch (error) { notify((error as Error).message, true); }
};

const ESTADOS: Record<string, string> = { pendente: 'pendente', proposto: 'proposta', confirmado: 'confirmada' };
const rotuloConfianca: Record<string, string> = { baixa: 'baixa', media: 'media', alta: 'alta' };

// Unico lugar que troca o modo da planta: texto do cabecalho, moldura, marcadores e ajuda.
function setPosePick(next: PosePick) {
  posePick = next;
  const foto = selectedPhoto ? selectedPhoto.id.replace(/^foto_/, '').replace(/_/g, ' ') : 'foto';
  el('plan-mode').textContent = next === 'idle'
    ? 'Selecione dois pontos de uma cota'
    : next === 'point'
      ? `${foto} · passo 1 de 2 — clique no ponto onde a câmera estava`
      : next === 'heading'
        ? `${foto} · passo 2 de 2 — mova o mouse e clique para onde ela apontava`
        : `${foto} · ponto e direção marcados. A planta só volta a medir cotas quando você mandar.`;
  document.querySelector('.plan-panel')!.classList.toggle('marking', next !== 'idle');
  el('pose-leave').hidden = next !== 'done';
  if (next !== 'heading') mouse = null;
  renderPoseHelp(); drawMarkers();
}

function renderPoseHelp() {
  el('pose-help').textContent = posePick === 'point'
    ? 'Passo 1 de 2: clique na planta o ponto onde a câmera estava.'
    : posePick === 'heading'
      ? 'Passo 2 de 2: mova o mouse sobre a planta — a seta tracejada segue o cursor e mostra o ângulo. Clique para fixar.'
      : poseDraft
        ? `Ponto em (${fmt(poseDraft.u, 1)}; ${fmt(poseDraft.v, 1)}), direção ${el<HTMLInputElement>('pose-heading').value}°. Revise os campos e salve.`
        : 'Nenhum ponto novo marcado. O que estiver salvo aparece na planta em verde.';
  el('pose-mark').textContent = posePick === 'idle' ? 'Marcar ponto e direção na planta'
    : posePick === 'done' ? 'Refazer ponto e direção' : 'Cancelar marcação';
}

function renderPoseEditor() {
  const photo = selectedPhoto;
  if (!photo) return;
  el('photo-state').textContent = photo.roomId
    ? `Ambiente: ${roomOptions.find(r => r.id === photo.roomId)?.name ?? photo.roomId} - associacao ${ESTADOS[photo.status]}${photo.pose ? `, confianca ${photo.pose.confidence}` : ', sem ponto marcado'}`
    : 'Ambiente: pendente - ponto e direcao: pendentes';
  el<HTMLSelectElement>('pose-room').value = photo.roomId ?? '';
  const p = photo.pose;
  el<HTMLInputElement>('pose-height').value = String(p?.cameraHeight ?? 1.55);
  el<HTMLInputElement>('pose-heading').value = String(p?.headingDeg ?? 0);
  el<HTMLInputElement>('pose-pitch').value = String(p?.pitchDeg ?? 0);
  el<HTMLInputElement>('pose-fov').value = String(p?.verticalFovDeg ?? 55);
  el<HTMLSelectElement>('pose-confidence').value = p?.confidence ?? 'baixa';
  el<HTMLTextAreaElement>('pose-evidence').value = p?.evidence ?? '';
  el<HTMLButtonElement>('pose-compare').disabled = !p || !project.calibration;
  el<HTMLButtonElement>('pose-confirm').disabled = !p;
  renderPoseHelp();
  drawMarkers();
}

// Monta a foto alterada, valida o projeto inteiro e so entao troca o estado: mesma regra da importacao.
function updatePhoto(id: string, changes: Partial<Reference>, message: string) {
  const candidate = structuredClone(project) as Project;
  const target = candidate.photos.find(item => item.id === id);
  if (!target) return;
  Object.assign(target, changes);
  try {
    project = validateProject(candidate);
    selectedPhoto = project.photos.find(item => item.id === id) ?? null;
    renderPhotos(); renderPoseEditor(); persist(message);
  } catch (error) { notify(`Alteracao recusada. O estado anterior foi preservado. ${(error as Error).message}`, true); }
}

function poseFromForm(): Pose {
  const ponto = poseDraft ?? (selectedPhoto?.pose ? { u: selectedPhoto.pose.u, v: selectedPhoto.pose.v } : null);
  if (!ponto) throw new Error('Marque o ponto da camera na planta antes de salvar.');
  const numero = (id: string) => el<HTMLInputElement>(id).valueAsNumber;
  return {
    u: ponto.u, v: ponto.v,
    cameraHeight: numero('pose-height'), headingDeg: numero('pose-heading'),
    pitchDeg: numero('pose-pitch'), verticalFovDeg: numero('pose-fov'),
    confidence: el<HTMLSelectElement>('pose-confidence').value as Pose['confidence'],
    evidence: el<HTMLTextAreaElement>('pose-evidence').value,
  };
}

function savePose(status: 'proposto' | 'confirmado') {
  if (!selectedPhoto) return;
  const roomId = el<HTMLSelectElement>('pose-room').value || null;
  try {
    const pose = poseFromForm();
    poseDraft = null;
    updatePhoto(selectedPhoto.id, { roomId, pose, status }, status === 'confirmado'
      ? 'Pose confirmada e salva no rascunho. Exporte o JSON para guardar no projeto.'
      : 'Pose salva como proposta. Compare com o modelo antes de confirmar.');
  } catch (error) { notify((error as Error).message, true); }
}

function setComparing(on: boolean) {
  const photo = selectedPhoto;
  comparing = on && !!photo?.pose && !!project.calibration;
  el('photo-stage').hidden = comparing;
  el('preview').hidden = !comparing;
  el('preview').style.aspectRatio = comparing && photo ? `${photo.width} / ${photo.height}` : '';
  el('preview').style.minHeight = comparing ? '0' : '';
  el('pose-compare').textContent = comparing ? 'Voltar a foto' : 'Comparar com o modelo';
  if (comparing && photo?.pose && project.calibration) scene?.viewFromPose(poseToWorld(photo.pose, project.calibration.transform));
  else scene?.viewFromPose(null);
}

function showPhoto(photo: Reference) {
  selectedPhoto = photo;
  poseDraft = null; setComparing(false); setPosePick('idle');
  el('preview').hidden = true; el('photo-view').hidden = false; el('show-3d').hidden = false; el('visual-badge').hidden = true; el('scene-tools').hidden = true;
  const img = el<HTMLImageElement>('large-photo'); img.hidden = false; img.alt = `Referência original: ${title(photo)}`;
  el('photo-error').hidden = true; el('photo-error').textContent = `Imagem indisponível: ${photo.path}`; img.src = asset(photo.path);
  el('photo-title').textContent = title(photo);
  el('photo-meta').textContent = `${photo.id}.png · ${photo.width} × ${photo.height} px`;
  el<HTMLTextAreaElement>('observations').value = photo.observations;
  document.querySelectorAll<HTMLButtonElement>('.photo-card').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.id === photo.id)); });
  renderPoseEditor();
}
imageFailure(el<HTMLImageElement>('large-photo'), el('photo-error'));
el('save-notes').onclick = () => {
  if (!selectedPhoto) return;
  selectedPhoto.observations = el<HTMLTextAreaElement>('observations').value;
  persist('Observações salvas no rascunho local. Exporte o JSON para guardar no projeto.');
};
el('show-3d').onclick = () => {
  setComparing(false);
  el('preview').hidden = false; el('photo-view').hidden = true; el('show-3d').hidden = true; el('visual-badge').hidden = false;
  selectedPhoto = null; poseDraft = null; setPosePick('idle');
  el('scene-tools').hidden = !project.calibration;
  document.querySelectorAll('.photo-card').forEach(b => b.setAttribute('aria-pressed', 'false'));
  drawMarkers();
};
el<HTMLSelectElement>('pose-room').append(...[{ id: '', name: 'Sem ambiente definido' }, ...roomOptions].map(r => new Option(r.name, r.id)));
el<HTMLSelectElement>('pose-confidence').append(...confidences.map(c => new Option(c, c)));
el('pose-mark').onclick = () => { const ligar = posePick === 'idle'; if (ligar) poseDraft = null; setPosePick(ligar ? 'point' : 'idle'); };
el('pose-leave').onclick = () => { setPosePick('idle'); notify('A planta voltou a medir cotas. A pose marcada continua no editor até você salvar.'); };
el<HTMLInputElement>('pose-heading').oninput = () => drawMarkers();
el('pose-save').onclick = () => savePose('proposto');
el('pose-confirm').onclick = () => savePose('confirmado');
el('pose-compare').onclick = () => setComparing(!comparing);
el<HTMLSelectElement>('pose-room').onchange = () => { if (selectedPhoto && !selectedPhoto.pose) updatePhoto(selectedPhoto.id, { roomId: el<HTMLSelectElement>('pose-room').value || null }, 'Ambiente associado no rascunho.'); };
el('pose-clear').onclick = () => { if (selectedPhoto) { poseDraft = null; setPosePick('idle'); updatePhoto(selectedPhoto.id, { pose: null, status: 'pendente' }, 'Pose removida. O ambiente associado foi mantido.'); } };
function renderPhotos() {
  const host = el('photos'); host.replaceChildren();
  const sorted = [...project.photos].sort((a, b) => Number(!a.id.includes('sala')) - Number(!b.id.includes('sala')) || a.id.localeCompare(b.id));
  sorted.forEach((photo, index) => {
    const button = document.createElement('button'); button.className = 'photo-card'; button.dataset.id = photo.id; button.setAttribute('aria-pressed', 'false');
    const frame = document.createElement('div'); frame.className = 'thumb';
    const img = document.createElement('img'); img.loading = 'lazy'; img.alt = title(photo); img.src = asset(photo.path); img.width = photo.width; img.height = photo.height;
    const error = document.createElement('span'); error.className = 'error'; error.hidden = true; error.textContent = `Imagem indisponível: ${photo.id}`;
    imageFailure(img, error); frame.append(img, error);
    const number = document.createElement('span'); number.className = 'photo-number'; number.textContent = String(index + 1).padStart(2, '0'); frame.append(number);
    const name = document.createElement('strong'); name.textContent = title(photo);
    const state = document.createElement('span'); state.className = 'photo-state';
    state.textContent = photo.status === 'confirmado' ? '● Confirmada' : photo.status === 'proposto' ? '◐ Proposta' : photo.roomId ? '○ Ambiente definido' : '○ Associação pendente';
    state.dataset.status = photo.status;
    button.append(frame, name, state); button.onclick = () => { showPhoto(photo); el('photo-title').scrollIntoView({ block: 'nearest', behavior: 'instant' }); }; host.append(button);
  });
}
el('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'vovo-bisa-projeto.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('JSON exportado. Para versionar, salve-o em src/data/project.json. O download não altera os arquivos do repositório.');
};
el('import').onclick = () => el<HTMLInputElement>('file').click();
el<HTMLInputElement>('file').onchange = async event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error('JSON muito grande (limite: 1 MB).');
    const next = parseProject(await file.text());
    project = next; selectedPhoto = null; renderPhotos(); renderCalibration(); changeMode('reference'); el('show-3d').click();
    persist('JSON validado e importado. O rascunho local foi atualizado.');
  } catch (error) { notify(`Importação rejeitada. O estado anterior foi preservado. ${(error as Error).message}`, true); }
  finally { input.value = ''; }
};
renderPhotos(); renderCalibration(); changeMode('reference');
if (startupMessage) notify(startupMessage);

// A cena só existe depois da escala: sem metros por pixel não há como levantar parede alguma.
function renderScene() {
  if (!scene) return;
  const transform = project.calibration?.transform ?? null;
  const rooms = transform && apartment && derive ? derive(apartment, transform) : null;
  scene.show(rooms);
  el('scene-tools').hidden = !rooms || !!selectedPhoto;
  el('preview-note').hidden = !!rooms;
  el('visual-badge').textContent = rooms ? `${rooms.length} cômodos · traçado proposto` : 'Sem escala definida';
  if (rooms) {
    sceneInfo = `${rooms.length} cômodos a ${fmt(project.calibration!.transform.metersPerPixel, 6)} m/px. Pé-direito 2,70 m confirmado; acabamentos propostos a partir das fotografias, nenhum medido no apartamento.`;
    el('scene-info').textContent = sceneInfo;
  }
}
Promise.all([import('./scene/preview'), import('./data/pilot')]).then(([preview, pilot]) => {
  apartment = pilot.initialApartment();
  derive = pilot.deriveApartment;
  scene = preview.mountPreview(el('preview'), message => { el('webgl-status').textContent = message; });
  scene.setWalkListener(estado => {
    const ativo = estado !== null;
    // A planta acompanha o passeio: mesma transformação que levanta as paredes, ao contrário.
    walker = estado && project.calibration
      ? { ...worldToPlan(estado, project.calibration.transform), headingDeg: estado.headingDeg }
      : null;
    drawMarkers();
    if (ativo === walking) return;
    walking = ativo;
    el('scene-walk').textContent = ativo ? 'Sair do passeio (Esc)' : 'Andar por dentro';
    el('scene-walk').classList.toggle('primary', !ativo);
    for (const id of ['scene-frame', 'scene-top', 'scene-walls', 'scene-palette', 'scene-furniture']) el<HTMLButtonElement>(id).disabled = ativo;
    el('scene-info').textContent = ativo
      ? 'Passeio: W A S D ou setas para andar, mouse para olhar, Shift para acelerar, Esc para sair. Olhos a 1,60 m do piso. A seta laranja na planta mostra onde você está e para onde olha.'
      : sceneInfo;
  });
  el('scene-walk').onclick = () => (walking ? scene?.exitWalk() : scene?.enterWalk());
  el('scene-frame').onclick = () => scene?.frame();
  el('scene-top').onclick = () => scene?.lookFromTop();
  el('scene-furniture').onclick = () => {
    const button = el('scene-furniture');
    const com = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(com));
    button.textContent = com ? 'Com mobília' : 'Sem mobília';
    scene?.setFurniture(com);
    notify(com
      ? 'Mobília visível: louças e bancadas traçadas na planta, mais o que as fotografias mostram. Tudo proposto, nada medido.'
      : 'Apartamento vazio: só estrutura, vãos e acabamentos.');
  };
  el('scene-palette').onclick = () => {
    const button = el('scene-palette');
    const materiais = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(materiais));
    button.textContent = materiais ? 'Cores: acabamento' : 'Cores: conferência';
    scene?.setPalette(materiais ? 'materiais' : 'conferencia');
    sceneInfo = materiais
      ? 'Acabamentos propostos a partir das fotografias: piso, parede e esquadrias. Nenhuma cor foi medida no apartamento.'
      : 'Piso bege é cômodo conferido por cota impressa; piso azulado é cômodo sem cota para conferir.';
    if (!walking) el('scene-info').textContent = sceneInfo;
  };
  el('scene-walls').onclick = () => {
    const button = el('scene-walls');
    const visible = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = visible ? 'Ocultar paredes' : 'Mostrar paredes';
    scene?.setWallsVisible(visible);
  };
  renderScene();
}).catch(error => {
  el('webgl-status').textContent = `Visualização 3D indisponível. A planta e o catálogo continuam disponíveis. ${(error as Error).message}`;
});
