document.addEventListener('DOMContentLoaded', () => {
  const container = document.body;
  const numberOfBoxes = 50;

  for (let i = 0; i < numberOfBoxes; i++) {
    const box = document.createElement('div');
    box.classList.add('box');

    // Random size for boxes
    const size = Math.random() * 50 + 20;
    box.style.width = `${size}px`;
    box.style.height = `${size}px`;

    // Random position
    box.style.left = `${Math.random() * 100}vw`;
    box.style.top = `${Math.random() * 100}vh`;

    // Random color
    const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    box.style.backgroundColor = randomColor;

    container.appendChild(box);
  }
});