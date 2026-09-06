import './style.css';
import { initialProject, parseProject, type Project, type Reference } from './data/validation';
import { calibrate, compareMeasurement, type Point, type Measurement } from './plan/spatial';

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
        <div class="plan-tools"><span>Selecione dois pontos de uma cota</span><div><button id="zoom-out" aria-label="Diminuir planta">−</button><button id="zoom-reset" aria-label="Ajustar planta">Ajustar</button><button id="zoom-in" aria-label="Ampliar planta">+</button></div></div>
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
        <div class="panel-heading"><div><span class="step">02</span><h2>Visualização</h2></div><button id="show-3d" hidden>Voltar à visão 3D</button><span id="visual-badge" class="badge">Próxima etapa · F1</span></div>
        <div id="preview"><div class="preview-note"><span class="cube-icon">◇</span><p class="eyebrow">CADA MEMÓRIA TEM SEU ESPAÇO</p><h3>O apartamento começa<br>pela planta.</h3><p>Defina a escala e explore as fotos originais.<br>A estrutura 3D será construída após<br>a revisão do traçado e das medidas.</p><span class="subtle-pill">Grade ilustrativa · sem geometria do imóvel</span></div><p id="webgl-status" class="webgl-status" role="status"></p></div>
        <div id="photo-view" hidden><div class="photo-stage"><img id="large-photo" alt=""><p id="photo-error" class="error" hidden></p></div><div class="photo-description"><p class="eyebrow">FOTOGRAFIA ORIGINAL</p><h3 id="photo-title"></h3><p id="photo-meta"></p><label for="observations">Observações da referência</label><textarea id="observations" rows="2" maxlength="5000"></textarea><button id="save-notes">Salvar observações no rascunho</button><p class="muted">Ambiente: pendente · Ponto e direção: pendentes</p></div></div>
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

function drawMarkers() {
  const g = document.getElementById('markers')!;
  g.replaceChildren();
  const make = (tag: string, attrs: Record<string, string>) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    g.append(element); return element;
  };
  if (selected.length === 2) make('line', { x1: `${selected[0].u}`, y1: `${selected[0].v}`, x2: `${selected[1].u}`, y2: `${selected[1].v}`, stroke: '#b34e30', 'stroke-width': '3', 'stroke-dasharray': '7 4' });
  selected.forEach((p, index) => {
    make('circle', { cx: `${p.u}`, cy: `${p.v}`, r: '7', fill: '#b34e30', stroke: 'white', 'stroke-width': '2' });
    const text = make('text', { x: `${Math.min(p.u + 12, project.plan.width - 18)}`, y: `${Math.max(20, p.v - 12)}`, fill: '#92381f', 'font-size': '20', 'font-weight': '700', stroke: 'white', 'stroke-width': '3', 'paint-order': 'stroke' });
    text.textContent = index === 0 ? 'A' : 'B';
  });
  ['a-u', 'a-v', 'b-u', 'b-v'].forEach((id, index) => { const p = selected[Math.floor(index / 2)]; el<HTMLInputElement>(id).value = p ? String(p[index % 2 === 0 ? 'u' : 'v']) : ''; });
  el('selection-help').textContent = selected.length === 2 ? `A (${fmt(selected[0].u, 1)}; ${fmt(selected[0].v, 1)}) → B (${fmt(selected[1].u, 1)}; ${fmt(selected[1].v, 1)}). Informe a distância real.` : selected.length === 1 ? 'Ponto A marcado. Agora selecione o ponto B.' : 'Marque A e B nas extremidades de uma medida conhecida.';
}
svg.addEventListener('click', event => {
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 0 || p.y < 0 || p.x > project.plan.width || p.y > project.plan.height) return;
  if (selected.length === 2) selected = [];
  selected.push({ u: Math.round(p.x * 100) / 100, v: Math.round(p.y * 100) / 100 }); drawMarkers();
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
el('reference-mode').onclick = () => changeMode('reference');
el('check-mode').onclick = () => changeMode('check');
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

function showPhoto(photo: Reference) {
  selectedPhoto = photo;
  el('preview').hidden = true; el('photo-view').hidden = false; el('show-3d').hidden = false; el('visual-badge').hidden = true;
  const img = el<HTMLImageElement>('large-photo'); img.hidden = false; img.alt = `Referência original: ${title(photo)}`;
  el('photo-error').hidden = true; el('photo-error').textContent = `Imagem indisponível: ${photo.path}`; img.src = asset(photo.path);
  el('photo-title').textContent = title(photo);
  el('photo-meta').textContent = `${photo.id}.png · ${photo.width} × ${photo.height} px`;
  el<HTMLTextAreaElement>('observations').value = photo.observations;
  document.querySelectorAll<HTMLButtonElement>('.photo-card').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.id === photo.id)); });
}
imageFailure(el<HTMLImageElement>('large-photo'), el('photo-error'));
el('save-notes').onclick = () => {
  if (!selectedPhoto) return;
  selectedPhoto.observations = el<HTMLTextAreaElement>('observations').value;
  persist('Observações salvas no rascunho local. Exporte o JSON para guardar no projeto.');
};
el('show-3d').onclick = () => { el('preview').hidden = false; el('photo-view').hidden = true; el('show-3d').hidden = true; el('visual-badge').hidden = false; selectedPhoto = null; document.querySelectorAll('.photo-card').forEach(b => b.setAttribute('aria-pressed', 'false')); };
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
    const state = document.createElement('span'); state.className = 'photo-state'; state.textContent = '○ Associação pendente';
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
import('./scene/preview').then(({ mountPreview }) => mountPreview(el('preview'), message => { el('webgl-status').textContent = message; })).catch(() => { el('webgl-status').textContent = 'Visualização 3D indisponível. A planta e o catálogo continuam disponíveis.'; });
