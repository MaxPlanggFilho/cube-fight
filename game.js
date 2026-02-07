// ==================== SISTEMA DE PERSISTÊNCIA ====================
class GameData {
    static getCoins() {
        return parseInt(localStorage.getItem('coins') || '0');
    }

    static setCoins(amount) {
        localStorage.setItem('coins', amount.toString());
    }

    static addCoins(amount) {
        const current = this.getCoins();
        this.setCoins(current + amount);
    }

    static getUpgradeLevel(item) {
        return parseInt(localStorage.getItem(`upgrade_${item}`) || '0');
    }

    static setUpgradeLevel(item, level) {
        localStorage.setItem(`upgrade_${item}`, level.toString());
    }

    static getUpgradeBonus(item) {
        const level = this.getUpgradeLevel(item);
        return level * 0.1; // 10% por nível
    }
}

// ==================== SISTEMA DE TELAS ====================
class ScreenManager {
    constructor() {
        this.currentScreen = 'lobby-screen';
        this.init();
    }

    init() {
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.hideGameOver();
            this.showScreen('game-screen');
            game.start();
        });

        document.getElementById('open-shop-btn').addEventListener('click', () => {
            this.showScreen('shop-screen');
            shop.updateDisplay();
        });

        document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
            this.showScreen('lobby-screen');
            this.updateLobbyDisplay();
        });

        document.getElementById('back-to-lobby-from-game').addEventListener('click', () => {
            this.hideGameOver();
            this.showScreen('lobby-screen');
            this.updateLobbyDisplay();
        });

        this.updateLobbyDisplay();
    }

    hideGameOver() {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('active');
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    updateLobbyDisplay() {
        const coins = GameData.getCoins();
        document.getElementById('lobby-coins').textContent = coins;

        const healthBonus = GameData.getUpgradeBonus('health');
        const speedBonus = GameData.getUpgradeBonus('speed');

        document.getElementById('lobby-health-bonus').textContent = `${(healthBonus * 100).toFixed(0)}%`;
        document.getElementById('lobby-speed-bonus').textContent = `${(speedBonus * 100).toFixed(0)}%`;
    }
}

// ==================== SISTEMA DE LOJA ====================
class Shop {
    constructor() {
        this.init();
    }

    getBaseCost(item) {
        // Custo base por tipo de upgrade
        const baseCosts = {
            health: 40,
            speed: 40
        };
        return baseCosts[item] || 40;
    }

    getItemCost(item) {
        const level = GameData.getUpgradeLevel(item);
        const base = this.getBaseCost(item);
        // Cada nível dobra o custo: base * 2^level
        return base * Math.pow(2, level);
    }

    init() {
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.dataset.item;
                this.buyItem(item);
            });
        });
    }

    buyItem(item) {
        let currentLevel = GameData.getUpgradeLevel(item);

        // Limite de 10 níveis por upgrade
        if (currentLevel >= 10) {
            alert('Este upgrade já está no nível máximo!');
            return;
        }

        const cost = this.getItemCost(item);
        const coins = GameData.getCoins();

        if (coins < cost) {
            alert('Moedas insuficientes!');
            return;
        }

        currentLevel = GameData.getUpgradeLevel(item);
        GameData.setUpgradeLevel(item, currentLevel + 1);
        GameData.setCoins(coins - cost);

        this.updateDisplay();
        screenManager.updateLobbyDisplay();
    }

    updateDisplay() {
        const coins = GameData.getCoins();
        document.getElementById('shop-coins').textContent = coins;

        const healthLevel = GameData.getUpgradeLevel('health');
        const speedLevel = GameData.getUpgradeLevel('speed');

        document.getElementById('health-level').textContent = healthLevel;
        document.getElementById('speed-level').textContent = speedLevel;

        // Atualizar botões de compra (custo dinâmico e limite de nível)
        document.querySelectorAll('.btn-buy').forEach(btn => {
            const item = btn.dataset.item;
            const level = GameData.getUpgradeLevel(item);
            const coinsNow = GameData.getCoins();

            if (level >= 10) {
                // Nível máximo: botão desativado e texto de MAX
                btn.disabled = true;
                btn.textContent = 'NÍVEL MÁXIMO';
            } else {
                const cost = this.getItemCost(item);
                btn.disabled = coinsNow < cost;
                // Atualizar texto mostrando o custo atual
                const label =
                    item === 'health'
                        ? `Comprar Vida (${cost} 🪙)`
                        : item === 'speed'
                            ? `Comprar Velocidade (${cost} 🪙)`
                            : `Comprar (${cost} 🪙)`;
                btn.textContent = label;
            }
        });
    }
}

// ==================== ENTIDADES DO JOGO ====================
class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 2;
        this.angle = 0;
        this.isAlive = true;
    }

    draw(ctx) {
        if (!this.isAlive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Corpo
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Direção (triângulo)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.5, -this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.5, this.radius * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Barra de vida
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        const barWidth = this.radius * 2;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 15;

        // Fundo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vida
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#10b981' : healthPercent > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
        }
    }

    move(dx, dy, walls = []) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        // Verificar colisão com paredes
        let canMoveX = true;
        let canMoveY = true;

        for (const wall of walls) {
            if (wall.checkCollision(newX, this.y, this.radius)) {
                canMoveX = false;
            }
            if (wall.checkCollision(this.x, newY, this.radius)) {
                canMoveY = false;
            }
        }

        if (canMoveX) {
            this.x = newX;
        }
        if (canMoveY) {
            this.y = newY;
        }
    }

    getDistanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    pointTo(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        this.angle = Math.atan2(dy, dx);
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 20, '#667eea');
        const healthBonus = GameData.getUpgradeBonus('health');
        const speedBonus = GameData.getUpgradeBonus('speed');
        this.maxHealth = 100 * (1 + healthBonus);
        this.health = this.maxHealth;
        this.speed = 2 * (1 + speedBonus);
    }

    update(mouseX, mouseY, keys, walls = []) {
        if (!this.isAlive) return;

        // Rotação em direção ao mouse
        this.pointTo(mouseX, mouseY);

        // Movimento
        let dx = 0, dy = 0;
        if (keys['w'] || keys['ArrowUp']) dy -= 1;
        if (keys['s'] || keys['ArrowDown']) dy += 1;
        if (keys['a'] || keys['ArrowLeft']) dx -= 1;
        if (keys['d'] || keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
            this.move(dx, dy, walls);
        }

        // Limites do mapa (serão ajustados no Game)
    }
}

class Bot extends Entity {
    constructor(x, y) {
        super(x, y, 18, '#ef4444');
        this.target = null;
        this.lastShotTime = 0;
        this.shootCooldown = 1000; // 1 segundo
        this.idealCombatDistance = 200; // Distância ideal para combate
        this.fleeDistance = 80; // Distância mínima antes de fugir
        this.detectionRange = 500; // Alcance de detecção de alvos

        // Sistema de patrulha
        this.patrolTarget = { x: x, y: y };
        this.lastPatrolChange = Date.now();
        this.patrolChangeInterval = 3000 + Math.random() * 2000; // 3-5 segundos
        this.patrolSpeed = 0.3; // Velocidade de patrulha (mais lenta que combate)
    }

    // Detecta balas que estão vindo em direção ao bot
    findThreateningBullets(bullets) {
        const threateningBullets = [];
        const lookAheadTime = 0.5; // Tempo em segundos para prever colisão

        bullets.forEach(bullet => {
            if (!bullet.isAlive) return;

            // Calcular posição futura da bala
            const futureBulletX = bullet.x + bullet.vx * lookAheadTime * 60;
            const futureBulletY = bullet.y + bullet.vy * lookAheadTime * 60;

            // Distância atual da bala
            const dx = bullet.x - this.x;
            const dy = bullet.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Verificar se a bala está vindo em direção ao bot
            const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
            const angleToBot = Math.atan2(dy, dx);
            const angleDiff = Math.abs(bulletAngle - angleToBot);
            const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

            // Se a bala está vindo em direção ao bot e está próxima
            if (normalizedAngleDiff < Math.PI / 3 && distance < 150) {
                // Verificar se a trajetória futura passa perto do bot
                const distToFuture = Math.sqrt(
                    Math.pow(futureBulletX - this.x, 2) +
                    Math.pow(futureBulletY - this.y, 2)
                );

                if (distToFuture < this.radius + bullet.radius + 20) {
                    threateningBullets.push({
                        bullet: bullet,
                        distance: distance,
                        angle: angleToBot
                    });
                }
            }
        });

        return threateningBullets.sort((a, b) => a.distance - b.distance);
    }

    // Calcula direção de fuga baseada em balas ameaçadoras
    calculateFleeDirection(threateningBullets) {
        if (threateningBullets.length === 0) return null;

        let fleeX = 0;
        let fleeY = 0;

        threateningBullets.forEach(threat => {
            // Direção oposta à bala
            const angle = threat.angle + Math.PI;
            const weight = 1 / (threat.distance + 1); // Mais peso para balas mais próximas
            fleeX += Math.cos(angle) * weight;
            fleeY += Math.sin(angle) * weight;
        });

        // Normalizar
        const length = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
        if (length > 0) {
            return { x: fleeX / length, y: fleeY / length };
        }

        return null;
    }

    update(player, otherBots, bullets, worldWidth = null, worldHeight = null, storm = null, walls = [], bushes = []) {
        if (!this.isAlive) return;

        // Verificar se está fora da tempestade e calcular direção para zona segura
        let stormDirection = null;
        if (storm) {
            const dx = this.x - storm.centerX;
            const dy = this.y - storm.centerY;
            const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

            if (distanceToCenter > storm.radius) {
                // Está fora da zona segura - precisa entrar
                const distanceToEdge = distanceToCenter - storm.radius;
                // Quanto mais longe, maior a urgência
                const urgency = Math.min(distanceToEdge / 200, 1); // Normalizar urgência

                // Direção para o centro da tempestade
                stormDirection = {
                    x: -dx / distanceToCenter,
                    y: -dy / distanceToCenter,
                    urgency: urgency
                };
            }
        }

        // Verificar visibilidade do player em moitas
        let playerVisible = true;
        if (player && player.isAlive && bushes && bushes.length > 0) {
            let playerInBush = false;
            let botInSameBush = false;

            bushes.forEach(bush => {
                const playerInside = bush.contains(player.x, player.y);
                const botInside = bush.contains(this.x, this.y);

                if (playerInside) {
                    playerInBush = true;
                    if (botInside) {
                        botInSameBush = true;
                    }
                }
            });

            // Se o player está em uma moita e o bot não está na mesma moita,
            // o player fica "invisível", a não ser que esteja muito perto.
            if (playerInBush && !botInSameBush) {
                const distToPlayer = this.getDistanceTo(player);
                const revealDistance = 120; // distância curta para ainda enxergar
                if (distToPlayer > revealDistance) {
                    playerVisible = false;
                }
            }
        }

        // Detectar balas ameaçadoras
        const threateningBullets = this.findThreateningBullets(bullets);
        const fleeDirection = this.calculateFleeDirection(threateningBullets);

        // Encontrar alvo mais próximo
        let nearestTarget = null;
        let nearestDistance = Infinity;

        if (player && player.isAlive && playerVisible) {
            const distToPlayer = this.getDistanceTo(player);
            if (distToPlayer < this.detectionRange) {
                nearestTarget = player;
                nearestDistance = distToPlayer;
            }
        }

        otherBots.forEach(bot => {
            if (bot.isAlive && bot !== this) {
                const dist = this.getDistanceTo(bot);
                if (dist < nearestDistance && dist < this.detectionRange) {
                    nearestDistance = dist;
                    nearestTarget = bot;
                }
            }
        });

        // Prioridades: Tempestade > Balas muito próximas > Combate > Patrulha
        // Se está fora da tempestade, priorizar entrar na zona segura
        if (stormDirection && stormDirection.urgency > 0.3) {
            // Alta urgência - mover diretamente para a zona segura
            this.move(stormDirection.x, stormDirection.y);
            this.pointTo(storm.centerX, storm.centerY);
            // Limites do mapa
            const maxX = worldWidth || canvas.width;
            const maxY = worldHeight || canvas.height;
            this.x = Math.max(this.radius, Math.min(maxX - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(maxY - this.radius, this.y));
            return null; // Não atira enquanto está fugindo da tempestade
        }

        // Se há balas ameaçadoras muito próximas, priorizar fuga
        if (fleeDirection && threateningBullets.length > 0 && threateningBullets[0].distance < 100) {
            let moveX = fleeDirection.x;
            let moveY = fleeDirection.y;

            // Se também está fora da tempestade, combinar direções
            if (stormDirection) {
                const stormWeight = 0.4;
                const fleeWeight = 0.6;
                moveX = moveX * fleeWeight + stormDirection.x * stormWeight;
                moveY = moveY * fleeWeight + stormDirection.y * stormWeight;
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                if (length > 0) {
                    moveX /= length;
                    moveY /= length;
                }
            }

            this.move(moveX, moveY, walls);
            // Ainda aponta para o alvo se houver um
            if (nearestTarget) {
                this.pointTo(nearestTarget.x, nearestTarget.y);
            }
            // Limites do mapa
            const maxX = worldWidth || canvas.width;
            const maxY = worldHeight || canvas.height;
            this.x = Math.max(this.radius, Math.min(maxX - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(maxY - this.radius, this.y));
            return null; // Não atira enquanto está fugindo de balas muito próximas
        }

        if (nearestTarget) {
            this.target = nearestTarget;
            this.pointTo(nearestTarget.x, nearestTarget.y);

            // Calcular direção e distância ao alvo
            const dx = nearestTarget.x - this.x;
            const dy = nearestTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Lógica de movimento baseada em distância
            let moveX = 0;
            let moveY = 0;

            if (distance < this.fleeDistance) {
                // Muito perto - fugir do alvo
                moveX = -dx / distance;
                moveY = -dy / distance;
            } else if (distance > this.idealCombatDistance) {
                // Muito longe - aproximar do alvo
                moveX = dx / distance;
                moveY = dy / distance;
            } else {
                // Distância ideal - movimento lateral para evitar tiros
                // Mover perpendicularmente à direção do alvo
                const perpendicularAngle = Math.atan2(dy, dx) + Math.PI / 2;
                moveX = Math.cos(perpendicularAngle) * 0.5;
                moveY = Math.sin(perpendicularAngle) * 0.5;
            }

            // Combinar direções: combate, fuga de balas e fuga da tempestade
            let totalWeight = 1;
            if (fleeDirection && threateningBullets.length > 0) {
                const fleeWeight = 0.4;
                const tacticalWeight = 0.6;
                moveX = moveX * tacticalWeight + fleeDirection.x * fleeWeight;
                moveY = moveY * tacticalWeight + fleeDirection.y * fleeWeight;
                totalWeight = 1;
            }

            // Se está perto da borda da tempestade, ajustar movimento para não sair
            if (stormDirection && stormDirection.urgency > 0.1) {
                const stormWeight = stormDirection.urgency * 0.3; // Peso baseado na urgência
                const currentWeight = 1 - stormWeight;
                moveX = moveX * currentWeight + stormDirection.x * stormWeight;
                moveY = moveY * currentWeight + stormDirection.y * stormWeight;

                // Normalizar
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                if (length > 0) {
                    moveX /= length;
                    moveY /= length;
                }
            }

            // Aplicar movimento
            if (moveX !== 0 || moveY !== 0) {
                this.move(moveX, moveY, walls);
            }

            // Limites do mapa
            const maxX = worldWidth || canvas.width;
            const maxY = worldHeight || canvas.height;
            this.x = Math.max(this.radius, Math.min(maxX - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(maxY - this.radius, this.y));

            // Atirar - permitir tiros de longa distância
            const now = Date.now();
            if (now - this.lastShotTime > this.shootCooldown && distance < this.detectionRange) {
                // Atirar quando está na distância ideal ou longa (mas não muito perto)
                if (distance >= this.fleeDistance) {
                    this.lastShotTime = now;
                    return this.shoot();
                }
            }
        } else {
            // Não há alvo - patrulhar/explorar o mapa
            const now = Date.now();

            // Se está fora da tempestade, priorizar entrar na zona segura
            if (stormDirection && stormDirection.urgency > 0.2) {
                // Alta urgência - mover diretamente para a zona segura
                this.move(stormDirection.x, stormDirection.y);
                this.pointTo(storm.centerX, storm.centerY);
            } else {
                // Mudar destino de patrulha periodicamente
                if (now - this.lastPatrolChange > this.patrolChangeInterval) {
                    this.lastPatrolChange = now;
                    this.patrolChangeInterval = 3000 + Math.random() * 2000;

                    // Escolher novo destino aleatório, mas dentro da zona segura se possível
                    const maxX = worldWidth || canvas.width;
                    const maxY = worldHeight || canvas.height;

                    if (storm && storm.radius > 100) {
                        // Tentar escolher destino dentro da zona segura
                        const angle = Math.random() * Math.PI * 2;
                        const radius = Math.random() * (storm.radius * 0.7);
                        this.patrolTarget = {
                            x: storm.centerX + Math.cos(angle) * radius,
                            y: storm.centerY + Math.sin(angle) * radius
                        };
                        // Garantir que está dentro dos limites do mapa
                        this.patrolTarget.x = Math.max(100, Math.min(maxX - 100, this.patrolTarget.x));
                        this.patrolTarget.y = Math.max(100, Math.min(maxY - 100, this.patrolTarget.y));
                    } else {
                        // Se a tempestade está muito pequena, escolher destino aleatório
                        this.patrolTarget = {
                            x: Math.random() * (maxX - 200) + 100,
                            y: Math.random() * (maxY - 200) + 100
                        };
                    }
                }

                // Mover em direção ao destino de patrulha
                const dx = this.patrolTarget.x - this.x;
                const dy = this.patrolTarget.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 30) {
                    // Ainda não chegou ao destino
                    let moveX = (dx / distance) * this.patrolSpeed;
                    let moveY = (dy / distance) * this.patrolSpeed;

                    // Se está perto da borda da tempestade, ajustar para não sair
                    if (stormDirection && stormDirection.urgency > 0.1) {
                        const stormWeight = stormDirection.urgency * 0.4;
                        const patrolWeight = 1 - stormWeight;
                        moveX = moveX * patrolWeight + stormDirection.x * stormWeight;
                        moveY = moveY * patrolWeight + stormDirection.y * stormWeight;
                        const length = Math.sqrt(moveX * moveX + moveY * moveY);
                        if (length > 0) {
                            moveX /= length;
                            moveY /= length;
                        }
                        moveX *= this.patrolSpeed;
                        moveY *= this.patrolSpeed;
                    }

                    this.move(moveX, moveY, walls);
                    this.pointTo(this.patrolTarget.x, this.patrolTarget.y);
                } else {
                    // Chegou ao destino, escolher novo destino imediatamente
                    this.lastPatrolChange = 0; // Força mudança no próximo frame
                }

                // Se há balas ameaçadoras, combinar patrulha com fuga
                if (fleeDirection && threateningBullets.length > 0) {
                    const fleeWeight = 0.6;
                    const patrolWeight = 0.3;
                    const stormWeight = stormDirection ? stormDirection.urgency * 0.1 : 0;
                    const totalWeight = fleeWeight + patrolWeight + stormWeight;

                    const patrolDx = dx / (distance || 1);
                    const patrolDy = dy / (distance || 1);

                    let combinedX = patrolDx * (patrolWeight / totalWeight) +
                        fleeDirection.x * (fleeWeight / totalWeight);
                    let combinedY = patrolDy * (patrolWeight / totalWeight) +
                        fleeDirection.y * (fleeWeight / totalWeight);

                    if (stormDirection && stormWeight > 0) {
                        combinedX += stormDirection.x * (stormWeight / totalWeight);
                        combinedY += stormDirection.y * (stormWeight / totalWeight);
                    }

                    const length = Math.sqrt(combinedX * combinedX + combinedY * combinedY);
                    if (length > 0) {
                        combinedX /= length;
                        combinedY /= length;
                        this.move(combinedX * this.patrolSpeed, combinedY * this.patrolSpeed);
                    }
                }
            }

            // Limites do mapa
            const maxX = worldWidth || canvas.width;
            const maxY = worldHeight || canvas.height;
            this.x = Math.max(this.radius, Math.min(maxX - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(maxY - this.radius, this.y));
        }

        return null;
    }

    shoot() {
        // Criar bala um pouco à frente do bot para evitar colisão imediata
        const offsetDistance = this.radius + 8; // Distância suficiente para sair do corpo do bot
        const startX = this.x + Math.cos(this.angle) * offsetDistance;
        const startY = this.y + Math.sin(this.angle) * offsetDistance;

        const bullet = new Bullet(
            startX,
            startY,
            Math.cos(this.angle) * 5,
            Math.sin(this.angle) * 5,
            '#ef4444',
            false
        );
        return bullet;
    }
}

class Bullet {
    constructor(x, y, vx, vy, color, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
        this.color = color;
        this.isPlayerBullet = isPlayerBullet;
        this.isAlive = true;
    }

    update(worldWidth = null, worldHeight = null) {
        this.x += this.vx;
        this.y += this.vy;

        // Remover se sair do mapa
        const maxX = worldWidth || canvas.width;
        const maxY = worldHeight || canvas.height;
        if (this.x < 0 || this.x > maxX || this.y < 0 || this.y > maxY) {
            this.isAlive = false;
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Brilho
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(entity) {
        if (!entity.isAlive) return false;

        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < entity.radius + this.radius;
    }
}

// ==================== OBJETOS DO MAPA ====================
class Bush {
    constructor(x, y, size = 80) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size / 2;
    }

    draw(ctx) {
        // Desenhar moita (círculo verde com textura)
        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 5, this.radius * 0.8, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo principal (verde escuro)
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3,
            this.y - this.radius * 0.3,
            0,
            this.x,
            this.y,
            this.radius
        );
        gradient.addColorStop(0, '#2d5016');
        gradient.addColorStop(0.5, '#3d7a1f');
        gradient.addColorStop(1, '#2d5016');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Detalhes (folhas menores)
        ctx.fillStyle = '#4a9b2a';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const offsetX = Math.cos(angle) * (this.radius * 0.4);
            const offsetY = Math.sin(angle) * (this.radius * 0.4);
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Destaques (folhas claras)
        ctx.fillStyle = '#5fb83d';
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const offsetX = Math.cos(angle) * (this.radius * 0.25);
            const offsetY = Math.sin(angle) * (this.radius * 0.25);
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius;
    }

    checkCollision(x, y, radius) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + radius;
    }
}

class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(this.x + 3, this.y + 3, this.width, this.height);

        // Corpo principal (cinza/bege)
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#8b7355');
        gradient.addColorStop(0.5, '#6b5d4f');
        gradient.addColorStop(1, '#5a4d42');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Borda superior (mais clara)
        ctx.strokeStyle = '#a68b6f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();

        // Detalhes (tijolos)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        // Linhas horizontais
        for (let i = 1; i < 3; i++) {
            const y = this.y + (this.height / 3) * i;
            ctx.beginPath();
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y);
            ctx.stroke();
        }

        // Linhas verticais (alternadas)
        for (let i = 0; i < 4; i++) {
            const x = this.x + (this.width / 4) * i;
            const offset = (i % 2 === 0) ? 0 : this.height / 6;
            ctx.beginPath();
            ctx.moveTo(x, this.y + offset);
            ctx.lineTo(x, this.y + this.height / 3 + offset);
            ctx.stroke();
        }

        ctx.restore();
    }

    checkCollision(x, y, radius) {
        // Verificar se um círculo colide com o retângulo
        const closestX = Math.max(this.x, Math.min(x, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(y, this.y + this.height));

        const dx = x - closestX;
        const dy = y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < radius;
    }

    checkLineCollision(x1, y1, x2, y2) {
        // Verificar se uma linha (tiro) colide com a parede
        // Algoritmo de interseção linha-retângulo
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        // Verificar se a linha cruza o retângulo
        const t0 = 0;
        const t1 = 1;

        const dx = x2 - x1;
        const dy = y2 - y1;

        let tmin = t0;
        let tmax = t1;

        for (let edge = 0; edge < 4; edge++) {
            let p, q;
            if (edge === 0) { p = -dx; q = x1 - left; }
            if (edge === 1) { p = dx; q = right - x1; }
            if (edge === 2) { p = -dy; q = y1 - top; }
            if (edge === 3) { p = dy; q = bottom - y1; }

            if (Math.abs(p) < 0.0001 && q < 0) return false;

            const r = q / p;
            if (p < 0) {
                if (r > tmax) return false;
                if (r > tmin) tmin = r;
            } else if (p > 0) {
                if (r < tmin) return false;
                if (r < tmax) tmax = r;
            }
        }

        return tmin <= tmax;
    }
}

// ==================== JOGO PRINCIPAL ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        this.player = null;
        this.bots = [];
        this.bullets = [];
        this.bushes = [];
        this.walls = [];
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastShotTime = 0;
        this.shootCooldown = 200; // 0.2 segundos
        this.isRunning = false;
        this.animationId = null;

        // Sistema de câmera
        this.camera = {
            x: 0,
            y: 0
        };

        // Tamanho do mundo (4x maior que a tela)
        this.worldWidth = 0;
        this.worldHeight = 0;

        // Sistema de tempestade (estilo Fortnite)
        this.storm = {
            centerX: 0,
            centerY: 0,
            radius: 0,
            maxRadius: 0,
            shrinkRate: 0.05, // Pixels por frame (muito mais lento)
            damagePerSecond: 2, // Dano por segundo fora da zona
            lastDamageTime: 0,
            damageInterval: 1000, // 1 segundo
            phase: 0 // Para animação
        };

        this.initControls();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Mundo 4x maior que a tela
        this.worldWidth = this.canvas.width * 4;
        this.worldHeight = this.canvas.height * 4;
    }

    initControls() {
        // Teclado
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', () => {
            this.shoot();
        });
    }

    start() {
        // Esconder tela de game over se estiver visível
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('active');
        }

        // Garantir que o canvas está no tamanho correto
        this.resizeCanvas();

        this.isRunning = true;
        // Player começa no centro do mundo
        this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
        this.bots = [];
        this.bullets = [];

        // Inicializar câmera no centro do mundo
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        // Inicializar tempestade
        this.storm.centerX = this.worldWidth / 2;
        this.storm.centerY = this.worldHeight / 2;
        // Começar com 80% do tamanho do mundo
        this.storm.maxRadius = Math.min(this.worldWidth, this.worldHeight) * 0.4;
        this.storm.radius = this.storm.maxRadius;
        this.storm.lastDamageTime = Date.now();
        this.storm.phase = 0;

        // Criar 20 bots em posições aleatórias no mundo
        for (let i = 0; i < 20; i++) {
            let x, y;
            do {
                x = Math.random() * (this.worldWidth - 100) + 50;
                y = Math.random() * (this.worldHeight - 100) + 50;
            } while (this.player.getDistanceTo({ x, y }) < 150);

            this.bots.push(new Bot(x, y));
        }

        // Criar moitas (bushes) no mapa
        this.bushes = [];
        const numBushes = 80;
        for (let i = 0; i < numBushes; i++) {
            let x, y;
            let attempts = 0;
            do {
                x = Math.random() * (this.worldWidth - 100) + 50;
                y = Math.random() * (this.worldHeight - 100) + 50;
                attempts++;
            } while (
                (this.player.getDistanceTo({ x, y }) < 100 ||
                    this.bushes.some(bush => {
                        const dx = bush.x - x;
                        const dy = bush.y - y;
                        return Math.sqrt(dx * dx + dy * dy) < 60;
                    })) && attempts < 50
            );

            if (attempts < 50) {
                const size = 80 + Math.random() * 40; // Moitas bem maiores
                this.bushes.push(new Bush(x, y, size));
            }
        }

        // Criar paredes no mapa
        this.walls = [];
        const numWalls = 60; // Mais paredes no mapa
        for (let i = 0; i < numWalls; i++) {
            let x, y, width, height;
            let attempts = 0;
            do {
                const isHorizontal = Math.random() > 0.5;
                if (isHorizontal) {
                    width = 80 + Math.random() * 120;
                    height = 20 + Math.random() * 15;
                } else {
                    width = 20 + Math.random() * 15;
                    height = 80 + Math.random() * 120;
                }
                x = Math.random() * (this.worldWidth - width - 100) + 50;
                y = Math.random() * (this.worldHeight - height - 100) + 50;
                attempts++;
            } while (
                (this.player.getDistanceTo({ x: x + width / 2, y: y + height / 2 }) < 100 ||
                    this.walls.some(wall => {
                        // Verificar sobreposição com outras paredes
                        return !(x + width < wall.x || x > wall.x + wall.width ||
                            y + height < wall.y || y > wall.y + wall.height);
                    }) ||
                    this.bushes.some(bush => {
                        // Verificar sobreposição com moitas
                        return bush.checkCollision(x + width / 2, y + height / 2, Math.max(width, height) / 2);
                    })) && attempts < 50
            );

            if (attempts < 50) {
                this.walls.push(new Wall(x, y, width, height));
            }
        }

        this.updateUI();
        this.gameLoop();
    }

    shoot() {
        if (!this.player.isAlive) return;

        const now = Date.now();
        if (now - this.lastShotTime < this.shootCooldown) return;

        this.lastShotTime = now;

        // Criar bala um pouco à frente do player para evitar colisão imediata
        const offsetDistance = this.player.radius + 8;
        const startX = this.player.x + Math.cos(this.player.angle) * offsetDistance;
        const startY = this.player.y + Math.sin(this.player.angle) * offsetDistance;

        const bullet = new Bullet(
            startX,
            startY,
            Math.cos(this.player.angle) * 8,
            Math.sin(this.player.angle) * 8,
            '#667eea',
            true
        );

        this.bullets.push(bullet);
    }

    update() {
        if (!this.isRunning) return;

        // Converter posição do mouse para coordenadas do mundo
        const worldMouseX = this.mouseX + this.camera.x;
        const worldMouseY = this.mouseY + this.camera.y;

        // Atualizar player
        this.player.update(worldMouseX, worldMouseY, this.keys, this.walls);

        // Limites do mapa para o player
        this.player.x = Math.max(this.player.radius, Math.min(this.worldWidth - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.worldHeight - this.player.radius, this.player.y));

        // Atualizar câmera para seguir o player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        // Limitar câmera aos limites do mundo
        this.camera.x = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.worldHeight - this.canvas.height, this.camera.y));

        // Atualizar tempestade
        this.updateStorm();

        // Atualizar bots (passar informações da tempestade, paredes e moitas)
        this.bots.forEach(bot => {
            const bullet = bot.update(this.player, this.bots, this.bullets, this.worldWidth, this.worldHeight, this.storm, this.walls, this.bushes);
            if (bullet) {
                this.bullets.push(bullet);
            }
        });

        // Atualizar balas e verificar colisão com paredes
        this.bullets.forEach(bullet => {
            if (!bullet.isAlive) return;

            const oldX = bullet.x;
            const oldY = bullet.y;
            bullet.update(this.worldWidth, this.worldHeight);

            // Verificar colisão com paredes
            if (bullet.isAlive) {
                for (const wall of this.walls) {
                    if (wall.checkLineCollision(oldX, oldY, bullet.x, bullet.y)) {
                        bullet.isAlive = false;
                        break;
                    }
                }
            }
        });
        this.bullets = this.bullets.filter(bullet => bullet.isAlive);

        // Colisões: balas do player vs bots
        this.bullets.forEach((bullet, bulletIndex) => {
            if (!bullet.isPlayerBullet) return;

            this.bots.forEach(bot => {
                if (bullet.checkCollision(bot)) {
                    bot.takeDamage(10);
                    bullet.isAlive = false;
                }
            });
        });

        // Colisões: balas dos bots vs player
        this.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.isPlayerBullet) return;

            if (bullet.checkCollision(this.player)) {
                this.player.takeDamage(10);
                bullet.isAlive = false;
            }
        });

        // Colisões: balas dos bots vs outros bots
        this.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.isPlayerBullet) return;

            this.bots.forEach(bot => {
                if (bullet.checkCollision(bot)) {
                    bot.takeDamage(10);
                    bullet.isAlive = false;
                }
            });
        });

        // Verificar condições de vitória/derrota
        const aliveBots = this.bots.filter(bot => bot.isAlive).length;

        if (!this.player.isAlive) {
            this.endGame(false);
        } else if (aliveBots === 0) {
            this.endGame(true);
        }

        this.updateUI();
    }

    updateUI() {
        if (!this.player) return;

        document.getElementById('player-health').textContent = Math.max(0, Math.ceil(this.player.health));
        document.getElementById('player-max-health').textContent = Math.ceil(this.player.maxHealth);

        const healthPercent = this.player.health / this.player.maxHealth;
        document.getElementById('health-bar-fill').style.width = `${healthPercent * 100}%`;

        const aliveBots = this.bots.filter(bot => bot.isAlive).length;
        document.getElementById('enemies-remaining').textContent = aliveBots;
    }

    updateStorm() {
        // Encolher a tempestade gradualmente
        if (this.storm.radius > 200) {
            this.storm.radius -= this.storm.shrinkRate;
        }

        // Atualizar fase para animação
        this.storm.phase += 0.05;

        // Verificar dano da tempestade
        const now = Date.now();
        if (now - this.storm.lastDamageTime >= this.storm.damageInterval) {
            this.storm.lastDamageTime = now;

            // Verificar player
            if (this.player && this.player.isAlive) {
                const dx = this.player.x - this.storm.centerX;
                const dy = this.player.y - this.storm.centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.storm.radius) {
                    this.player.takeDamage(this.storm.damagePerSecond);
                }
            }

            // Verificar bots
            this.bots.forEach(bot => {
                if (bot.isAlive) {
                    const dx = bot.x - this.storm.centerX;
                    const dy = bot.y - this.storm.centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > this.storm.radius) {
                        bot.takeDamage(this.storm.damagePerSecond);
                    }
                }
            });
        }
    }

    isInSafeZone(x, y) {
        const dx = x - this.storm.centerX;
        const dy = y - this.storm.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.storm.radius;
    }

    draw() {
        // Limpar canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Aplicar transformação da câmera
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Grade de fundo (no mundo)
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.canvas.width + gridSize;
        const endY = startY + this.canvas.height + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }

        // Desenhar tempestade
        this.drawStorm();

        // Desenhar paredes
        this.walls.forEach(wall => wall.draw(this.ctx));

        // Desenhar moitas
        this.bushes.forEach(bush => bush.draw(this.ctx));

        // Desenhar entidades (com sistema de visibilidade para moitas)
        // Verificar quais entidades estão dentro de moitas
        const entitiesInBushes = new Set();

        if (this.player && this.player.isAlive) {
            this.bushes.forEach(bush => {
                if (bush.contains(this.player.x, this.player.y)) {
                    entitiesInBushes.add(this.player);
                }
            });
        }

        this.bots.forEach(bot => {
            if (bot.isAlive) {
                this.bushes.forEach(bush => {
                    if (bush.contains(bot.x, bot.y)) {
                        entitiesInBushes.add(bot);
                    }
                });
            }
        });

        // Desenhar entidades que não estão em moitas
        if (this.player && this.player.isAlive && !entitiesInBushes.has(this.player)) {
            this.player.draw(this.ctx);
        }

        this.bots.forEach(bot => {
            if (bot.isAlive && !entitiesInBushes.has(bot)) {
                bot.draw(this.ctx);
            }
        });

        // Desenhar balas
        this.bullets.forEach(bullet => bullet.draw(this.ctx));

        // Desenhar entidades que estão em moitas (mais transparentes)
        this.ctx.globalAlpha = 0.3;
        if (this.player && this.player.isAlive && entitiesInBushes.has(this.player)) {
            this.player.draw(this.ctx);
        }

        this.bots.forEach(bot => {
            if (bot.isAlive && entitiesInBushes.has(bot)) {
                bot.draw(this.ctx);
            }
        });
        this.ctx.globalAlpha = 1.0;

        // Restaurar transformação
        this.ctx.restore();
    }

    drawStorm() {
        // Desenhar área da tempestade (fora da zona segura)
        // Criar gradiente para efeito de tempestade
        const gradient = this.ctx.createRadialGradient(
            this.storm.centerX,
            this.storm.centerY,
            this.storm.radius,
            this.storm.centerX,
            this.storm.centerY,
            this.storm.radius + 500
        );

        gradient.addColorStop(0, 'rgba(139, 69, 19, 0)'); // Transparente na borda da zona
        gradient.addColorStop(0.3, 'rgba(139, 69, 19, 0.3)'); // Marrom claro
        gradient.addColorStop(0.6, 'rgba(75, 0, 130, 0.5)'); // Roxo
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0.7)'); // Vermelho escuro

        // Desenhar círculo externo da tempestade
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(
            this.storm.centerX,
            this.storm.centerY,
            this.storm.radius + 1000,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Desenhar borda da zona segura (com animação)
        const borderThickness = 5;
        const pulse = Math.sin(this.storm.phase) * 2;

        // Borda externa (vermelha/roxa)
        this.ctx.strokeStyle = `rgba(139, 0, 0, ${0.8 + Math.sin(this.storm.phase * 2) * 0.2})`;
        this.ctx.lineWidth = borderThickness + pulse;
        this.ctx.beginPath();
        this.ctx.arc(
            this.storm.centerX,
            this.storm.centerY,
            this.storm.radius,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        // Borda interna (branca/azul clara) - zona segura
        this.ctx.strokeStyle = `rgba(102, 126, 234, ${0.6 + Math.sin(this.storm.phase * 3) * 0.4})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            this.storm.centerX,
            this.storm.centerY,
            this.storm.radius - borderThickness,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        // Efeito de partículas na borda (pontos brilhantes)
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + this.storm.phase;
            const x = this.storm.centerX + Math.cos(angle) * this.storm.radius;
            const y = this.storm.centerY + Math.sin(angle) * this.storm.radius;

            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(this.storm.phase * 5 + i) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    endGame(victory) {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const gameOverScreen = document.getElementById('game-over-screen');
        const gameOverTitle = document.getElementById('game-over-title');
        const gameOverMessage = document.getElementById('game-over-message');
        const victoryReward = document.getElementById('victory-reward');
        const rewardAmount = document.getElementById('reward-amount');

        gameOverScreen.classList.add('active');

        if (victory) {
            gameOverTitle.textContent = 'Vitória!';
            gameOverTitle.style.color = '#10b981';
            gameOverMessage.textContent = 'Parabéns! Você eliminou todos os inimigos!';
            victoryReward.style.display = 'block';

            // Adicionar moedas
            GameData.addCoins(20);
            rewardAmount.textContent = '20';
        } else {
            gameOverTitle.textContent = 'Derrota';
            gameOverTitle.style.color = '#ef4444';
            gameOverMessage.textContent = 'Você foi eliminado! Tente novamente.';
            victoryReward.style.display = 'none';
        }
    }
}

// ==================== INICIALIZAÇÃO ====================
const screenManager = new ScreenManager();
const shop = new Shop();
const game = new Game();

// Variável global para o canvas (usada em algumas classes)
const canvas = game.canvas;
