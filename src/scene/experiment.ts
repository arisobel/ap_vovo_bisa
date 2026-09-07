// Modo experimental de aparência, restrito ao LIVING.
//
// Existe para responder uma pergunta: o que muda na leitura da sala quando o piso ganha desenho,
// o teto existe, o rodapé fecha o encontro com a parede e a luz entra pelas aberturas em vez de
// vir de todos os lados por igual. Não é um novo modo de visualização do produto: nasce desligado,
// vive só no editor local e restaura tudo o que mexeu.
//
// O que é global e o que é local, dito explicitamente:
//
//   'atual'        nada aplicado. Restaura renderizador, luzes e materiais ao estado de origem.
//   'acabamentos'  troca materiais SÓ do living, acende teto e rodapé SÓ do living. Nenhuma
//                  configuração global é tocada: os demais cômodos ficam idênticos.
//   'iluminacao'   além do acima, muda curva de tom, exposição, sombras e as duas luzes da cena.
//                  Essas quatro coisas são GLOBAIS: os demais cômodos MUDAM de aparência neste
//                  modo. Não há isolamento por cômodo aqui, e afirmar o contrário seria falso.
//
// Fora de escopo nesta rodada, por decisão do usuário: sofá em GLB, sondas de luz, spots,
// reflexo de ambiente no verniz e iluminação indireta. Não há nada aqui que produza reflexo da
// janela no parquete nem luz rebatida.

import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, CanvasTexture, DoubleSide, Group, HemisphereLight,
  Mesh, MeshStandardMaterial, PCFShadowMap, RepeatWrapping, SRGBColorSpace, Shape, ShapeGeometry,
  type AmbientLight, type DirectionalLight, type Material, type Scene, type Side, type WebGLRenderer,
} from 'three';
import { herringbone, parquetRepeat, type Parquet } from './parquet';
import type { SceneRoom } from './preview';

export type ExperimentMode = 'atual' | 'acabamentos' | 'iluminacao';
export const experimentModes: ExperimentMode[] = ['atual', 'acabamentos', 'iluminacao'];

// O experimento vale para um cômodo só. Estender aos demais é outra entrega, e teria de resolver
// antes o acabamento de cada um deles com a mesma exigência de evidência.
export const EXPERIMENT_ROOM = 'living';

// Profundidade do rodapé. Não é altura, então não vira parâmetro nomeado (D015 fala de alturas);
// é a saliência típica de um rodapé de madeira e não foi medida no imóvel.
export const PROFUNDIDADE_RODAPE = .015;

// Cenário ILUSTRATIVO de luz natural. Não há orientação solar nem horário confirmados para este
// apartamento: estes dois números são escolha de aparência, não simulação. Na convenção de azimute
// da planta, 180° é de frente para a fachada sul, que é onde estão a janela e a porta do terraço.
export const AZIMUTE_SOL = 202;
export const ELEVACAO_SOL = 34;
export const EXPOSICAO_PADRAO = 1;
export const EXPOSICAO_MIN = .4;
export const EXPOSICAO_MAX = 2;

// Intensidades do cenário ilustrativo. Sem luz indireta, um interior fechado só com sol direto
// ficaria preto fora do facho: a hemisférica é o preenchimento que substitui o que seria rebatido.
const SOL_INTENSIDADE = 2.6;
const HEMISFERICA_INTENSIDADE = .62;
const AMBIENTE_NO_CENARIO = .22;
const CEU = '#dde6ee';
const CHAO_REFLETIDO = '#7d6d5e';

export type BaseboardRun = {
  wallId: string; start: number; end: number; length: number;
  x: number; z: number; rotationY: number;
};

// Trechos de rodapé de um cômodo.
//
// A regra é a estrutura real da parede, não uma suposição: `wall.pieces` já traz a parede partida
// pelos vãos, e cada trecho carrega a altura em que começa. Só interessa o que encosta no piso,
// isto é, `base === 0`. Uma porta não gera trecho nenhum nessa faixa — o rodapé some sozinho ali.
// Uma janela gera o trecho do peitoril, que começa no piso, e ali o rodapé continua, como continua
// no imóvel. Nada disso é caso particular escrito à mão.
export function baseboardRuns(room: SceneRoom, depth = PROFUNDIDADE_RODAPE): BaseboardRun[] {
  const trechos: BaseboardRun[] = [];
  for (const wall of room.walls) {
    const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    if (!(comprimento > 0)) continue;
    const dx = (wall.end.x - wall.start.x) / comprimento;
    const dz = (wall.end.z - wall.start.z) / comprimento;
    // A parede cresce para fora do contorno, então a face interna é a própria linha do contorno.
    const dentroX = -dz, dentroZ = dx;
    for (const trecho of wall.pieces) {
      if (trecho.base > 1e-9) continue;
      const largura = trecho.end - trecho.start;
      if (largura <= .02) continue;
      const meio = (trecho.start + trecho.end) / 2;
      trechos.push({
        wallId: wall.id, start: trecho.start, end: trecho.end, length: largura,
        x: wall.start.x + dx * meio + dentroX * depth / 2,
        z: wall.start.z + dz * meio + dentroZ * depth / 2,
        rotationY: Math.atan2(-dz, dx),
      });
    }
  }
  return trechos;
}

// Altura do teto do cômodo: a maior altura entre as suas paredes. Um cômodo cujas paredes usam
// alturas diferentes — o terraço, com gradil — não ganharia teto correto assim, e por isso o
// experimento vale para um cômodo de pé-direito uniforme.
export function ceilingHeight(room: SceneRoom): number {
  return room.walls.reduce((maior, w) => Math.max(maior, w.height), 0);
}

function componentes(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Desenha o ladrilho do parquete num canvas. Trabalha em bytes sRGB direto, sem passar pela
// gestão de cor do Three.js: o que se quer aqui é exatamente a cor declarada no material.
export function desenharParquete(padrao: Parquet, corBase: string, lado = 1024): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = lado; canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const escala = lado / padrao.periodMeters;
  const [r, g, b] = componentes(corBase);
  const cor = (tom: number, fator = 1) => {
    const f = tom * fator;
    return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
  };
  // Fundo escuro: é o que sobra visível entre as tábuas e vira a junta.
  ctx.fillStyle = cor(.42);
  ctx.fillRect(0, 0, lado, lado);
  const junta = Math.max(1, Math.round(.0015 * escala));
  for (const tabua of padrao.planks) {
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const x = (tabua.x + dx * padrao.periodMeters) * escala;
        const y = (tabua.y + dy * padrao.periodMeters) * escala;
        const w = tabua.width * escala, h = tabua.height * escala;
        if (x + w < -2 || x > lado + 2 || y + h < -2 || y > lado + 2) continue;
        ctx.fillStyle = cor(tabua.tone);
        ctx.fillRect(x + junta, y + junta, w - junta * 2, h - junta * 2);
        // Veio da madeira ao longo da fibra: três linhas discretas, sem virar listra.
        ctx.strokeStyle = cor(tabua.tone, .9);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i <= 3; i++) {
          if (tabua.grain === 'x') {
            const yy = Math.round(y + (h * i) / 4) + .5;
            ctx.moveTo(x + junta * 2, yy); ctx.lineTo(x + w - junta * 2, yy);
          } else {
            const xx = Math.round(x + (w * i) / 4) + .5;
            ctx.moveTo(xx, y + junta * 2); ctx.lineTo(xx, y + h - junta * 2);
          }
        }
        ctx.stroke();
      }
    }
  }
  return canvas;
}

export type ExperimentDeps = {
  scene: Scene;
  renderer: WebGLRenderer;
  pisos: Group; paredes: Group; moveis: Group;
  ambiente: AmbientLight; sol: DirectionalLight;
  taco: { length: number; width: number };
  alturaRodape: number;
  render: () => void;
  report: (message: string) => void;
};

export type ExperimentHandle = {
  setMode(mode: ExperimentMode): void;
  mode(): ExperimentMode;
  rebuild(rooms: SceneRoom[] | null): void;
  setInterior(interior: boolean): void;
  setExposure(value: number): void;
  exposure(): number;
  dispose(): void;
};

export function createExperiment(deps: ExperimentDeps): ExperimentHandle {
  const { scene, renderer, pisos, paredes, moveis, ambiente, sol, render, report } = deps;

  // Estado de origem, capturado uma vez, antes de qualquer alteração. É o que 'atual' restaura.
  // Guardado por cópia, nunca por referência: o objeto vivo vai ser modificado.
  const origem = {
    toneMapping: renderer.toneMapping,
    toneMappingExposure: renderer.toneMappingExposure,
    sombraLigada: renderer.shadowMap.enabled,
    sombraAuto: renderer.shadowMap.autoUpdate,
    sombraTipo: renderer.shadowMap.type,
    ambienteIntensidade: ambiente.intensity,
    solIntensidade: sol.intensity,
    solPosicao: sol.position.clone(),
    solAlvo: sol.target.position.clone(),
    solSombra: sol.castShadow,
  };

  const extras = new Group();
  const luzes = new Group();
  extras.visible = false;
  luzes.visible = false;
  scene.add(extras, luzes);

  const hemisferica = new HemisphereLight(CEU, CHAO_REFLETIDO, HEMISFERICA_INTENSIDADE);
  luzes.add(hemisferica);
  // O alvo da direcional precisa estar na cena para a sua matriz ser atualizada.
  scene.add(sol.target);

  let modo: ExperimentMode = 'atual';
  let interior = false;
  let exposicao = EXPOSICAO_PADRAO;
  let salas: SceneRoom[] | null = null;
  let teto: Mesh | null = null;
  let textura: CanvasTexture | null = null;
  let padrao: Parquet | null = null;
  const originais = new Map<Mesh, Material | Material[]>();
  // Os materiais do experimento são criados uma vez por remontagem da cena e descartados na
  // remontagem seguinte. Criá-los dentro de `aplicar()` os multiplicaria a cada troca de opção,
  // e o usuário troca de opção o tempo todo — é o gesto central deste modo.
  let materiaisDoLiving: { piso: MeshStandardMaterial; parede: MeshStandardMaterial; teto: MeshStandardMaterial } | null = null;

  const salaDoExperimento = () => salas?.find(s => s.id === EXPERIMENT_ROOM) ?? null;

  function limpar(grupo: Group) {
    for (const filho of [...grupo.children]) {
      grupo.remove(filho);
      const m = filho as Mesh;
      m.geometry?.dispose?.();
    }
  }

  function garantirTextura(sala: SceneRoom): CanvasTexture | null {
    if (textura) return textura;
    const optic = sala.optics?.floor;
    if (!optic?.pattern) return null;
    try {
      padrao = herringbone(deps.taco.length, deps.taco.width);
    } catch (erro) {
      report(erro instanceof Error ? erro.message : 'Não foi possível gerar o padrão do piso.');
      return null;
    }
    const canvas = desenharParquete(padrao, optic.color);
    if (!canvas) return null;
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    // As UVs do piso já estão em metros: ShapeGeometry emite as coordenadas do vértice como UV.
    // A repetição é o inverso do lado do ladrilho, igual nos dois eixos — precisa ser igual, senão
    // a rotação a seguir vira cisalhamento e as tábuas deixam de ser retângulos.
    const r = parquetRepeat(padrao.periodMeters);
    t.repeat.set(r, r);
    t.center.set(.5, .5);
    t.rotation = (optic.pattern.rotationDeg * Math.PI) / 180;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textura = t;
    return t;
  }

  function materialPBR(cor: string, roughness: number, metalness: number, mapa?: CanvasTexture | null, lados?: Side) {
    return new MeshStandardMaterial({
      // Com textura, a cor já está nos pixels: multiplicar de novo escureceria o piso ao quadrado.
      color: mapa ? '#ffffff' : cor,
      roughness, metalness,
      ...(mapa ? { map: mapa } : {}),
      ...(lados ? { side: lados } : {}),
    });
  }

  function descartarMateriais() {
    if (!materiaisDoLiving) return;
    for (const m of Object.values(materiaisDoLiving)) m.dispose();
    materiaisDoLiving = null;
  }

  function construirExtras() {
    limpar(extras);
    teto = null;
    const sala = salaDoExperimento();
    // Os materiais antigos descrevem malhas que não existem mais.
    descartarMateriais();
    if (!sala || !sala.optics) return;
    const mapa = garantirTextura(sala);
    materiaisDoLiving = {
      piso: materialPBR(sala.optics.floor.color, sala.optics.floor.roughness, sala.optics.floor.metalness, mapa, DoubleSide),
      parede: materialPBR(sala.optics.wall.color, sala.optics.wall.roughness, sala.optics.wall.metalness),
      teto: materialPBR(sala.optics.ceiling.color, sala.optics.ceiling.roughness, sala.optics.ceiling.metalness),
    };

    // --- teto ---
    const altura = ceilingHeight(sala);
    const forma = new Shape();
    sala.contour.forEach((p, i) => (i === 0 ? forma.moveTo(p.x, -p.z) : forma.lineTo(p.x, -p.z)));
    forma.closePath();
    const materialTeto = materiaisDoLiving.teto;
    // Mesma rotação do piso, para o contorno cair no mesmo lugar; visível só por baixo, que é de
    // onde alguém o vê. `shadowSide` em ambas as faces para que ele barre o sol venha de onde vier:
    // um teto que aparece por dentro mas deixa passar luz por cima seria pior que não ter teto.
    materialTeto.side = BackSide;
    materialTeto.shadowSide = DoubleSide;
    const malha = new Mesh(new ShapeGeometry(forma), materialTeto);
    malha.rotation.x = -Math.PI / 2;
    malha.position.y = altura;
    malha.castShadow = true;
    malha.receiveShadow = true;
    malha.userData = { roomId: sala.id, kind: 'teto' };
    extras.add(malha);
    teto = malha;
    teto.visible = interior;

    // --- rodapé ---
    for (const trecho of baseboardRuns(sala)) {
      const bloco = new Mesh(
        new BoxGeometry(trecho.length, deps.alturaRodape, PROFUNDIDADE_RODAPE),
        materiaisDoLiving.parede,
      );
      bloco.position.set(trecho.x, deps.alturaRodape / 2, trecho.z);
      bloco.rotation.y = trecho.rotationY;
      bloco.castShadow = true;
      bloco.receiveShadow = true;
      bloco.userData = { roomId: sala.id, kind: 'rodape' };
      extras.add(bloco);
    }
  }

  function trocarMateriais(ligar: boolean) {
    if (ligar && materiaisDoLiving) {
      const { piso: doPiso, parede: daParede } = materiaisDoLiving;
      for (const grupo of [pisos, paredes]) {
        for (const filho of grupo.children) {
          const malha = filho as Mesh;
          if (malha.userData?.roomId !== EXPERIMENT_ROOM) continue;
          const tipo = malha.userData?.kind;
          // Esquadria e vidro seguem como estão: o vidro precisaria de transmissão, que está fora
          // desta rodada, e trocar só a esquadria não muda a leitura da sala.
          if (tipo !== 'piso' && tipo !== 'parede') continue;
          if (!originais.has(malha)) originais.set(malha, malha.material);
          malha.material = tipo === 'piso' ? doPiso : daParede;
        }
      }
      return;
    }
    for (const [malha, material] of originais) malha.material = material;
    originais.clear();
  }

  // Bandeiras de sombra em toda a cena, não só no living: a luz do cenário é global, e uma parede
  // de outro cômodo que não projetasse sombra deixaria luz atravessar o apartamento.
  function bandeirasDeSombra(ligar: boolean) {
    for (const grupo of [pisos, paredes, moveis, extras]) {
      grupo.traverse(objeto => {
        const malha = objeto as Mesh;
        if (malha.isMesh !== true) return;
        // O vidro recebe sombra mas não projeta: um painel opaco à luz fecharia a janela e o
        // interior ficaria escuro justamente onde deveria entrar luz.
        const ehVidro = malha.userData?.kind === 'vidro';
        malha.castShadow = ligar && !ehVidro;
        malha.receiveShadow = ligar;
      });
    }
  }

  function ajustarSol() {
    const sala = salaDoExperimento();
    if (!sala) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of sala.contour) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const raio = Math.max(maxX - minX, maxZ - minZ) / 2 + 1.5;
    const distancia = Math.max(12, raio * 2.4);
    const rad = (AZIMUTE_SOL * Math.PI) / 180;
    const horizontal = distancia * Math.cos((ELEVACAO_SOL * Math.PI) / 180);
    sol.position.set(cx + Math.sin(rad) * horizontal, distancia * Math.sin((ELEVACAO_SOL * Math.PI) / 180), cz - Math.cos(rad) * horizontal);
    sol.target.position.set(cx, 1, cz);
    sol.target.updateMatrixWorld();
    sol.intensity = SOL_INTENSIDADE;
    sol.castShadow = true;
    const camera = sol.shadow.camera;
    camera.left = -raio; camera.right = raio;
    camera.top = raio; camera.bottom = -raio;
    camera.near = .5; camera.far = distancia * 2.2;
    camera.updateProjectionMatrix();
    sol.shadow.mapSize.set(2048, 2048);
    // Paredes de 15 cm com sol rasante produzem acne de sombra; o desvio é ajustado para a escala
    // do apartamento, não copiado de um exemplo com outra dimensão de cena.
    sol.shadow.bias = -.0006;
    sol.shadow.normalBias = .02;
    sol.shadow.needsUpdate = true;
  }

  function restaurarGlobais() {
    renderer.toneMapping = origem.toneMapping;
    renderer.toneMappingExposure = origem.toneMappingExposure;
    renderer.shadowMap.enabled = origem.sombraLigada;
    renderer.shadowMap.autoUpdate = origem.sombraAuto;
    renderer.shadowMap.type = origem.sombraTipo;
    ambiente.intensity = origem.ambienteIntensidade;
    sol.intensity = origem.solIntensidade;
    sol.position.copy(origem.solPosicao);
    sol.target.position.copy(origem.solAlvo);
    sol.target.updateMatrixWorld();
    sol.castShadow = origem.solSombra;
    luzes.visible = false;
    bandeirasDeSombra(false);
  }

  function aplicar() {
    if (modo === 'atual') {
      trocarMateriais(false);
      extras.visible = false;
      restaurarGlobais();
      render();
      return;
    }
    trocarMateriais(true);
    extras.visible = true;
    if (teto) teto.visible = interior;
    if (modo === 'acabamentos') {
      // Nada global é tocado aqui, de propósito: é o que permite dizer, sem ressalva, que os
      // outros cômodos não mudaram neste modo.
      restaurarGlobais();
      render();
      return;
    }
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposicao;
    renderer.shadowMap.enabled = true;
    // PCFShadowMap e não PCFSoftShadowMap: na 0.185.1 o segundo está depreciado, avisa no console
    // e cai para este mesmo. Verificado em WebGLShadowMap.js, não suposto pelo nome.
    renderer.shadowMap.type = PCFShadowMap;
    // Nada se move na cena: nem as luzes, nem a geometria. Deixar o mapa de sombra em automático
    // faria o renderizador redesenhá-lo a cada quadro do passeio, 60 vezes por segundo, para um
    // resultado idêntico. Ele é calculado sob demanda e invalidado quando algo de fato muda.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    ambiente.intensity = AMBIENTE_NO_CENARIO;
    luzes.visible = true;
    bandeirasDeSombra(true);
    ajustarSol();
    render();
  }

  return {
    mode: () => modo,
    exposure: () => exposicao,
    setMode(novo) {
      if (novo === modo) return;
      modo = novo;
      aplicar();
    },
    setExposure(valor) {
      exposicao = Math.max(EXPOSICAO_MIN, Math.min(EXPOSICAO_MAX, valor));
      if (modo !== 'iluminacao') return;
      renderer.toneMappingExposure = exposicao;
      render();
    },
    setInterior(novo) {
      if (novo === interior) return;
      interior = novo;
      if (!teto) return;
      teto.visible = interior;
      // O teto entrando ou saindo muda o que bloqueia o sol: o mapa de sombra precisa refazer.
      if (modo === 'iluminacao') renderer.shadowMap.needsUpdate = true;
    },
    rebuild(rooms) {
      // Devolve os materiais originais ANTES de descartar os do experimento. A ordem importa:
      // limpar o registro primeiro deixaria uma malha ainda viva apontando para um material já
      // descartado, e é o que acontecia quando a cena era remontada sem cômodo nenhum.
      trocarMateriais(false);
      salas = rooms;
      construirExtras();
      aplicar();
    },
    dispose() {
      modo = 'atual';
      trocarMateriais(false);
      restaurarGlobais();
      limpar(extras);
      descartarMateriais();
      scene.remove(extras, luzes, sol.target);
      hemisferica.dispose();
      textura?.dispose();
      textura = null;
    },
  };
}
