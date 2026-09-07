import './style.css';
import { horizontalFov, initialProject, poseToWorld, roomOptions, type Reference } from './data/validation';
import { fovWedge } from './plan/spatial';
import type { PreviewHandle } from './scene/preview';

// Tela de visita: só leitura. Nenhum controle grava parâmetro, e nada é lido do rascunho local —
// a calibração, as poses e o traçado vêm dos arquivos versionados do projeto.
const project = initialProject();
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const title = (r: Reference) => r.id.replace(/^foto_/, '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const nomeAmbiente = (id: string | null) => roomOptions.find(r => r.id === id)?.name ?? 'ambiente não identificado';
const marcadas = project.photos.filter(p => p.pose && p.roomId);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="Apartamento da Vovó Bisa, início"><span class="brand-icon">⌂</span><span>Memórias de casa<small>ACERVO DO APARTAMENTO</small></span></a>
    <span class="phase"><span></span> Visita guiada</span>
  </header>
  <main>
    <section class="intro">
      <div>
        <p class="eyebrow">UM LUGAR, MUITAS HISTÓRIAS</p>
        <h1>Apartamento da Vovó Bisa</h1>
        <p>Escolha uma fotografia para ver de onde ela foi tirada, e caminhe pelo apartamento reconstruído a partir da planta original.</p>
      </div>
      <div class="intro-meta"><strong>${marcadas.length} <span>fotografias situadas</span></strong><small>Reconstrução aproximada, guiada por evidências</small></div>
    </section>
    <section class="workspace" aria-label="Planta e visita">
      <article class="panel plan-panel">
        <div class="panel-heading"><div><span class="step">01</span><h2>Onde a foto foi tirada</h2></div><span id="visit-room" class="badge">Escolha uma fotografia</span></div>
        <div class="plan-tools"><span id="visit-hint">Cada marca é uma fotografia. O leque mostra o que a câmera alcançava.</span></div>
        <div class="plan-scroll"><svg id="plan" role="img" aria-label="Planta do apartamento com os pontos das fotografias" viewBox="0 0 ${project.plan.width} ${project.plan.height}"><image width="${project.plan.width}" height="${project.plan.height}" href="${asset(project.plan.path)}"></image><g id="markers"></g></svg></div>
        <div class="visit-caption"><p id="visit-caption" class="result">A planta é o desenho original do apartamento. Os pontos foram marcados a mão, comparando cada fotografia com o modelo.</p></div>
      </article>
      <article class="panel visual-panel">
        <div class="panel-heading"><div><span class="step">02</span><h2>O apartamento</h2></div><span id="visit-badge" class="badge">Modelo em 3D</span></div>
        <div class="plan-tools" id="visit-tools"><span id="visit-info">Reconstruído a partir da planta e das fotografias.</span><div><button id="visit-walk" class="primary">Andar por dentro</button><button id="visit-frame">Ver tudo</button><button id="visit-photo" hidden>Ver a fotografia</button><button id="visit-furniture" aria-pressed="true">Com mobília</button><label class="toggle" title="Áreas medidas no traçado. A planta imprime valores menores para os dormitórios, porque não conta os armários embutidos."><input type="checkbox" id="visit-labels"> Nomes no chão</label></div></div>
        <div id="preview"></div>
        <div class="photo-stage" id="visit-stage" hidden><img id="visit-large" alt=""></div>
        <p class="visual-footer"><span class="dot"></span> Uma reconstrução aproximada, guiada por evidências.</p>
      </article>
    </section>
    <section class="catalog">
      <div class="catalog-heading"><h2>Fotografias <span>${project.photos.length}</span></h2><p>Clique em uma fotografia para ver o ponto de onde ela foi tirada.</p></div>
      <div class="photo-grid" id="visit-grid"></div>
    </section>
  </main>
  <footer><p>Acervo particular · reconstrução a partir da planta original e de 11 fotografias.</p><p>Nenhuma medida foi tomada no apartamento, com exceção do pé-direito.</p></footer>
`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const svg = document.getElementById('plan') as unknown as SVGSVGElement;
let selecionada: Reference | null = null;
let scene: PreviewHandle | null = null;
let andando = false;
let mostrandoFoto = false;

function make(tag: string, attrs: Record<string, string>) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  document.getElementById('markers')!.append(element);
  return element;
}

// O ponto da foto escolhida precisa saltar aos olhos: leque do campo de visão, seta e
// um anel que pulsa. As demais ficam discretas, para não competirem com ela.
function drawMarkers() {
  document.getElementById('markers')!.replaceChildren();
  for (const photo of marcadas) {
    const pose = photo.pose!;
    const ativa = selecionada?.id === photo.id;
    if (ativa) {
      const abertura = horizontalFov(pose.verticalFovDeg, photo.width / photo.height);
      const setor = fovWedge({ u: pose.u, v: pose.v }, pose.headingDeg, abertura, 132);
      make('polygon', { points: setor.map(p => `${p.u},${p.v}`).join(' '), fill: '#b34e30', 'fill-opacity': '.24', stroke: '#b34e30', 'stroke-opacity': '.55', 'stroke-width': '2' });
      const rad = pose.headingDeg * Math.PI / 180;
      make('line', { x1: `${pose.u}`, y1: `${pose.v}`, x2: `${pose.u + Math.sin(rad) * 74}`, y2: `${pose.v - Math.cos(rad) * 74}`, stroke: '#8f3a20', 'stroke-width': '4' });
      const anel = make('circle', { cx: `${pose.u}`, cy: `${pose.v}`, r: '11', fill: 'none', stroke: '#b34e30', 'stroke-width': '3' });
      anel.innerHTML = '<animate attributeName="r" values="11;26;11" dur="1.9s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="0.95;0;0.95" dur="1.9s" repeatCount="indefinite"/>';
      make('circle', { cx: `${pose.u}`, cy: `${pose.v}`, r: '9', fill: '#b34e30', stroke: 'white', 'stroke-width': '3' });
    } else {
      make('circle', { cx: `${pose.u}`, cy: `${pose.v}`, r: '6', fill: '#f6f6f0', stroke: '#7d8a78', 'stroke-width': '2.5' });
    }
  }
}

// O botão diz o que vai acontecer: com uma foto escolhida, o passeio começa no ponto dela.
function rotuloPasseio(caminhando: boolean) {
  if (caminhando) return 'Sair do passeio (Esc)';
  return selecionada ? 'Andar a partir daqui' : 'Andar por dentro';
}

function mostrarFoto(on: boolean) {
  const photo = selecionada;
  mostrandoFoto = on && !!photo;
  el('visit-stage').hidden = !mostrandoFoto;
  el('preview').hidden = mostrandoFoto;
  el('visit-badge').textContent = mostrandoFoto ? 'Fotografia original' : 'Modelo em 3D';
  el('visit-photo').textContent = mostrandoFoto ? 'Ver o modelo daqui' : 'Ver a fotografia';
  if (mostrandoFoto && photo) {
    const img = el<HTMLImageElement>('visit-large');
    img.src = asset(photo.path);
    img.alt = `Fotografia ${title(photo)}`;
  }
}

function selecionar(photo: Reference) {
  selecionada = photo;
  const pose = photo.pose!;
  el('visit-room').textContent = nomeAmbiente(photo.roomId);
  el('visit-hint').textContent = `${title(photo)}: o leque mostra o alcance da câmera, e a seta, para onde ela olhava.`;
  el('visit-caption').textContent = pose.evidence;
  el('visit-photo').hidden = false;
  document.querySelectorAll<HTMLButtonElement>('.photo-card').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === photo.id)));
  drawMarkers();
  mostrarFoto(false);
  el('visit-walk').textContent = rotuloPasseio(andando);
  if (project.calibration) scene?.viewFromPose(poseToWorld(pose, project.calibration.transform));
  el('visit-info').textContent = `Você está no ponto de ${title(photo)}, olhando na mesma direção da fotografia.`;
}

const grid = el('visit-grid');
for (const photo of project.photos) {
  const button = document.createElement('button');
  button.className = 'photo-card';
  button.dataset.id = photo.id;
  button.setAttribute('aria-pressed', 'false');
  button.disabled = !photo.pose;
  const frame = document.createElement('span');
  frame.className = 'thumb';
  const img = document.createElement('img');
  img.loading = 'lazy'; img.src = asset(photo.path); img.alt = '';
  img.addEventListener('error', () => { frame.textContent = 'Imagem não encontrada.'; frame.classList.add('error'); });
  frame.append(img);
  const nome = document.createElement('strong');
  nome.textContent = title(photo);
  const estado = document.createElement('span');
  estado.className = 'photo-state';
  estado.textContent = photo.pose ? nomeAmbiente(photo.roomId) : 'sem ponto marcado';
  button.append(frame, nome, estado);
  button.onclick = () => selecionar(photo);
  grid.append(button);
}

el('visit-photo').onclick = () => mostrarFoto(!mostrandoFoto);
el('visit-frame').onclick = () => {
  mostrarFoto(false);
  selecionada = null;
  document.querySelectorAll<HTMLButtonElement>('.photo-card').forEach(b => b.setAttribute('aria-pressed', 'false'));
  drawMarkers();
  scene?.viewFromPose(null);
  scene?.frame();
  el('visit-walk').textContent = rotuloPasseio(andando);
  el('visit-room').textContent = 'Escolha uma fotografia';
  el('visit-photo').hidden = true;
  el('visit-hint').textContent = 'Cada marca é uma fotografia. O leque mostra o que a câmera alcançava.';
  el('visit-info').textContent = 'Reconstruído a partir da planta e das fotografias.';
};

Promise.all([import('./scene/preview'), import('./data/pilot')]).then(([preview, pilot]) => {
  scene = preview.mountPreview(el('preview'), message => { el('visit-info').textContent = message; });
  scene.setWalkListener(estado => {
    const ativo = estado !== null;
    if (ativo === andando) return;
    andando = ativo;
    el('visit-walk').textContent = rotuloPasseio(ativo);
    el('visit-walk').classList.toggle('primary', !ativo);
    for (const id of ['visit-frame', 'visit-photo', 'visit-furniture', 'visit-labels']) el<HTMLButtonElement>(id).disabled = ativo;
    el('visit-info').textContent = ativo
      ? 'W A S D ou setas para andar, mouse para olhar, Shift para acelerar, Esc para sair.'
      : selecionada
        ? `Você está no ponto de ${title(selecionada)}, olhando na mesma direção da fotografia.`
        : 'Reconstruído a partir da planta e das fotografias.';
  });
  el('visit-walk').onclick = () => {
    if (andando) { scene?.exitWalk(); return; }
    mostrarFoto(false);
    // Com uma fotografia escolhida, o passeio começa no ponto dela, olhando na mesma direção.
    const pose = selecionada?.pose && project.calibration
      ? poseToWorld(selecionada.pose, project.calibration.transform)
      : null;
    scene?.enterWalk(pose);
  };
  el<HTMLInputElement>('visit-labels').onchange = event => {
    scene?.setLabels((event.target as HTMLInputElement).checked);
  };
  el('visit-furniture').onclick = () => {
    const button = el('visit-furniture');
    const com = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(com));
    button.textContent = com ? 'Com mobília' : 'Sem mobília';
    scene?.setFurniture(com);
  };
  if (project.calibration) {
    scene.show(pilot.deriveApartment(pilot.initialApartment(), project.calibration.transform));
  }
  drawMarkers();
});

svg.addEventListener('click', event => {
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  // Clicar perto de uma marca escolhe aquela fotografia: a planta também navega.
  let melhor: Reference | null = null, menor = 26;
  for (const photo of marcadas) {
    const d = Math.hypot(p.x - photo.pose!.u, p.y - photo.pose!.v);
    if (d < menor) { menor = d; melhor = photo; }
  }
  if (melhor) selecionar(melhor);
});

drawMarkers();
