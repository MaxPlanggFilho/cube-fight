/*************************
 * SAVE / PROGRESS
 *************************/
const DEFAULT_SAVE = {
    coins: 100,
    upgrades: {
        maxHealth: 100,
        speed: 200
    },
    stats: {
        gamesPlayed: 0,
        deaths: 0
    }
};

const SAVE_KEY = 'battleRoyale2D_save';

function loadProgress() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(DEFAULT_SAVE));
        return structuredClone(DEFAULT_SAVE);
    }
    return JSON.parse(data);
}

function saveProgress(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

let playerData = loadProgress();

/*************************
 * LOBBY SCENE
 *************************/
class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    preload() {
        this.load.image('lobbyBg', 'assets/lobby-bg.jpg');
    }

    create() {
        const { width, height } = this.scale;

        // Background (cover)
        const bg = this.add.image(width / 2, height / 2, 'lobbyBg');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setDepth(-2);

        // Overlay escuro
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35)
            .setDepth(-1);

        const cx = width / 2;
        const cy = height / 2;

        this.add.text(cx, cy - 120, 'CUBE FIGHT', {
            font: '48px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(cx, cy - 70, `Moedas: ${playerData.coins}`, {
            font: '20px Arial',
            fill: '#ffff00'
        }).setOrigin(0.5);

        const startBtn = this.add.text(cx, cy, 'Começar', {
            font: '28px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 30, y: 15 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        const shopBtn = this.add.text(cx, cy + 80, 'Loja', {
            font: '24px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 30, y: 12 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        shopBtn.on('pointerdown', () => {
            this.scene.start('ShopScene');
        });
    }
}

/*************************
 * SHOP SCENE
 *************************/
class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#222');

        const cx = this.scale.width / 2;

        this.add.text(cx, 60, 'Loja', {
            font: '40px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const coinsText = this.add.text(cx, 110, `Moedas: ${playerData.coins}`, {
            font: '20px Arial',
            fill: '#ffff00'
        }).setOrigin(0.5);

        this.createItem(cx, 180, 'Vida +20', 30, () => {
            if (playerData.coins >= 30) {
                playerData.coins -= 30;
                playerData.upgrades.maxHealth += 20;
                saveProgress(playerData);
                coinsText.setText(`Moedas: ${playerData.coins}`);
            }
        });

        this.createItem(cx, 260, 'Velocidade +20', 40, () => {
            if (playerData.coins >= 40) {
                playerData.coins -= 40;
                playerData.upgrades.speed += 20;
                saveProgress(playerData);
                coinsText.setText(`Moedas: ${playerData.coins}`);
            }
        });

        const backBtn = this.add.text(cx, this.scale.height - 80, 'Voltar', {
            font: '24px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 25, y: 12 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });
    }

    createItem(x, y, title, price, onBuy) {
        this.add.text(x, y, title, {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const btn = this.add.text(x, y + 35, `Custo: ${price} | Comprar`, {
            font: '18px Arial',
            fill: '#ffffff',
            backgroundColor: '#444',
            padding: { x: 20, y: 8 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btn.on('pointerdown', onBuy);
    }
}

/*************************
 * GAME SCENE
 *************************/
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        preload.call(this);
    }

    create() {
        gameOver = false;
        gameWon = false;
        create.call(this);
    }

    update(time, delta) {
        update.call(this, time, delta);
    }
}

/*************************
 * PHASER CONFIG
 *************************/
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [LobbyScene, ShopScene, GameScene]
};

new Phaser.Game(config);

/*************************
 * GAME LOGIC
 *************************/
let player, cursors, bullets, bots, zone, zoneGraphics;
let healthText, infoText;
let lastFired = 0;
let gameOver = false;
let gameWon = false;

function preload() { }

function create() {
    this.cameras.main.setBackgroundColor('#87CEEB');
    createTextures(this);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    player = this.physics.add.sprite(cx, cy, 'player');
    player.setCollideWorldBounds(true);
    player.health = playerData.upgrades.maxHealth;

    cursors = this.input.keyboard.addKeys('W,A,S,D');
    bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });

    this.input.on('pointerdown', (p) => {
        shoot(this, p.worldX, p.worldY);
    });

    bots = this.physics.add.group();
    for (let i = 0; i < 10; i++) {
        const b = bots.create(
            Phaser.Math.Between(50, this.scale.width - 50),
            Phaser.Math.Between(50, this.scale.height - 50),
            'bot'
        );
        b.health = 100;
        b.setVelocity(
            Phaser.Math.Between(-100, 100),
            Phaser.Math.Between(-100, 100)
        );
        b.setBounce(1);
        b.setCollideWorldBounds(true);
    }

    this.physics.add.overlap(bullets, bots, (bullet, bot) => {
        bullet.destroy();
        bot.health -= 20;
        if (bot.health <= 0) bot.destroy();
    });

    zone = {
        x: cx,
        y: cy,
        radius: Math.min(cx, cy) * 0.9
    };
    zoneGraphics = this.add.graphics();

    healthText = this.add.text(10, 10, '', { font: '16px Arial', fill: '#000' });
    infoText = this.add.text(10, 30, '', { font: '16px Arial', fill: '#000' });
}

function update(time, delta) {
    if (gameOver || gameWon) {
        player.setVelocity(0);
        return;
    }

    const speed = playerData.upgrades.speed;
    player.setVelocity(0);
    if (cursors.A.isDown) player.setVelocityX(-speed);
    if (cursors.D.isDown) player.setVelocityX(speed);
    if (cursors.W.isDown) player.setVelocityY(-speed);
    if (cursors.S.isDown) player.setVelocityY(speed);

    healthText.setText(`Vida: ${Math.floor(player.health)}`);
    infoText.setText(`Bots: ${bots.getLength()}`);

    if (bots.getLength() === 0 && !gameWon) {
        gameWon = true;
        playerData.coins += 30;
        saveProgress(playerData);
        showEndScreen(this, 'Você venceu!', '#00aa00');
    }

    if (player.health <= 0 && !gameOver) {
        gameOver = true;
        playerData.stats.deaths++;
        saveProgress(playerData);
        showEndScreen(this, 'Você foi eliminado', '#ff0000');
    }
}

function showEndScreen(scene, text, color) {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;

    scene.add.text(cx, cy - 40, text, {
        font: '36px Arial',
        fill: color
    }).setOrigin(0.5);

    const btn = scene.add.text(cx, cy + 20, 'Reiniciar', {
        font: '24px Arial',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 25, y: 12 }
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
        scene.scene.start('LobbyScene');
    });
}

function createTextures(scene) {
    const g = scene.add.graphics();

    g.fillStyle(0x0033cc).fillRect(0, 0, 28, 28);
    g.generateTexture('player', 28, 28);
    g.clear();

    g.fillStyle(0xcc0000).fillRect(0, 0, 24, 24);
    g.generateTexture('bot', 24, 24);
    g.clear();

    g.fillStyle(0xffff66).fillRect(0, 0, 6, 6);
    g.generateTexture('bullet', 6, 6);
    g.destroy();
}

function shoot(scene, x, y) {
    const now = scene.time.now;
    if (now - lastFired < 200) return;
    lastFired = now;

    const b = bullets.create(player.x, player.y, 'bullet');
    scene.physics.moveTo(b, x, y, 500);
}
