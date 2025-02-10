// ...existing code...

function createBlock() {
    // ...existing code...
    block.style.backgroundColor = getRandomColor();
    block.style.animation = 'fadeIn 0.15s ease-out'; // Reduced duration
    // ...existing code...
}

function getRandomColor() {
    const colors = [
        '#ff6b6b',
        '#4ecdc4',
        '#ffe66d',
        '#95e1d3',
        '#f38181',
        '#fce38a'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function updateScore() {
    // ...existing code...
    scoreElement.style.animation = 'none';
    scoreElement.offsetHeight; // Trigger reflow
    scoreElement.style.animation = 'pulse 0.15s ease'; // Reduced duration
    // ...existing code...
}

function gameOver() {
    // ...existing code...
    const gameOverElement = document.querySelector('.game-over');
    gameOverElement.style.animation = 'slideIn 0.5s ease-out';
    // ...existing code...
}
