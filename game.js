const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: 10, y: 10 }
];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = 100;
let gameLoop;

document.getElementById('highScore').textContent = highScore;

function drawGame() {
    clearCanvas();
    moveSnake();
    if (checkGameOver()) return;
    checkFoodCollision();
    drawSnake();
    drawFood();
}

function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    ctx.fillStyle = '#4CAF50';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    if (!checkFoodCollision()) {
        snake.pop();
    }
}

function checkFoodCollision() {
    if (snake[0].x === food.x && snake[0].y === food.y) {
        generateFood();
        increaseScore();
        return true;
    }
    return false;
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * (canvas.height / gridSize))
    };
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        generateFood();
    }
}

function checkGameOver() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || 
        head.y < 0 || head.y >= canvas.height / gridSize ||
        snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
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
        document.getElementById('highScore').textContent = highScore;
    }
}

function increaseScore() {
    score += 10;
    document.getElementById('score').textContent = score;
    if (score % 50 === 0) {
        gameSpeed = Math.max(50, gameSpeed - 10);
        resetGameLoop();
    }
}

function resetGame() {
    snake = [{ x: 10, y: 10 }];
    food = { x: 15, y: 15 };
    dx = 0;
    dy = 0;
    score = 0;
    gameSpeed = 100;
    document.getElementById('score').textContent = '0';
    document.getElementById('gameOver').classList.add('hidden');
    resetGameLoop();
}

function resetGameLoop() {
    clearInterval(gameLoop);
    gameLoop = setInterval(drawGame, gameSpeed);
}

document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowUp':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

document.getElementById('restartButton').addEventListener('click', resetGame);

resetGame();
