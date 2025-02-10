class GameAnimations {
    constructor(ctx) {
        this.ctx = ctx;
    }

    foodSpawnEffect(x, y) {
        const radius = 10; // Increased initial radius
        const duration = 150; // Reduced duration
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.ctx.beginPath();
            this.ctx.arc(x, y, radius * progress, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
            this.ctx.stroke();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    snakeCollisionEffect(x, y) {
        const particles = [];
        for (let i = 0; i < 10; i++) { // Reduced particle count
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1
            });
        }

        const animate = () => {
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 0.02;
                
                this.ctx.fillStyle = `rgba(255, 0, 0, ${particle.life})`;
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            });

            if (particles.some(p => p.life > 0)) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
}

// NEW: Enemy cool effect animation
GameAnimations.prototype.enemyCoolEffect = function(x, y) {
    const duration = 300; // faster effect
    const maxRadius = 20;
    const startTime = performance.now();

    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        this.ctx.beginPath();
        this.ctx.arc(x, y, maxRadius * progress, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
};
