const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// — mouse source —
let mouse = { x: null, y: null, radius: 50 };
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mouseleave', () => {
    mouse.x = mouse.y = null;
});

// — NEW: automatic “repel” circle —
let autoCircle = {
    x: 0,
    y: 0,            // set in resizeCanvas()
    radius: 30,
    vx: 1            // pixels per frame
};

class Particle {
    constructor(x, y) {
        this.baseX = x; this.baseY = y;
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y + (Math.random() - 0.5) * 20;
        this.size = Math.random() * 0.5 + 1.8;
        this.density = Math.random() * 30 + 5;
        this.vx = 0; this.vy = 0;
        this.hue = 180 + Math.random() * 60;
    }
    draw() {
        ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, 0.8)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    update() {
        // — mouse repulsion —
        if (mouse.x !== null) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const d = Math.hypot(dx, dy);
            if (d < mouse.radius) {
                const f = (mouse.radius - d) / mouse.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }

        // — NEW: autoCircle repulsion —
        {
            const dx = this.x - autoCircle.x;
            const dy = this.y - autoCircle.y;
            const d = Math.hypot(dx, dy);
            if (d < autoCircle.radius) {
                const f = (autoCircle.radius - d) / autoCircle.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }

        // return to base
        const dx0 = this.baseX - this.x;
        const dy0 = this.baseY - this.y;
        this.vx += dx0 / (this.density * 10);
        this.vy += dy0 / (this.density * 10);

        // friction & move
        this.vx *= 0.9;
        this.vy *= 0.9;
        this.x += this.vx;
        this.y += this.vy;

        // hue shift
        this.hue = (this.hue + 0.5) % 360;
    }
}

let particles = [];

function initParticles() {
    particles = [];
    const temp = document.createElement('canvas');
    temp.width = 350;
    temp.height = 120;
    const tctx = temp.getContext('2d');

    tctx.fillStyle = 'black';
    tctx.font = 'bold 120px Helvetica, Arial, sans-serif';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.lineWidth = 10;
    tctx.fillText('MPSG', temp.width / 2, temp.height / 2);

    const imgData = tctx.getImageData(0, 0, temp.width, temp.height).data;
    const dpr = window.devicePixelRatio || 1;
    const offsetX = (canvas.width / dpr - temp.width) / 2;
    const offsetY = (canvas.height / dpr - temp.height) / 2;
    const gap = 6;

    for (let y = 0; y < temp.height; y += gap) {
        for (let x = 0; x < temp.width; x += gap) {
            if (imgData[(y * temp.width + x) * 4 + 3] > 128) {
                particles.push(new Particle(x + offsetX, y + offsetY));
            }
        }
    }
}

// animated background gradient (unchanged)
let gradAngle = 0;
function drawBackground() {
    gradAngle += 0.001;
    const g = ctx.createLinearGradient(
        canvas.width * Math.cos(gradAngle), canvas.height * Math.sin(gradAngle),
        canvas.width * Math.cos(gradAngle + Math.PI),
        canvas.height * Math.sin(gradAngle + Math.PI)
    );
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#e0f7fa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// particle connections (unchanged)
function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < 15) {
                ctx.strokeStyle = `hsla(${particles[i].hue}, 80%, 60%, ${0.5 - 0.5 * (dist / 15)})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    drawBackground();
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    autoCircle.x += autoCircle.vx;
    if (autoCircle.x > width + autoCircle.radius) {
        autoCircle.x = -autoCircle.radius;
    }

    for (const p of particles) {
        p.update();
        p.draw();
    }
    connectParticles();
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    autoCircle.y = (canvas.height / dpr) / 2.2;

    initParticles();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animate();
