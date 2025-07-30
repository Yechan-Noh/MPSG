const canvas = document.getElementById('titleCanvas');
const ctx = canvas.getContext('2d');

/* ─── mouse repulsion ───────────────────────────── */
let mouse = { x: null, y: null, radius: 60 };
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = null; });

/* ─── autonomous sweep circle (adds life) ───────── */
let autoCircle = { x: 0, y: 0, radius: 34, vx: 1.2 };

/* ─── Particle class ────────────────────────────── */
class Particle {
    constructor(x, y) {
        this.baseX = x; this.baseY = y;
        this.x = x + (Math.random() - .5) * 20;
        this.y = y + (Math.random() - .5) * 20;
        this.size = Math.random() * .6 + 1.6;
        this.density = Math.random() * 25 + 5;
        this.vx = this.vy = 0;
        this.hue = 180 + Math.random() * 60;
    }
    draw() {
        ctx.fillStyle = `hsla(${this.hue},80%,60%,.85)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    update() {
        /* mouse repulsion */
        if (mouse.x !== null) {
            const dx = this.x - mouse.x, dy = this.y - mouse.y, d = Math.hypot(dx, dy);
            if (d < mouse.radius) {
                const f = (mouse.radius - d) / mouse.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }
        /* auto-circle repulsion */
        {
            const dx = this.x - autoCircle.x, dy = this.y - autoCircle.y, d = Math.hypot(dx, dy);
            if (d < autoCircle.radius) {
                const f = (autoCircle.radius - d) / autoCircle.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }
        /* return spring */
        this.vx += (this.baseX - this.x) / (this.density * 10);
        this.vy += (this.baseY - this.y) / (this.density * 10);

        /* friction + move */
        this.vx *= .9; this.vy *= .9;
        this.x += this.vx; this.y += this.vy;

        /* subtle hue shift */
        this.hue = (this.hue + .4) % 360;
    }
}

/* ─── Build particle field from “MPSG” text ─────── */
let particles = [];
function initParticles() {
    particles = [];

    const TEXT = "MPSG";

    /* ── 1. create off-screen canvas sized to text width ── */
    const temp = document.createElement('canvas');
    const tctx = temp.getContext('2d');
    tctx.font = 'bold 100px Inter, Helvetica, sans-serif';      // ↓ you can tweak size
    const metrics = tctx.measureText(TEXT);
    temp.width = Math.ceil(metrics.width) + 20;               // little margin
    temp.height = 140;                                         // matches CSS height

    /* ── 2. draw text into that buffer ── */
    tctx.fillStyle = '#000';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = 'bold 100px Inter, Helvetica, sans-serif';
    tctx.fillText(TEXT, temp.width / 2, temp.height / 2);

    /* ── 3. scatter particles wherever alpha > 128 ── */
    const data = tctx.getImageData(0, 0, temp.width, temp.height).data;
    const dpr = window.devicePixelRatio || 1;
    const offX = (canvas.width / dpr - temp.width) / 2;
    const offY = (canvas.height / dpr - temp.height) / 2;
    const gap = 6;                 // particle spacing

    for (let y = 0; y < temp.height; y += gap) {
        for (let x = 0; x < temp.width; x += gap) {
            if (data[(y * temp.width + x) * 4 + 3] > 128) {
                particles.push(new Particle(x + offX, y + offY));
            }
        }
    }
}


/* ─── Background & links between particles ─────── */
let gradAngle = 0;
function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);   // fully transparent
}

function connect() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.hypot(dx, dy);
            if (d < 15) {
                ctx.strokeStyle = `hsla(${particles[i].hue},80%,60%,${.5 - .5 * (d / 15)})`;
                ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
            }
        }
    }
}

/* ─── Animation loop ───────────────────────────── */
function animate() {
    drawBackground();

    /* sweep circle motion */
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    autoCircle.x += autoCircle.vx;
    if (autoCircle.x > w + autoCircle.radius) autoCircle.x = -autoCircle.radius;

    particles.forEach(p => { p.update(); p.draw(); });
    connect();
    requestAnimationFrame(animate);
}

/* ─── Resize handler ───────────────────────────── */
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
