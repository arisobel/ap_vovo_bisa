# Backlog

## F0 — validação restante
- Executar revisão visual desktop/mobile e roteiro manual do blueprint quando houver navegador conectado.
- Conferir falha de imagem e fallback WebGL na interface em execução.

## F1 — em andamento
- Confirmar que a planta corresponde à configuração atual.
- Obter medida real conhecida em campo; hoje toda cota vem do desenho.
- Traçado estrutural concluído: 16 cômodos, incluindo os dois trechos de corredor. Nada mais a traçar na planta.
- BH de serviço, LAV. e HALL SOCIAL estão gravados como `sem-cota`: traçado sem conferência independente. Revisar em campo antes de tratar como confiáveis.
- Conferir a cena 3D em navegador: nunca foi aberta. Verificar aparência, desempenho e os botões enquadrar/vista superior/ocultar paredes.
- Medir espessura de parede, peitoril e altura de janela em campo. O pé-direito já foi confirmado; esses quatro continuam estimados.
- Medir espessura real de parede por banda de pixels em vez do valor global estimado de 0,15 m.
- Revisar pé-direito antes de afirmar precisão; alturas provisórias devem ser rotuladas.

## F2 — em andamento
- Editor de ponto/direção, comparação na proporção da foto e schema v2: implementados.
- Marcar as 11 fotos: nenhuma foi associada ainda. Todas continuam `pendente`.
- Identificar quartos, escritório e banheiros com revisão humana; os nomes dos arquivos não valem como associação.
- Revisar o editor em navegador: a marcação por dois cliques e a comparação nunca foram usadas.

## F3 / F4
- Passeio e colisão implementados; falta revisar em navegador e sincronizar a posição do caminhante com a planta 2D.
- Modelar folha de porta ou marcar visualmente o vão: hoje todo vão é atravessável.
- Mobília ainda não traçada: armário embutido do escritório (ver KNOWN_ISSUES: a foto mostra armário profundo, o traçado registra embutidos de 0,27 m), armários da área de serviço e do corredor de serviço, tanque, sofá e escrivaninha do escritório, e o que houver nos dormitórios.
- Mobília desenhada como caixa: banheira, vaso e cuba são blocos retangulares com a cor da louça. Forma real exige geometria por tipo de peça.
- Estampas e desenhos de acabamento: o parquete em espinha, a flor do azulejo e a junta da cerâmica são cor lisa hoje. Exige textura procedural ou imagem derivada, com identificação de derivada.
- Rodapés, folhas de porta, louças e armários embutidos. Folha de porta muda a navegação e precisa de decisão antes: hoje todo vão é passagem livre.
- Vazios do gradil: hoje o guarda-corpo do terraço é um parapeito maciço de 1,10 m. Desenhar os montantes exige geometria de balaústre, não só altura, e cabe junto com materiais na F4.
- Medir no local a altura do gradil, a espessura de parede, o peitoril e a altura de janela. `railingHeight` é a segunda altura do projeto e continua estimada.
- Materiais/objetos fixos após validação estrutural.
- Medir desempenho, custo de imagens e bundle; considerar miniaturas derivadas preservando originais.
