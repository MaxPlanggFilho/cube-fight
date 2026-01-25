# Protótipo Battle Royale 2D

Projeto simples e original inspirado em mecânicas de battle royale (não é uma cópia do jogo comercial). Feito com Phaser 3 — sem assets externos para manter tudo leve.

Como executar:

1. Abra o arquivo `index.html` diretamente no navegador. Para evitar problemas com CORS, recomendo servir via servidor local:

```bash
# Python 3
python -m http.server 8000
# então abra http://localhost:8000
```

O que está implementado neste protótipo:
- Movimentação do jogador (WASD)
- Mirar com o mouse e atirar (clique)
- Bots inimigos simples que se movem aleatoriamente
- Zona segura que encolhe periodicamente (dano fora da zona)
- HUD simples com vida e número de bots

Próximos passos possíveis (posso implementar):
- Melhor IA para bots
- Itens/armas e inventário
- Gráficos e áudio originais
- Multiplayer (via WebSocket)

Diga o que quer adicionar e eu continuo implementando.
