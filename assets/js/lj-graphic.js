/* ------------------------------------------------------------------ */
/*  Responsive “MPSG” particle logo                                   */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d', { alpha: true });

/* ===== design-time constants ===================================== */
const DESIGN_W = 350;   // logo drawn for 350 × 120 at 120-px font
const DESIGN_H = 120;
const DESIGN_FONT = 120;
const DESIGN_GAP = 6;

/* current scale factor (re-computed on every resize) */
let scale = 1;

/* ===== mouse & auto-repel circle ================================= */
const mouse = { x: null, y: null, radius: 50 };

canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mouseleave', () => (mouse.x = mouse.y = null));

const autoCircle = { x: 0, y: 0, radius: 30, vx: 1 };

/* ===== Particle =================================================== */
class Particle {
    constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.x = x + (Math.random() - .5) * 20 * scale;
        this.y = y + (Math.random() - .5) * 20 * scale;
        this.size = (Math.random() * .5 + 1.8) * scale;
        this.density = (Math.random() * 30 + 5) * scale;
        this.vx = this.vy = 0;
        this.hue = 180 + Math.random() * 60;
    }
    draw() {
        ctx.fillStyle = `hsla(${this.hue},80%,60%,.8)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    update() {
        /* mouse repulsion */
        if (mouse.x !== null) {
            const dx = this.x - mouse.x,
                dy = this.y - mouse.y,
                d = Math.hypot(dx, dy);
            if (d < mouse.radius && d) {
                const f = (mouse.radius - d) / mouse.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }
        /* auto-circle repulsion */
        {
            const dx = this.x - autoCircle.x,
                dy = this.y - autoCircle.y,
                d = Math.hypot(dx, dy);
            if (d < autoCircle.radius && d) {
                const f = (autoCircle.radius - d) / autoCircle.radius;
                this.vx += (dx / d) * f * 2;
                this.vy += (dy / d) * f * 2;
            }
        }
        /* spring home */
        this.vx += (this.baseX - this.x) / (this.density * 10);
        this.vy += (this.baseY - this.y) / (this.density * 10);
        /* friction + move */
        this.vx *= .9; this.vy *= .9;
        this.x += this.vx; this.y += this.vy;
        /* slow hue shift */
        this.hue = (this.hue + .5) % 360;
    }
}

/* ===== particle generation ======================================= */
let particles = [];

function initParticles() {
    particles = [];

    /* 1) choose a scale that fits current canvas width */
    scale = Math.min(1, canvas.clientWidth / DESIGN_W);

    /* 2) draw scaled text into off-screen canvas */
    const temp = document.createElement('canvas');
    temp.width = DESIGN_W * scale;
    temp.height = DESIGN_H * scale;

    const tctx = temp.getContext('2d');
    tctx.fillStyle = '#000';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = `bold ${DESIGN_FONT * scale}px Helvetica, Arial, sans-serif`;
    tctx.fillText('MPSG', temp.width / 2, temp.height / 2);

    /* 3) sample opaque pixels → particles */
    const img = tctx.getImageData(0, 0, temp.width, temp.height).data;
    const dpr = window.devicePixelRatio || 1;
    const offX = (canvas.width / dpr - temp.width) / 2;
    const offY = (canvas.height / dpr - temp.height) / 2;
    const gap = Math.max(2, Math.round(DESIGN_GAP * scale));

    for (let y = 0; y < temp.height; y += gap) {
        for (let x = 0; x < temp.width; x += gap) {
            if (img[(y * temp.width + x) * 4 + 3] > 128) {
                particles.push(new Particle(x + offX, y + offY));
            }
        }
    }
}

/* ===== background and links ====================================== */
function drawBackground() {
    ctx.fillStyle = '#fff';         // no gradient for simplicity
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x,
                dy = particles[i].y - particles[j].y,
                d = Math.hypot(dx, dy);
            if (d < 15 * scale) {
                ctx.strokeStyle = `hsla(${particles[i].hue},80%,60%,${0.5 - 0.5 * (d / (15 * scale))})`;
                ctx.lineWidth = 1.5 * scale;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

/* ===== main loop ================================================= */
function animate() {
    drawBackground();

    /* move auto-circle horizontally */
    const dpr = window.devicePixelRatio || 1,
        width = canvas.width / dpr;
    autoCircle.x += autoCircle.vx;
    if (autoCircle.x > width + autoCircle.radius) autoCircle.x = -autoCircle.radius;

    /* update & draw particles */
    particles.forEach(p => { p.update(); p.draw(); });
    connectParticles();
    requestAnimationFrame(animate);
}

/* ===== resize handler =========================================== */
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);        /* reset */
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);    /* Hi-DPI */

    autoCircle.y = canvas.clientHeight / 2.0;
    initParticles();
}

/* ===== boot ====================================================== */
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animate();
