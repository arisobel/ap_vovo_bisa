# Problemas observados

- Build reporta módulo 3D maior que 500 kB (cerca de 539 kB minificado, 134 kB gzip). Ele está separado da lógica de planta e catálogo; não há evidência de problema de desempenho, pois FPS não foi medido.
- Verificação visual bloqueada pela ausência de navegador conectado no runtime Browser da sessão. Testes unitários e HTTP não substituem revisão de interface.

Pendências espaciais, ainda não classificadas como defeitos, estão no backlog.
- DORMIT. 1 tem duas portas (parede oeste, 0,69 m; parede sul, 0,66 m). Dois acessos a um dormitório é incomum e a destinação de cada uma não foi confirmada.
- A janela do DORMIT. 1 começa a 4 px do canto norte, deixando um pilar de cerca de 0,11 m. Pode ser limite de resolução do desenho; conferir em campo.
- Detecção automática dos cômodos restantes não é confiável com o método testado. Janelas e portas são vãos na máscara de parede, então o espaço externo vaza para dentro pelo acesso ao terraço e funde os ambientes grandes. Baixar o limiar para capturar os vidros transforma linhas de cota e frentes de armário em paredes falsas, que cortam cômodos ao meio. Os ambientes pequenos do setor oeste foram isolados corretamente e servem como mapa de partida, não como traçado.
- A área impressa não segue uma regra única. Em COZINHA, ALMOÇO e ESCRITÓRIO ela corresponde ao contorno estrutural inteiro; em DORMIT. 1 e DORMIT. 2 ela desconta a faixa dos armários embutidos. O campo `pixels` de cada conferência registra qual das duas foi comparada.
- Nenhuma linha de bancada ou armário foi detectada dentro da COZINHA. Para uma cozinha real isso é improvável: a planta aparentemente não desenha o mobiliário fixo desse ambiente.
- A divisória oeste do BH da suíte aparece em cinza claro entre v=124 e v=201, e não em preto como as demais paredes. Foi modelada como parede cheia por precaução, mas pode ser tijolo de vidro ou envidraçamento.
- O TER. não tem parede desenhada além da fachada do living. Seu contorno vem de linhas finas de guarda-corpo, e as duas conferências ficam entre 2 e 3 por cento, contra menos de 1 por cento no resto do apartamento.
- A fachada oeste da ÁREA DE SERVIÇO tem 6,14 m sem parede escura, registrados como uma janela única. `foto_corredor_cozinha_01` mostra a área de serviço ao fundo com **uma sequência de janelas** ocupando a fachada — não é gradil nem tijolo de vidro. A extensão modelada está aproximadamente certa; o número de folhas, não. Depende de confirmação do usuário.
- A divisão do corredor em dois trechos vem de dois tocos de parede em v=325..330 com um vão de 25 px entre eles. A planta não desenha arco de porta ali, então pode ser passagem sem folha; foi modelada como porta pela largura.
- O corte aberto entre corredor-sul e LIVING está em v=501 dos dois lados, mas as paredes que o flanqueiam têm face interna em v=498. Sobra um degrau de 3 px, cerca de 8 cm, no contorno do corredor.
- A cena 3D nunca foi aberta em navegador. Geometria e matemática das paredes têm teste automatizado, mas aparência, desempenho e os botões de câmera não foram vistos por ninguém.
- Os três fechamentos do terraço sobem 1,10 m desde 07/09/2026, pelo parâmetro `railingHeight`, e não mais os 2,70 m do pé-direito. O que está corrigido é a **altura**; a aparência não: eles continuam sendo desenhados como um parapeito maciço, sem os vazios do gradil, e o valor de 1,10 m é altura usual de guarda-corpo, não medida no local. O que o usuário confirmou é o tipo de fechamento.
- O passeio nunca foi executado em navegador. Colisão e barreiras têm teste automatizado, mas movimento, sensibilidade do mouse, pointer lock e desempenho do loop contínuo não foram vistos.
- Nenhuma porta tem folha modelada, então no passeio todo vão é atravessável, inclusive os que dariam em ambientes fechados.
- O editor de poses nunca foi usado em navegador. A marcação por dois cliques, a seta na planta e a comparação foto/modelo têm o contrato testado, mas não a interação.
- A comparação usa o quadro na proporção da fotografia, mas nada garante que a foto não tenha sido recortada depois da captura. Se tiver, o campo de visão registrado não corresponde ao original.
