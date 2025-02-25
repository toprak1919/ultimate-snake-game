/**
 * Game Boy Snake - Main Game Logic
 * A pixel-perfect Game Boy-style Snake game
 */

// Game states
const GAME_STATE = {
    START_SCREEN: 0,
    PLAYING: 1,
    PAUSED: 2,
    GAME_OVER: 3
};

// Directions
const DIRECTION = {
    NONE: { x: 0, y: 0 },
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// Tile types
const TILE = {
    EMPTY: 0,
    SNAKE_HEAD: 1,
    SNAKE_BODY: 2,
    FOOD: 3,
    SPECIAL_FOOD: 4
};

// Main game configuration
const CONFIG = {
    GRID_SIZE: 16,           // Game grid is 16x16 tiles
    INITIAL_LENGTH: 3,       // Starting snake length
    BASE_SPEED: 200,         // Base movement speed (ms)
    MIN_SPEED: 50,           // Maximum speed (minimum delay)
    SPEED_DECREASE: 10,      // Speed increase per level (ms)
    LEVEL_UP_SCORE: 5,       // Score needed to level up
    SPECIAL_FOOD_CHANCE: 0.1, // Chance for special food to appear
    SPECIAL_FOOD_POINTS: 3,   // Points from special food
    FUNNY_MESSAGES: [
        "SNAKTASTIC!",
        "APPLE CRUNCHER!",
        "LEVEL UP!",
        "KEEP GOING!",
        "SUPER SNAKE!",
        "HISS-TERICAL!",
        "SSSLITHERING UP!",
        "PIXEL MUNCHER!",
        "GAME BOY MASTER!",
        "RETRO POWER!"
    ]
};

// Snake game class - Main game logic
class SnakeGame {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = GAME_STATE.START_SCREEN;
        this.grid = [];
        this.snake = [];
        this.food = null;
        this.specialFood = null;
        this.score = 0;
        this.highScore = localStorage.getItem('gbSnakeHighScore') || 0;
        this.level = 1;
        this.speed = CONFIG.BASE_SPEED;
        this.lastMoveTime = 0;
        this.direction = DIRECTION.NONE;
        this.nextDirection = DIRECTION.NONE;
        
        // Stats tracking
        this.stats = this.loadStats();
        
        // Game Boy color palette
        this.colors = {
            background: '#9bbc0f',  // Light green
            snake: '#0f380f',       // Dark green
            snakeEyes: '#9bbc0f',   // Light green
            food: '#306230',        // Medium green
            specialFood: '#0f380f', // Dark green
            text: '#0f380f'         // Dark green
        };
        
        // Easter eggs
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 
                           'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 
                           'b', 'a'];
        this.konamiIndex = 0;
        this.giantSnakeMode = false;
        
        // Special effects
        this.turboMode = false;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the game
        this.init();
    }
    
    /**
     * Initialize the game
     */
    init() {
        // Set up canvas
        this.resizeCanvas();
        
        // Create grid
        this.createGrid();
        
        // Start in title screen state
        this.state = GAME_STATE.START_SCREEN;
        
        // Play startup sound
        if (window.gbSound) {
            setTimeout(() => window.gbSound.play('startup'), 500);
        }
        
        // Start game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // D-Pad buttons
        document.getElementById('btnUp').addEventListener('mousedown', () => {
            this.handleDirectionChange(DIRECTION.UP);
            document.getElementById('btnUp').classList.add('button-pressed');
        });
        document.getElementById('btnDown').addEventListener('mousedown', () => {
            this.handleDirectionChange(DIRECTION.DOWN);
            document.getElementById('btnDown').classList.add('button-pressed');
        });
        document.getElementById('btnLeft').addEventListener('mousedown', () => {
            this.handleDirectionChange(DIRECTION.LEFT);
            document.getElementById('btnLeft').classList.add('button-pressed');
        });
        document.getElementById('btnRight').addEventListener('mousedown', () => {
            this.handleDirectionChange(DIRECTION.RIGHT);
            document.getElementById('btnRight').classList.add('button-pressed');
        });
        
        // Button release events
        const buttons = document.querySelectorAll('.dpad-btn, .action-btn, .menu-btn');
        buttons.forEach(button => {
            button.addEventListener('mouseup', () => button.classList.remove('button-pressed'));
            button.addEventListener('mouseleave', () => button.classList.remove('button-pressed'));
            
            // Touch events for mobile
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                button.classList.add('button-pressed');
                
                // Handle D-Pad touch events
                if (button.id === 'btnUp') this.handleDirectionChange(DIRECTION.UP);
                if (button.id === 'btnDown') this.handleDirectionChange(DIRECTION.DOWN);
                if (button.id === 'btnLeft') this.handleDirectionChange(DIRECTION.LEFT);
                if (button.id === 'btnRight') this.handleDirectionChange(DIRECTION.RIGHT);
            });
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                button.classList.remove('button-pressed');
            });
        });
        
        // Start/Pause button
        document.getElementById('btnStart').addEventListener('mousedown', () => {
            this.handleStartButton();
            document.getElementById('btnStart').classList.add('button-pressed');
        });
        
        // Select button (stats)
        document.getElementById('btnSelect').addEventListener('mousedown', () => {
            this.toggleStats();
            document.getElementById('btnSelect').classList.add('button-pressed');
        });
        
        // A button (turbo mode)
        document.getElementById('btnA').addEventListener('mousedown', () => {
            this.handleTurboStart();
            document.getElementById('btnA').classList.add('button-pressed');
        });
        document.getElementById('btnA').addEventListener('mouseup', () => {
            this.handleTurboEnd();
        });
        document.getElementById('btnA').addEventListener('mouseleave', () => {
            this.handleTurboEnd();
        });
        document.getElementById('btnA').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTurboStart();
        });
        document.getElementById('btnA').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTurboEnd();
        });
        
        // B button (close stats/special action)
        document.getElementById('btnB').addEventListener('mousedown', () => {
            this.handleBButton();
            document.getElementById('btnB').classList.add('button-pressed');
        });
        
        // Secret code dialog close
        document.getElementById('secretPopup').addEventListener('click', () => {
            document.getElementById('secretPopup').classList.add('hidden');
        });
        
        // Window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }
    
    /**
     * Handle keyboard input
     */
    handleKeyDown(event) {
        // Direction controls
        switch (event.key) {
            case 'ArrowUp':
                this.handleDirectionChange(DIRECTION.UP);
                document.getElementById('btnUp').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnUp').classList.remove('button-pressed'), 100);
                break;
            case 'ArrowDown':
                this.handleDirectionChange(DIRECTION.DOWN);
                document.getElementById('btnDown').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnDown').classList.remove('button-pressed'), 100);
                break;
            case 'ArrowLeft':
                this.handleDirectionChange(DIRECTION.LEFT);
                document.getElementById('btnLeft').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnLeft').classList.remove('button-pressed'), 100);
                break;
            case 'ArrowRight':
                this.handleDirectionChange(DIRECTION.RIGHT);
                document.getElementById('btnRight').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnRight').classList.remove('button-pressed'), 100);
                break;
            case 'Enter':
            case ' ':
                this.handleStartButton();
                document.getElementById('btnStart').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnStart').classList.remove('button-pressed'), 100);
                break;
            case 'Tab':
                event.preventDefault();
                this.toggleStats();
                document.getElementById('btnSelect').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnSelect').classList.remove('button-pressed'), 100);
                break;
            case 'a':
            case 'A':
                this.handleTurboStart();
                document.getElementById('btnA').classList.add('button-pressed');
                break;
            case 'b':
            case 'B':
                this.handleBButton();
                document.getElementById('btnB').classList.add('button-pressed');
                setTimeout(() => document.getElementById('btnB').classList.remove('button-pressed'), 100);
                break;
        }
        
        // Release turbo on key up
        document.addEventListener('keyup', (e) => {
            if (e.key === 'a' || e.key === 'A') {
                this.handleTurboEnd();
                document.getElementById('btnA').classList.remove('button-pressed');
            }
        });
        
        // Konami code tracking
        const konamiKey = this.konamiCode[this.konamiIndex].toLowerCase();
        if (event.key.toLowerCase() === konamiKey) {
            this.konamiIndex++;
            if (this.konamiIndex === this.konamiCode.length) {
                this.activateKonamiCode();
                this.konamiIndex = 0;
            }
        } else {
            this.konamiIndex = 0;
        }
    }
    
    /**
     * Handle direction change from controls
     */
    handleDirectionChange(newDirection) {
        // Can't reverse directly
        if (
            (this.direction.x === -newDirection.x && this.direction.y === -newDirection.y) ||
            (this.nextDirection.x === -newDirection.x && this.nextDirection.y === -newDirection.y)
        ) {
            return;
        }
        
        // Store the next direction
        this.nextDirection = newDirection;
        
        // If at start screen, start the game
        if (this.state === GAME_STATE.START_SCREEN) {
            this.startGame();
        }
        
        // Play move sound if playing
        if (this.state === GAME_STATE.PLAYING && window.gbSound) {
            window.gbSound.play('move');
        }
    }
    
    /**
     * Handle Start/Pause button
     */
    handleStartButton() {
        // Button press sound
        if (window.gbSound) {
            window.gbSound.play('button');
        }
        
        // Handle based on current state
        switch (this.state) {
            case GAME_STATE.START_SCREEN:
                this.startGame();
                break;
            case GAME_STATE.PLAYING:
                this.pauseGame();
                break;
            case GAME_STATE.PAUSED:
                this.resumeGame();
                break;
            case GAME_STATE.GAME_OVER:
                this.startGame();
                break;
        }
    }
    
    /**
     * Handle B button (back/special action)
     */
    handleBButton() {
        // Button press sound
        if (window.gbSound) {
            window.gbSound.play('button');
        }
        
        // Close stats screen if open
        const statsScreen = document.getElementById('statsScreen');
        if (!statsScreen.classList.contains('hidden')) {
            statsScreen.classList.add('hidden');
        }
    }
    
    /**
     * Activate turbo mode (A button press)
     */
    handleTurboStart() {
        if (this.state === GAME_STATE.PLAYING) {
            this.turboMode = true;
            this.calculateSpeed();
        }
    }
    
    /**
     * Deactivate turbo mode (A button release)
     */
    handleTurboEnd() {
        if (this.state === GAME_STATE.PLAYING) {
            this.turboMode = false;
            this.calculateSpeed();
        }
    }
    
    /**
     * Toggle stats screen
     */
    toggleStats() {
        // Button press sound
        if (window.gbSound) {
            window.gbSound.play('select');
        }
        
        // Update stats display
        this.updateStatsDisplay();
        
        // Toggle stats screen
        const statsScreen = document.getElementById('statsScreen');
        statsScreen.classList.toggle('hidden');
        
        // If playing, pause the game
        if (!statsScreen.classList.contains('hidden') && this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
        }
    }
    
    /**
     * Start a new game
     */
    startGame() {
        // Hide start/game over screens
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
        
        // Show HUD
        document.getElementById('gameHUD').classList.remove('hidden');
        
        // Reset game state
        this.score = 0;
        this.level = 1;
        this.calculateSpeed();
        
        // Create new grid
        this.createGrid();
        
        // Create initial snake
        this.createSnake();
        
        // Place initial food
        this.placeFood();
        
        // Reset direction (start not moving)
        this.direction = DIRECTION.NONE;
        this.nextDirection = DIRECTION.NONE;
        
        // Update display
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('levelDisplay').textContent = this.level;
        
        // Set state to playing
        this.state = GAME_STATE.PLAYING;
        
        // Update stats
        this.stats.gamesPlayed++;
        this.saveStats();
        
        // Play start sound
        if (window.gbSound) {
            window.gbSound.play('menu');
        }
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        this.state = GAME_STATE.PAUSED;
        document.getElementById('pauseScreen').classList.remove('hidden');
        
        // Play pause sound
        if (window.gbSound) {
            window.gbSound.play('pause');
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        this.state = GAME_STATE.PLAYING;
        document.getElementById('pauseScreen').classList.add('hidden');
        
        // Play resume sound
        if (window.gbSound) {
            window.gbSound.play('resume');
        }
    }
    
    /**
     * Game over
     */
    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        // Update stats
        this.stats.highScore = Math.max(this.stats.highScore, this.score);
        this.stats.maxLevel = Math.max(this.stats.maxLevel, this.level);
        this.stats.longestSnake = Math.max(this.stats.longestSnake, this.snake.length);
        this.saveStats();
        
        // Show game over screen
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = this.highScore;
        
        // Hide HUD
        document.getElementById('gameHUD').classList.add('hidden');
        
        // Play game over sound
        if (window.gbSound) {
            window.gbSound.play('gameOver');
        }
        
        // Apply screen shake effect
        const gameScreen = document.querySelector('.screen');
        gameScreen.classList.add('shake');
        setTimeout(() => gameScreen.classList.remove('shake'), 500);
    }
    
    /**
     * Level up
     */
    levelUp() {
        this.level++;
        
        // Calculate new speed
        this.calculateSpeed();
        
        // Update level display
        document.getElementById('levelDisplay').textContent = this.level;
        
        // Show level up notification
        this.showNotification(CONFIG.FUNNY_MESSAGES[Math.floor(Math.random() * CONFIG.FUNNY_MESSAGES.length)]);
        
        // Play level up sound
        if (window.gbSound) {
            window.gbSound.play('levelUp');
        }
        
        // Flash screen effect
        const gameScreen = document.querySelector('.screen');
        gameScreen.classList.add('flash');
        setTimeout(() => gameScreen.classList.remove('flash'), 300);
    }
    
    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastMoveTime;
        
        // Update based on game state
        if (this.state === GAME_STATE.PLAYING) {
            // Only move if enough time has passed
            if (deltaTime > this.speed) {
                this.update();
                this.lastMoveTime = timestamp;
            }
        }
        
        // Always render
        this.render();
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update game state
     */
    update() {
        // Update direction from next direction
        if (this.nextDirection !== DIRECTION.NONE) {
            this.direction = this.nextDirection;
        }
        
        // Move snake
        if (this.direction !== DIRECTION.NONE) {
            this.moveSnake();
        }
        
        // Check collisions
        this.checkCollisions();
    }
    
    /**
     * Move the snake
     */
    moveSnake() {
        // Calculate new head position
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };
        
        // Add new head to snake
        this.snake.unshift(newHead);
        
        // Remove tail unless food was eaten
        if (!this.checkFoodCollision()) {
            const tail = this.snake.pop();
            // Update grid
            if (this.isInBounds(tail.x, tail.y)) {
                this.grid[tail.y][tail.x] = TILE.EMPTY;
            }
        }
        
        // Update grid with new snake positions
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            if (this.isInBounds(segment.x, segment.y)) {
                this.grid[segment.y][segment.x] = i === 0 ? TILE.SNAKE_HEAD : TILE.SNAKE_BODY;
            }
        }
    }
    
    /**
     * Check for collisions
     */
    checkCollisions() {
        const head = this.snake[0];
        
        // Wall collision
        if (
            head.x < 0 || 
            head.x >= CONFIG.GRID_SIZE || 
            head.y < 0 || 
            head.y >= CONFIG.GRID_SIZE
        ) {
            this.gameOver();
            return;
        }
        
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }
    }
    
    /**
     * Check if snake head collided with food
     */
    checkFoodCollision() {
        const head = this.snake[0];
        
        // Regular food
        if (
            this.food && 
            head.x === this.food.x && 
            head.y === this.food.y
        ) {
            // Eat food
            this.eatFood();
            return true;
        }
        
        // Special food
        if (
            this.specialFood && 
            head.x === this.specialFood.x && 
            head.y === this.specialFood.y
        ) {
            // Eat special food
            this.eatSpecialFood();
            return true;
        }
        
        return false;
    }
    
    /**
     * Eat regular food
     */
    eatFood() {
        // Increase score
        this.score++;
        
        // Update display
        document.getElementById('scoreDisplay').textContent = this.score;
        
        // Update stats
        this.stats.applesEaten++;
        
        // Check for level up
        if (this.score > 0 && this.score % CONFIG.LEVEL_UP_SCORE === 0) {
            this.levelUp();
        }
        
        // Place new food
        this.placeFood();
        
        // Possibly place special food
        if (!this.specialFood && Math.random() < CONFIG.SPECIAL_FOOD_CHANCE) {
            this.placeSpecialFood();
        }
        
        // Play eat sound
        if (window.gbSound) {
            window.gbSound.play('eat');
        }
        
        // Show +1 notification
        this.showNotification("+1");
        
        return true;
    }
    
    /**
     * Eat special food
     */
    eatSpecialFood() {
        // Increase score
        this.score += CONFIG.SPECIAL_FOOD_POINTS;
        
        // Update display
        document.getElementById('scoreDisplay').textContent = this.score;
        
        // Clear special food
        this.specialFood = null;
        
        // Update stats
        this.stats.applesEaten++;
        
        // Check for level up
        if (this.score > 0 && this.score % CONFIG.LEVEL_UP_SCORE === 0) {
            this.levelUp();
        }
        
        // Play powerup sound
        if (window.gbSound) {
            window.gbSound.play('powerup');
        }
        
        // Show +3 notification
        this.showNotification("+" + CONFIG.SPECIAL_FOOD_POINTS + "!");
        
        return true;
    }
    
    /**
     * Show a notification message
     */
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        // Clear existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Hide notification after 2 seconds
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }
    
    /**
     * Render the game
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Skip rendering the game if we're in start or game over screens
        if (this.state === GAME_STATE.START_SCREEN || this.state === GAME_STATE.GAME_OVER) {
            return;
        }
        
        // Calculate tile size
        const tileSize = Math.min(
            this.canvas.width / CONFIG.GRID_SIZE,
            this.canvas.height / CONFIG.GRID_SIZE
        );
        
        // Draw game elements
        this.drawSnake(tileSize);
        this.drawFood(tileSize);
        
        // Draw special food if exists
        if (this.specialFood) {
            this.drawSpecialFood(tileSize);
        }
    }
    
    /**
     * Draw the snake
     */
    drawSnake(tileSize) {
        // Draw snake segments (body first, then head)
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const segment = this.snake[i];
            const x = segment.x * tileSize;
            const y = segment.y * tileSize;
            
            if (i === 0) {
                // Draw head
                this.ctx.fillStyle = this.colors.snake;
                
                // Draw larger head if giant snake mode is active
                if (this.giantSnakeMode) {
                    this.ctx.fillRect(x - 1, y - 1, tileSize + 2, tileSize + 2);
                } else {
                    this.ctx.fillRect(x, y, tileSize, tileSize);
                }
                
                // Draw eyes based on direction
                this.ctx.fillStyle = this.colors.snakeEyes;
                
                // Positioning for eyes
                const eyeSize = tileSize * 0.2;
                const eyeOffset = tileSize * 0.25;
                
                if (this.direction === DIRECTION.UP) {
                    this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                } else if (this.direction === DIRECTION.DOWN) {
                    this.ctx.fillRect(x + eyeOffset, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    this.ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.direction === DIRECTION.LEFT) {
                    this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(x + eyeOffset, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.direction === DIRECTION.RIGHT) {
                    this.ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else {
                    // Default eyes for NONE direction
                    this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                }
            } else {
                // Draw body segment
                this.ctx.fillStyle = this.colors.snake;
                
                // Draw slightly smaller body segments for a segmented look
                const padding = 1;
                this.ctx.fillRect(x + padding, y + padding, tileSize - padding * 2, tileSize - padding * 2);
            }
        }
    }
    
    /**
     * Draw regular food
     */
    drawFood(tileSize) {
        if (!this.food) return;
        
        const x = this.food.x * tileSize;
        const y = this.food.y * tileSize;
        
        // Draw food as classic Game Boy apple
        this.ctx.fillStyle = this.colors.food;
        
        // Draw apple body (circular)
        this.ctx.beginPath();
        this.ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw stem
        this.ctx.fillStyle = this.colors.snake;
        this.ctx.fillRect(x + tileSize/2 - 1, y + 2, 2, 3);
    }
    
    /**
     * Draw special food
     */
    drawSpecialFood(tileSize) {
        if (!this.specialFood) return;
        
        const x = this.specialFood.x * tileSize;
        const y = this.specialFood.y * tileSize;
        
        // Draw special food with pulsing effect
        const time = Date.now();
        const pulse = 0.8 + 0.2 * Math.sin(time / 200);
        
        this.ctx.fillStyle = this.colors.specialFood;
        
        // Draw special food (star shape)
        const centerX = x + tileSize/2;
        const centerY = y + tileSize/2;
        const outerRadius = (tileSize/2 - 1) * pulse;
        const innerRadius = outerRadius * 0.5;
        const spikes = 5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            const outerAngle = (Math.PI * 2 * i) / spikes - Math.PI / 2;
            const innerAngle = (Math.PI * 2 * i + Math.PI) / spikes - Math.PI / 2;
            
            // Outer point
            let pointX = centerX + Math.cos(outerAngle) * outerRadius;
            let pointY = centerY + Math.sin(outerAngle) * outerRadius;
            this.ctx.lineTo(pointX, pointY);
            
            // Inner point
            pointX = centerX + Math.cos(innerAngle) * innerRadius;
            pointY = centerY + Math.sin(innerAngle) * innerRadius;
            this.ctx.lineTo(pointX, pointY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    /**
     * Create the game grid
     */
    createGrid() {
        this.grid = [];
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            const row = [];
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                row.push(TILE.EMPTY);
            }
            this.grid.push(row);
        }
    }
    
    /**
     * Create the initial snake
     */
    createSnake() {
        // Start in the middle with length 3
        const startX = Math.floor(CONFIG.GRID_SIZE / 2);
        const startY = Math.floor(CONFIG.GRID_SIZE / 2);
        
        this.snake = [];
        for (let i = 0; i < CONFIG.INITIAL_LENGTH; i++) {
            this.snake.push({ x: startX - i, y: startY });
            
            // Update grid
            if (this.isInBounds(startX - i, startY)) {
                this.grid[startY][startX - i] = i === 0 ? TILE.SNAKE_HEAD : TILE.SNAKE_BODY;
            }
        }
    }
    
    /**
     * Place food randomly on the grid
     */
    placeFood() {
        // Find empty spots
        const emptySpots = [];
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                if (this.grid[y][x] === TILE.EMPTY) {
                    emptySpots.push({ x, y });
                }
            }
        }
        
        // If no empty spots, no food can be placed
        if (emptySpots.length === 0) return;
        
        // Pick random empty spot
        const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        this.food = { x: spot.x, y: spot.y };
        
        // Update grid
        this.grid[spot.y][spot.x] = TILE.FOOD;
    }
    
    /**
     * Place special food on the grid
     */
    placeSpecialFood() {
        // Find empty spots
        const emptySpots = [];
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                if (this.grid[y][x] === TILE.EMPTY) {
                    emptySpots.push({ x, y });
                }
            }
        }
        
        // If no empty spots, no food can be placed
        if (emptySpots.length === 0) return;
        
        // Pick random empty spot
        const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        this.specialFood = { x: spot.x, y: spot.y };
        
        // Update grid
        this.grid[spot.y][spot.x] = TILE.SPECIAL_FOOD;
    }
    
    /**
     * Calculate game speed based on level and turbo mode
     */
    calculateSpeed() {
        // Base speed decreased by level (faster at higher levels)
        let speed = CONFIG.BASE_SPEED - ((this.level - 1) * CONFIG.SPEED_DECREASE);
        
        // Apply turbo mode if active
        if (this.turboMode) {
            speed *= 0.5; // 50% faster
        }
        
        // Ensure minimum speed
        speed = Math.max(speed, CONFIG.MIN_SPEED);
        
        this.speed = speed;
    }
    
    /**
     * Update stats display
     */
    updateStatsDisplay() {
        document.getElementById('statGames').textContent = this.stats.gamesPlayed;
        document.getElementById('statHighScore').textContent = this.stats.highScore;
        document.getElementById('statMaxLevel').textContent = this.stats.maxLevel;
        document.getElementById('statApples').textContent = this.stats.applesEaten;
        document.getElementById('statLongest').textContent = this.stats.longestSnake;
    }
    
    /**
     * Activate Konami code easter egg
     */
    activateKonamiCode() {
        this.giantSnakeMode = true;
        
        // Show secret popup
        document.getElementById('secretPopup').classList.remove('hidden');
        
        // Play secret sound
        if (window.gbSound) {
            window.gbSound.play('secret');
        }
    }
    
    /**
     * Check if coordinates are in bounds
     */
    isInBounds(x, y) {
        return x >= 0 && x < CONFIG.GRID_SIZE && y >= 0 && y < CONFIG.GRID_SIZE;
    }
    
    /**
     * Resize canvas to fit container while maintaining aspect ratio
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
    }
    
    /**
     * Load stats from local storage
     */
    loadStats() {
        const saved = localStorage.getItem('gbSnakeStats');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading stats:', e);
            }
        }
        
        // Default stats
        return {
            gamesPlayed: 0,
            highScore: 0,
            maxLevel: 1,
            applesEaten: 0,
            longestSnake: CONFIG.INITIAL_LENGTH
        };
    }
    
    /**
     * Save stats to local storage
     */
    saveStats() {
        localStorage.setItem('gbSnakeStats', JSON.stringify(this.stats));
    }
    
    /**
     * Load high score from local storage
     */
    loadHighScore() {
        return localStorage.getItem('gbSnakeHighScore') || 0;
    }
    
    /**
     * Save high score to local storage
     */
    saveHighScore() {
        localStorage.setItem('gbSnakeHighScore', this.highScore);
    }
}

// Initialize the game when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the game
    const game = new SnakeGame();
    
    // Expose game to window for debugging
    window.game = game;
});