const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,

    parent: 'game-container',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    pixelArt: true,
    backgroundColor: '#00112b',

    scene: {
        preload,
        create,
        update
    }
};

new Phaser.Game(config);

const MOVE_SPEED = 300;
const SHIP_START_X = 400;
const SHIP_START_Y = 400;

// =====================================
// LOAD IMAGES
// =====================================

function preload() {
    this.load.image('ship', 'SHIP.png');
    this.load.image('background', 'Background.png');
    this.load.image('meteor', 'Meteor.png');
}

// =====================================
// CREATE GAME
// =====================================

function create() {

    // Background
    this.add.image(400, 300, 'background')
        .setDisplaySize(400, 600)
        .setDepth(0);

    // Spaceship
    this.ship = this.add.image(
        SHIP_START_X,
        SHIP_START_Y,
        'ship'
    ).setScale(2).setDepth(5);

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    this.spaceKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Score, lives and level
    this.score = 0;
    this.lives = 3;
    this.level = 1;

    // Timer
    this.startTime = this.time.now;

    this.timerText = this.add.text(330, 16, 'Time: 00:00', {
        fontSize: '25px',
        color: '#ffffff'
    }).setDepth(20);

    // HUD
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '25px',
        color: '#ffffff'
    }).setDepth(20);

    this.livesText = this.add.text(16, 52, 'Lives: 3', {
        fontSize: '25px',
        color: '#ffffff'
    }).setDepth(20);

    this.levelText = this.add.text(650, 16, 'Level: 1', {
        fontSize: '25px',
        color: '#ffffff'
    }).setDepth(20);

    // Meteor storage
    this.meteors = [];

    // Collision protection
    this.invulnerableUntil = 0;

    // Gravity settings
    this.lastMovementTime = 0;
    this.gravitySpeed = 120;
    this.isFalling = false;

    // Game state
    this.gameOver = false;

    // Spawn first meteor
    spawnMeteor.call(this);

    // Start meteor spawning
    startMeteorTimer.call(this);
}

// =====================================
// METEOR SPAWNING TIMER
// =====================================

function startMeteorTimer() {

    if (this.meteorTimer) {
        this.meteorTimer.remove();
    }

    const spawnDelay = Math.max(
        1200,
        3500 - (this.level - 1) * 500
    );

    this.meteorTimer = this.time.addEvent({
        delay: spawnDelay,
        callback: spawnMeteor,
        callbackScope: this,
        loop: true
    });
}

// =====================================
// UPDATE GAME
// =====================================

function update(time, delta) {

    if (this.gameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.restart();
        }
        return;
    }

    // Survival timer
    const elapsedSeconds = Math.floor(
        (time - this.startTime) / 1000
    );

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    this.timerText.setText(
        'Time: ' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0')
    );

    const movement = MOVE_SPEED * delta / 1000;

    // Check movement
    const isMoving =
        this.cursors.left.isDown ||
        this.cursors.right.isDown ||
        this.cursors.up.isDown ||
        this.cursors.down.isDown;

    // Spaceship movement
    if (this.cursors.left.isDown) {
        this.ship.x -= movement;
    }

    if (this.cursors.right.isDown) {
        this.ship.x += movement;
    }

    if (this.cursors.up.isDown) {
        this.ship.y -= movement;
    }

    if (this.cursors.down.isDown) {
        this.ship.y += movement;
    }

    // Reset gravity timer
    if (isMoving) {
        this.lastMovementTime = time;
        this.isFalling = false;
    }

    // Gravity after 5 seconds
    else if (time - this.lastMovementTime >= 5000) {
        this.isFalling = true;
    }

    // Apply gravity
    if (this.isFalling) {
        this.ship.y += this.gravitySpeed * delta / 1000;
    }

    // Keep spaceship inside playing area
    this.ship.x = Phaser.Math.Clamp(this.ship.x, 200, 600);
    this.ship.y = Phaser.Math.Clamp(this.ship.y, 30, 540);

    // Collision protection
    const protectedNow = time < this.invulnerableUntil;

    if (protectedNow) {
        this.ship.setTint(0xff5555);
        this.ship.setAlpha(
            Math.floor(time / 150) % 2 === 0 ? 0.5 : 1
        );
    } else {
        this.ship.clearTint();
        this.ship.setAlpha(1);
    }

    // Update meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {

        const meteor = this.meteors[i];

        meteor.x += meteor.drift * delta / 1000;
        meteor.y += meteor.speed * delta / 1000;

        // Collision detection
        const dx = this.ship.x - meteor.x;
        const dy = this.ship.y - meteor.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const collisionDistance =
            Math.min(this.ship.displayWidth, this.ship.displayHeight) * 0.22 +
            Math.min(meteor.displayWidth, meteor.displayHeight) * 0.25;

        if (
            !protectedNow &&
            distance < collisionDistance
        ) {
            meteor.destroy();
            this.meteors.splice(i, 1);

            loseLife.call(this, time);
            continue;
        }

        // Meteor passes bottom
        if (meteor.y > 650) {

            meteor.destroy();
            this.meteors.splice(i, 1);

            this.score++;

            this.scoreText.setText(
                'Score: ' + this.score
            );

            updateLevel.call(this);
        }
    }
}

// =====================================
// LEVEL SYSTEM
// =====================================

function updateLevel() {

    const newLevel = Math.floor(this.score / 10) + 1;

    if (newLevel > this.level) {

        this.level = newLevel;

        this.levelText.setText(
            'Level: ' + this.level
        );

        startMeteorTimer.call(this);

        const announcement = this.add.text(
            400,
            200,
            'LEVEL ' + this.level + '!',
            {
                fontSize: '48px',
                color: '#00ffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(30);

        this.time.delayedCall(1500, function() {
            announcement.destroy();
        });
    }
}

// =====================================
// SPAWN METEORS
// =====================================

function spawnMeteor() {

    if (this.gameOver) return;

    let x;

    // 75% chance: spawn near spaceship
    if (Math.random() < 0.75) {

        x = Phaser.Math.Clamp(
            this.ship.x + Phaser.Math.Between(-120, 120),
            220,
            580
        );

    } else {

        // 25% chance: random position
        x = Phaser.Math.Between(220, 580);
    }

    const meteor = this.add.image(x, -50, 'meteor');

    meteor.setScale(0.12);
    meteor.setDepth(4);

    // Speed increases with every level
    const levelBonus = this.level - 1;

    const minSpeed = 60 + (levelBonus * 25);
    const maxSpeed = 90 + (levelBonus * 30);

    meteor.speed = Phaser.Math.Between(
        minSpeed,
        maxSpeed
    );

    meteor.drift = Phaser.Math.Between(-10, 10);

    this.meteors.push(meteor);
}

// =====================================
// LOSE LIFE
// =====================================

function loseLife(time) {

    this.lives--;

    this.livesText.setText(
        'Lives: ' + this.lives
    );

    // 2.5 seconds protection
    this.invulnerableUntil = time + 2500;

    // Reset spaceship
    this.ship.setPosition(
        SHIP_START_X,
        SHIP_START_Y
    );

    // Reset gravity timer
    this.lastMovementTime = time;
    this.isFalling = false;

    if (this.lives <= 0) {
        endGame.call(this);
    }
}

// =====================================
// GAME OVER
// =====================================

function endGame() {

    this.gameOver = true;

    // Stop meteor spawning
    this.meteorTimer.remove();

    // Remove remaining meteors
    this.meteors.forEach(function(meteor) {
        meteor.destroy();
    });

    this.meteors = [];

    this.ship.setAlpha(1);
    this.ship.clearTint();

    // Game Over screen
    this.add.text(400, 210, 'GAME OVER', {
        fontSize: '55px',
        color: '#ff3333',
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(30);

    this.add.text(400, 285, 'Final Score: ' + this.score, {
        fontSize: '30px',
        color: '#ffffff'
    }).setOrigin(0.5).setDepth(30);

    this.add.text(400, 335, 'Level Reached: ' + this.level, {
        fontSize: '26px',
        color: '#00ffff'
    }).setOrigin(0.5).setDepth(30);

    this.add.text(400, 380, 'Survival Time: ' + this.timerText.text.replace('Time: ', ''), {
        fontSize: '25px',
        color: '#ffffff'
    }).setOrigin(0.5).setDepth(30);

    this.add.text(400, 430, 'Press SPACE to Restart', {
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5).setDepth(30);
}