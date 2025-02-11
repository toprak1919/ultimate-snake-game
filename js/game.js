const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gridSize = 20;
let tileCountX = 0;
let tileCountY = 0;

let snake = [
    { x: 10, y: 10 }
];
let food = { x: 15, y: 15 };
let specialFood = null;
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = 100;
let gameLoop;
let reverseControls = false;

// Boss and Enemy properties
const boss = {
    health: 100,
    maxHealth: 100,
    spawnInterval: 5000,
    lastSpawn: 0,
    difficulty: 1
};

let enemies = [];
const maxEnemies = 5;
const enemyTypes = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

// Special food types
const specialFoodTypes = {
    DAMAGE_BOSS: {
        color: '#ff00ff',
        effect: 'damage-boss',
        damage: 20,
        duration: 5000
    },
    CLEAR_ENEMIES: {
        color: '#00ffff',
        effect: 'clear-enemies',
        duration: 3000
    }
};

// Timers for effects
let activeEffects = new Map();

let snakeSizeReduction = 3;

// Initialize enemy with all required properties
const enemy = {
    x: canvas.width / gridSize, // Start at right edge
    y: Math.floor(Math.random() * (canvas.height / gridSize)),
    projectiles: [],
    lastShot: 0,
    shootingInterval: 1000,
    width: gridSize,
    height: gridSize,
    color: 'red',
    movePattern: function() {
        // Removed movement logic since enemies are now stationary
    }
};

document.getElementById('highScore').textContent = highScore;

// Add speed display and food spawn text
const UI_TEXT = {
    position: { x: 10, y: canvas.height - 10 },
    font: '16px Arial',
    color: '#fff'
};

// Add food spawn timer - Move this up with other initializations
let lastSpecialFoodSpawn = Date.now();

// Game configuration
const CONFIG = {
    INITIAL_SPEED: 150,      // Faster snake movement (3-4× faster)
    MIN_SPEED: 600,
    SPEED_INCREASE: 2,
    FOOD_SCORE: 10,
    SPECIAL_FOOD_CHANCE: 0.3,
    SPECIAL_FOOD_INTERVAL: 15000, // Special food spawns every 15 seconds
    SPECIAL_FOOD_DURATION: 10000, // Special food stays for 10 seconds
    MOVEMENT_DELAY: 50
};

// Special food duration timers (in milliseconds)
const EFFECT_DURATIONS = {
    SPEED_BOOST: 5000,
    REVERSE_CONTROLS: 8000,
    INVINCIBILITY: 4000
};

// Add visual settings for enemies
const VISUAL_SETTINGS = {
    ENEMY_GLOW: {
        color: 'rgba(255, 0, 0, 0.3)',
        size: 30
    },
    ENEMY_PULSE: {
        min: 0.8,
        max: 1.2,
        speed: 0.02
    }
};

// Add these constants near the top of your file
const BASE_MOVES_PER_SECOND = 6;

class Game {
    constructor() {
        this.particles = [];
        this.trailPoints = [];
        this.hue = 0;
    }

    createParticles(x, y) {
        for (let i = 0; i < 5; i++) { // Reduced particle count
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1,
                hue: this.hue
            });
        }
    }

    drawTrail() {
        ctx.lineWidth = 2;
        this.trailPoints.forEach((point, i) => {
            const alpha = 1 - (i / this.trailPoints.length);
            const hue = (this.hue + i * 2) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            ctx.fillRect(point.x + gridSize * 0.25, point.y + gridSize * 0.25, gridSize * 0.5, gridSize * 0.5);
        });
    }

    update() {
        this.hue = (this.hue + 0.5) % 360;
        this.trailPoints.unshift({ x: snake[0].x * gridSize, y: snake[0].y * gridSize });
        if (this.trailPoints.length > 10) this.trailPoints.pop(); // Reduced trail length

        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            return p.life > 0;
        });

        this.draw();
    }

    draw() {
        clearCanvas();
        drawSnake();
        drawFood();
        this.drawTrail();
        
        // Fix enemy drawing and projectiles
        if (enemy) {
            drawEnemy(enemy);
            moveProjectiles();
            drawProjectiles();
        }
        if (enemies.length > 0) {
            enemies.forEach(e => {
                if (e) drawEnemy(e);
            });
        }

        this.particles.forEach(p => {
            ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        const foodGlow = Math.sin(Date.now() / 200) * 10 + 20;
        ctx.shadowBlur = foodGlow;
        ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
    }
}

// Move drawProjectiles function definition before it's used
// Updated drawProjectiles function with better visibility
function drawProjectiles() {
    ctx.fillStyle = '#ffff00';  // Bright yellow
    ctx.shadowBlur = 10;        // Add glow effect
    ctx.shadowColor = '#ff0';   // Yellow glow

    enemies.forEach(enemy => {
        if (enemy && enemy.projectiles) {
            enemy.projectiles.forEach(projectile => {
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    });

    ctx.shadowBlur = 0;  // Reset shadow effect
}

const game = new Game();

// Add this near other class definitions
class EnemyVisuals {
    constructor() {
        this.pulseValue = 0;
    }

    updatePulse() {
        this.pulseValue += VISUAL_SETTINGS.ENEMY_PULSE.speed;
        return Math.sin(this.pulseValue) * 
            (VISUAL_SETTINGS.ENEMY_PULSE.max - VISUAL_SETTINGS.ENEMY_PULSE.min) + 
            VISUAL_SETTINGS.ENEMY_PULSE.min;
    }
}

const enemyVisuals = new EnemyVisuals();

// Main game loop
function drawGame() {
    if (!game) return;
    
    game.update();
    moveSnake();
    moveEnemies();  // NEW: update enemy positions
    
    // Check for collisions and game over conditions
    if (checkGameOver() || checkEnemyCollision()) {
        cancelAnimationFrame(gameLoop);
        return;
    }
    
    checkFoodCollision();
    updateSpecialFoodSpawn(); // New function
    
    // Update enemies and projectiles
    updateEnemies();
    updateProjectiles();
    updateBoss();
    
    // Draw UI elements
    updateBossHealthBar();
    drawEffectTimers();
    updateUI(); // Add this at the end before requestAnimationFrame
    
    requestAnimationFrame(drawGame);
}

// NEW: Draw the game outer box on canvas
function drawGameBox() {
    ctx.strokeStyle = '#ffe66d'; // accent color
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGameBox(); // Draw outer box after clearing canvas
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? '#fff' : `hsl(${(game.hue + index * 10) % 360}, 100%, 50%)`;
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    });
}

function drawFood() {
    if (specialFood) {
        ctx.fillStyle = specialFood.color;
        const x = specialFood.x * gridSize;
        const y = specialFood.y * gridSize;
        ctx.beginPath();
        ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#f00'; // Simple red
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    ctx.beginPath();
    ctx.arc(x + gridSize/2, y + gridSize/2, gridSize/2 - 1, 0, Math.PI * 2);
    ctx.fill();
}

// Add movement timestamp tracking
let lastMoveTime = 0;

// Update moveSnake function with speed control
function moveSnake() {
    const now = Date.now();
    if (now - lastMoveTime < gameSpeed) {
        return; // Skip movement if not enough time has passed
    }
    
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    if (!checkFoodCollision()) {
        snake.pop();
    }
    
    lastMoveTime = now;
}

// Update checkFoodCollision to handle separate food types
function checkFoodCollision() {
    let foodEaten = false;
    
    // Normal food collision
    if (snake[0].x === food.x && snake[0].y === food.y) {
        generateFood();
        increaseScore();
        game.createParticles(food.x * gridSize, food.y * gridSize);
        foodEaten = true;
    }

    // Special food collision (independent of normal food)
    if (specialFood && snake[0].x === specialFood.x && snake[0].y === specialFood.y) {
        applySpecialFoodEffect(specialFood.type);
        game.createParticles(specialFood.x * gridSize, specialFood.y * gridSize);
        specialFood = null;
        lastSpecialFoodSpawn = Date.now(); // Reset special food timer
    }

    return foodEaten;
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
    };
    
    // Prevent food from spawning on snake
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        generateFood();
    }
}

// Update special food generation
function generateSpecialFood() {
    const type = Math.random() < 0.3 ? specialFoodTypes.DAMAGE_BOSS : specialFoodTypes.CLEAR_ENEMIES;
    specialFood = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY),
        type: type.effect,
        color: type.color,
        duration: type.duration,
        spawnTime: Date.now()
    };
}

function applySpecialFoodEffect(type) {
    if (type === 'damage-boss') {
        boss.health -= specialFoodTypes.DAMAGE_BOSS.damage;
        if (boss.health <= 0) {
            handleBossDefeat();
        }
        updateBossHealthBar();
        activeEffects.set('damage-boss', Date.now() + specialFoodTypes.DAMAGE_BOSS.duration);
    } else if (type === 'clear-enemies') {
        enemies = [];
        activeEffects.set('clear-enemies', Date.now() + specialFoodTypes.CLEAR_ENEMIES.duration);
    }
}

function checkGameOver() {
    const head = snake[0];
    
    if (
        head.x < 0 || head.x >= tileCountX ||
        head.y < 0 || head.y >= tileCountY ||
        snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)
    ) {
        handleGameOver();
        return true;
    }
    return false;
}

function handleGameOver() {
    clearInterval(gameLoop);
    document.getElementById('gameOver').classList.remove('hidden');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highScoreDisplay').textContent = highScore;
    }
}

// Update increaseScore function
function increaseScore() {
    score += CONFIG.FOOD_SCORE;
    document.getElementById('scoreDisplay').textContent = score;
    
    // Slower speed increase every 50 points
    if (score % 50 === 0) {
        gameSpeed = Math.max(CONFIG.MIN_SPEED, gameSpeed - CONFIG.SPEED_INCREASE);
    }
}

// Update resetGame to initialize timers
function resetGame() {
    snake = [{ x: 10, y: 10 }];
    food = { x: 15, y: 15 };
    specialFood = null;
    dx = 0;
    dy = 0;
    score = 0;
    
    // Reset timers and speed
    gameSpeed = CONFIG.INITIAL_SPEED;
    lastMoveTime = Date.now();
    lastSpecialFoodSpawn = Date.now();
    
    // Reset enemy
    enemy.x = tileCountX;
    enemy.projectiles = [];
    
    // Reset UI
    document.getElementById('scoreDisplay').textContent = '0';
    document.getElementById('gameOver').classList.add('hidden');
    
    // Reset game state
    boss.health = boss.maxHealth;
    boss.difficulty = 1;
    boss.spawnInterval = 5000;
    enemies = [];
    activeEffects.clear();
    reverseControls = false;
    
    // Reset game loop
    resetGameLoop();
    updateUI();
}

// Update resetGameLoop to properly handle animation frame
function resetGameLoop() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    gameLoop = requestAnimationFrame(drawGame);
}

document.addEventListener('keydown', (event) => {
    let newDx = dx;
    let newDy = dy;

    if (!reverseControls) {
        switch (event.key) {
            case 'ArrowUp':
                if (dy !== 1) { newDx = 0; newDy = -1; }
                break;
            case 'ArrowDown':
                if (dy !== -1) { newDx = 0; newDy = 1; }
                break;
            case 'ArrowLeft':
                if (dx !== 1) { newDx = -1; newDy = 0; }
                break;
            case 'ArrowRight':
                if (dx !== -1) { newDx = 1; newDy = 0; }
                break;
        }
    } else {
        switch (event.key) {
            case 'ArrowUp':
                if (dy !== -1) { newDx = 0; newDy = 1; }
                break;
            case 'ArrowDown':
                if (dy !== 1) { newDx = 0; newDy = -1; }
                break;
            case 'ArrowLeft':
                if (dx !== -1) { newDx = 1; newDy = 0; }
                break;
            case 'ArrowRight':
                if (dx !== 1) { newDx = -1; newDy = 0; }
                break;
        }
    }

    dx = newDx;
    dy = newDy;
});

// Add mobile control handlers after keyboard event listeners
function handleDirectionChange(newDx, newDy) {
    if (!reverseControls) {
        if (newDy === -1 && dy !== 1) { dx = 0; dy = -1; }
        if (newDy === 1 && dy !== -1) { dx = 0; dy = 1; }
        if (newDx === -1 && dx !== 1) { dx = -1; dy = 0; }
        if (newDx === 1 && dx !== -1) { dx = 1; dy = 0; }
    } else {
        if (newDy === -1 && dy !== -1) { dx = 0; dy = 1; }
        if (newDy === 1 && dy !== 1) { dx = 0; dy = -1; }
        if (newDx === -1 && dx !== -1) { dx = 1; dy = 0; }
        if (newDx === 1 && dx !== 1) { dx = -1; dy = 0; }
    }
}

// Add touch controls
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// Handle both touch and click events
['touchstart', 'click'].forEach(eventType => {
    upBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        handleDirectionChange(0, -1);
    });

    downBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        handleDirectionChange(0, 1);
    });

    leftBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        handleDirectionChange(-1, 0);
    });

    rightBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        handleDirectionChange(1, 0);
    });
});

// Prevent default touch behavior to avoid scrolling while playing
document.addEventListener('touchmove', (e) => {
    if (e.target.classList.contains('control-btn')) {
        e.preventDefault();
    }
}, { passive: false });

document.getElementById('restartButton').addEventListener('click', resetGame);

resetGame();

// NEW: Define inner box boundaries for enemy spawn logic
const innerMargin = 30; // pixels
const innerMarginTiles = Math.ceil(innerMargin / gridSize);

// Modified createEnemy: Enemies spawn in the outer ring and shoot toward inner box center
function createEnemy() {
    const sides = ['top', 'bottom', 'left', 'right'];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const enemy = {
         width: gridSize,
         height: gridSize,
         speed: 3 + (boss.difficulty * 0.5),
         color: 'red',
         projectiles: [],
         lastShot: 0,
         shootingInterval: 2000 - (boss.difficulty * 100)
    };

    // Set spawn position based on chosen side
    if (side === 'top') {
         enemy.y = 0;
         enemy.x = Math.floor(Math.random() * (tileCountX - 2 * innerMarginTiles)) + innerMarginTiles;
    } else if (side === 'bottom') {
         enemy.y = tileCountY - 1;
         enemy.x = Math.floor(Math.random() * (tileCountX - 2 * innerMarginTiles)) + innerMarginTiles;
    } else if (side === 'left') {
         enemy.x = 0;
         enemy.y = Math.floor(Math.random() * (tileCountY - 2 * innerMarginTiles)) + innerMarginTiles;
    } else if (side === 'right') {
         enemy.x = tileCountX - 1;
         enemy.y = Math.floor(Math.random() * (tileCountY - 2 * innerMarginTiles)) + innerMarginTiles;
    }
    // Compute shooting direction toward inner box center
    const targetX = Math.floor(tileCountX / 2);
    const targetY = Math.floor(tileCountY / 2);
    const diffX = targetX - enemy.x;
    const diffY = targetY - enemy.y;
    const mag = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
    enemy.shootDirection = { vx: diffX / mag, vy: diffY / mag };

    enemy.shoot = () => {
         const now = Date.now();
         if (now - enemy.lastShot > enemy.shootingInterval) {
             // Calculate initial projectile position from enemy
             let projX = enemy.x * gridSize;
             let projY = enemy.y * gridSize;
             
             // Calculate direction to center of game box
             const centerX = canvas.width / 2;
             const centerY = canvas.height / 2;
             const diffX = centerX - projX;
             const diffY = centerY - projY;
             const mag = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
             
             // Create projectile with normalized velocity
             const projectile = {
                 x: projX,
                 y: projY,
                 width: 8,
                 height: 8,
                 vx: (diffX / mag) * 5,  // Increased speed multiplier
                 vy: (diffY / mag) * 5   // Increased speed multiplier
             };
             
             if (!enemy.projectiles) {
                 enemy.projectiles = [];
             }
             enemy.projectiles.push(projectile);
             enemy.lastShot = now;
         }
    };

    // Make enemy larger and more visible
    enemy.width = gridSize * 1.2;
    enemy.height = gridSize * 1.2;
    enemy.color = '#ff3333';
    return enemy;
}

// Modify updateBoss to use the new createEnemy (removing the type parameter)
function updateBoss() {
    const now = Date.now();
    if (now - boss.lastSpawn > boss.spawnInterval && enemies.length < maxEnemies) {
        enemies.push(createEnemy());
        boss.lastSpawn = now;
        
        // Increase difficulty over time
        boss.difficulty += 0.1;
        boss.spawnInterval = Math.max(2000, boss.spawnInterval - 100);
    }
}

// Update createEnemy function
function createEnemy(type) {
    const enemy = {
        type: type,
        width: gridSize,
        height: gridSize,
        speed: 3 + (boss.difficulty * 0.5),
        color: 'red',
        projectiles: [],
        lastShot: 0,
        shootingInterval: 2000 - (boss.difficulty * 100) // Faster shooting with higher difficulty
    };

    if (type === enemyTypes.HORIZONTAL) {
        enemy.x = Math.random() < 0.5 ? -1 : tileCountX + 1;
        enemy.y = Math.floor(Math.random() * tileCountY);
        enemy.shootDirection = enemy.x < 0 ? 1 : -1; // Shoot right if on left side, left if on right side
        // Horizontal oscillation
        enemy.movePattern = () => {
            enemy.x += Math.sin(Date.now() / 500) * 0.05;
        };
    } else {
        enemy.x = Math.floor(Math.random() * tileCountX);
        enemy.y = Math.random() < 0.5 ? -1 : tileCountY + 1;
        enemy.shootDirection = enemy.y < 0 ? 1 : -1; // Shoot down if on top, up if on bottom
        // Vertical oscillation
        enemy.movePattern = () => {
            enemy.y += Math.sin(Date.now() / 500) * 0.05;
        };
    }

    // Update shooting pattern based on enemy type
    enemy.shoot = () => {
        const now = Date.now();
        if (now - enemy.lastShot > enemy.shootingInterval) {
            const clampedX = Math.max(0, Math.min(enemy.x, tileCountX - 1));
            const clampedY = Math.max(0, Math.min(enemy.y, tileCountY - 1));
            const projectile = {
                x: clampedX * gridSize,
                y: clampedY * gridSize,
                width: 5,
                height: 5,
                speed: 5
            };

            if (enemy.type === enemyTypes.HORIZONTAL) {
                projectile.vx = enemy.shootDirection * projectile.speed;
                projectile.vy = 0;
            } else {
                projectile.vx = 0;
                projectile.vy = enemy.shootDirection * projectile.speed;
            }

            enemy.projectiles.push(projectile);
            enemy.lastShot = now;
        }
    };

    // Make enemies slightly larger and more visible
    enemy.width = gridSize * 1.2;
    enemy.height = gridSize * 1.2;
    enemy.color = '#ff3333'; // Brighter red

    return enemy;
}

// Updated moveProjectiles function to handle all enemies
function moveProjectiles() {
    enemies.forEach(enemy => {
        if (enemy && enemy.projectiles) {
            // Move each projectile
            enemy.projectiles.forEach(projectile => {
                projectile.x += projectile.vx;
                projectile.y += projectile.vy;
            });

            // Remove projectiles that are off screen
            enemy.projectiles = enemy.projectiles.filter(projectile => {
                return projectile.x >= 0 && 
                       projectile.x <= canvas.width && 
                       projectile.y >= 0 && 
                       projectile.y <= canvas.height;
            });
        }
    });
}

// Update drawEnemy function with null check
function drawEnemy(enemyObj) {
    if (!enemyObj || typeof enemyObj.color === 'undefined') {
        return; // Skip drawing if enemy object is invalid
    }
    
    const pulse = enemyVisuals.updatePulse();
    const x = enemyObj.x * gridSize;
    const y = enemyObj.y * gridSize;
    
    // Draw glow effect
    ctx.save();
    ctx.globalAlpha = 0.3;
    const gradient = ctx.createRadialGradient(
        x + gridSize/2, y + gridSize/2, 0,
        x + gridSize/2, y + gridSize/2, VISUAL_SETTINGS.ENEMY_GLOW.size
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(
        x - VISUAL_SETTINGS.ENEMY_GLOW.size/2,
        y - VISUAL_SETTINGS.ENEMY_GLOW.size/2,
        gridSize + VISUAL_SETTINGS.ENEMY_GLOW.size,
        gridSize + VISUAL_SETTINGS.ENEMY_GLOW.size
    );
    ctx.restore();

    // Draw enemy body with pulse effect
    ctx.fillStyle = enemyObj.color || 'red';
    ctx.save();
    ctx.translate(x + gridSize/2, y + gridSize/2);
    ctx.scale(pulse, pulse);
    ctx.fillRect(
        -gridSize/2, -gridSize/2,
        enemyObj.width || gridSize,
        enemyObj.height || gridSize
    );
    ctx.restore();
}

// Check enemy collision
function checkEnemyCollision() {
    for (const enemy of enemies) {
        if (!enemy || !enemy.projectiles) continue;
        
        for (let i = 0; i < enemy.projectiles.length; i++) {
            const projectile = enemy.projectiles[i];
            const head = snake[0];
            
            // Check head collision (game over)
            if (isColliding(projectile, head)) {
                handleGameOver();
                return true;
            }
            
            // Check tail collision (reduce size)
            for (let j = 1; j < snake.length; j++) {
                const segment = snake[j];
                if (isColliding(projectile, segment)) {
                    // Remove projectile
                    enemy.projectiles.splice(i, 1);
                    
                    // Remove tail segments
                    snake.splice(j, snakeSizeReduction);
                    
                    // Check if snake is too small
                    if (snake.length < 3) {
                        handleGameOver();
                        return true;
                    }
                    
                    return false;
                }
            }
        }
    }
    return false;
}

// Helper function to check collision between projectile and snake segment
function isColliding(projectile, segment) {
    const segX = segment.x * gridSize;
    const segY = segment.y * gridSize;
    
    return projectile.x < segX + gridSize &&
           projectile.x + projectile.width > segX &&
           projectile.y < segY + gridSize &&
           projectile.y + projectile.height > segY;
}

function drawBossHealthBar() {
    const barWidth = canvas.width * 0.8;
    const barHeight = 20;
    const x = (canvas.width - barWidth) / 2;
    const y = 10;

    // Draw boss health bar on canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    const healthWidth = (boss.health / boss.maxHealth) * barWidth;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, healthWidth, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, barWidth, barHeight);

    // NEW: Update external boss health display
    const bossDisplay = document.getElementById('bossHealthDisplay');
    if (bossDisplay) {
        bossDisplay.textContent = `Boss Health: ${boss.health} / ${boss.maxHealth}`;
    }
}

function drawEffectTimers() {
    const now = Date.now();
    let y = 40;
    
    activeEffects.forEach((endTime, effect) => {
        if (now >= endTime) {
            activeEffects.delete(effect);
        } else {
            const timeLeft = Math.ceil((endTime - now) / 1000);
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.fillText(`${effect}: ${timeLeft}s`, 10, y);
            y += 20;
        }
    });
}

function handleBossDefeat() {
    alert('Congratulations! You defeated the boss!');
    resetGame();
}

// Handle enemy updates and shooting
function updateEnemies() {
    enemies.forEach(enemy => {
        if (enemy && enemy.shoot) {
            enemy.shoot();
        }
    });
    
    // Update main enemy projectiles
    if (enemy) {
        const now = Date.now();
        if (now - enemy.lastShot > enemy.shootingInterval) {
            createProjectile(enemy);
            enemy.lastShot = now;
        }
    }
}

// Create new projectile for an enemy
function createProjectile(enemyObj) {
    const projectile = {
        x: enemyObj.x * gridSize,
        y: (enemyObj.y + 0.5) * gridSize,
        width: 5,
        height: 5,
        speed: enemyObj.type === enemyTypes.HORIZONTAL ? 
            enemyObj.shootDirection * 5 : 0,
        vSpeed: enemyObj.type === enemyTypes.VERTICAL ? 
            enemyObj.shootDirection * 5 : 0
    };
    
    enemyObj.projectiles.push(projectile);
}

// Update projectile positions
// Update updateProjectiles to include drawing
function updateProjectiles() {
    moveProjectiles();
    drawProjectiles();
}

// Add special food timer check in the game loop
function updateSpecialFood() {
    if (specialFood) {
        const now = Date.now();
        // Despawn special food after 10 seconds
        if (now - specialFood.spawnTime > 10000) {
            specialFood = null;
        }
    }
}

// Add new UI drawing function
function updateUI() {
    // Update Score & High Score
    const scoreEl = document.getElementById('scoreDisplay');
    const highScoreEl = document.getElementById('highScoreDisplay');
    if (scoreEl) scoreEl.textContent = score;
    if (highScoreEl) highScoreEl.textContent = highScore;

    // Update Speed
    const speedEl = document.getElementById('speedDisplay');
    if (speedEl) {
        const actualMPS = 1000 / gameSpeed;
        const speedFactor = (actualMPS / BASE_MOVES_PER_SECOND).toFixed(1);
        speedEl.textContent = speedFactor;
    }

    // Update Food Countdown
    const foodCountdownEl = document.getElementById('foodCountdown');
    if (foodCountdownEl) {
        const now = Date.now();
        if (!specialFood) {
            const nextSpawn = Math.max(
                0,
                Math.ceil((CONFIG.SPECIAL_FOOD_INTERVAL - (now - lastSpecialFoodSpawn)) / 1000)
            );
            foodCountdownEl.textContent = nextSpawn;
        } else {
            const timeLeft = Math.ceil(
                (specialFood.spawnTime + CONFIG.SPECIAL_FOOD_DURATION - now) / 1000
            );
            foodCountdownEl.textContent = timeLeft;
        }
    }
}

// Update special food spawn logic
function updateSpecialFoodSpawn() {
    const now = Date.now();
    
    // Check if special food should disappear
    if (specialFood && now - specialFood.spawnTime > CONFIG.SPECIAL_FOOD_DURATION) {
        specialFood = null;
    }
    
    // Check if new special food should spawn
    if (!specialFood && now - lastSpecialFoodSpawn > CONFIG.SPECIAL_FOOD_INTERVAL) {
        generateSpecialFood();
        lastSpecialFoodSpawn = now;
    }
}

// New function: update enemy positions with their movePattern
function moveEnemies() {
    enemies.forEach(e => {
        if (typeof e.movePattern === 'function') {
            e.movePattern();
        }
    });
    // Optionally update main enemy if needed:
    if (enemy && typeof enemy.movePattern === 'function') {
        enemy.movePattern();
    }
}

// Add this helper function near the top of the file
function getTileCounts() {
    const tileCountX = Math.floor(canvas.width / gridSize);
    const tileCountY = Math.floor(canvas.height / gridSize);
    return { tileCountX, tileCountY };
}

// Replace any existing resize handlers with this consolidated one
window.addEventListener('resize', () => {
    const container = document.querySelector('.game-container');
    const containerWidth = container.clientWidth - 40; // Account for padding
    const containerHeight = window.innerHeight < 768 ? window.innerHeight - 300 : 400;
    
    // Maintain 3:2 aspect ratio
    const aspectRatio = 600 / 400;
    let newWidth = containerWidth;
    let newHeight = newWidth / aspectRatio;
    
    if (newHeight > containerHeight) {
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Keep approximately 30 tiles across
    gridSize = Math.floor(newWidth / 30);
    
    // Update tile counts
    tileCountX = Math.floor(canvas.width / gridSize);
    tileCountY = Math.floor(canvas.height / gridSize);
    
    // Force redraw if game is running
    if (typeof draw === 'function') {
        draw();
    }
});

// Add this at the end of your initialization code
window.dispatchEvent(new Event('resize'));

// Add this new function to update the HTML health bar
function updateBossHealthBar() {
    // Update the text display
    const bossHealthText = document.getElementById('bossHealthText');
    if (bossHealthText) {
        bossHealthText.textContent = `${boss.health} / ${boss.maxHealth}`;
    }
    
    // Update the visual bar
    const bossHealthBar = document.getElementById('bossHealthBar');
    if (bossHealthBar) {
        const percent = Math.max(0, (boss.health / boss.maxHealth) * 100);
        bossHealthBar.style.width = percent + '%';
    }
}
