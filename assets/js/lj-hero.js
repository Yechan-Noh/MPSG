/*  lj-hero.js  ──────────────────────────────────────────────────────────
    Animated “MPSG” particle logo + fire-ball style repeller
    © 2025 Molecular Physics Simulation Group
------------------------------------------------------------------------ */

(() => {
    const canvas = document.getElementById('titleCanvas');
    if (!canvas) return;                       // canvas might not exist on every page
    const ctx = canvas.getContext('2d', { alpha: true });

    /* ─── Mouse repulsion ────────────────────────────────────────────── */
    const mouse = { x: null, y: null, radius: 60 };
    canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = null; });

    /* ─── Fire-ball repeller (“autoCircle”) ──────────────────────────── */
    const autoCircle = {
        x: 0, y: 0,
        radius: 24,          // physics radius for repulsion
        vx: 2.4,             // horizontal speed
        coreR: 10,           // size of bright head
        hueHead: 45,         // hot yellow-orange
        hueTail: 5,          // deep red tail
        theta: 0, dTheta: 0.04,
        trail: [], trailMax: 18
    };

    /* ─── Particle class ─────────────────────────────────────────────── */
    class Particle {
        constructor(x, y) {
            this.baseX = x; this.baseY = y;
            this.x = x + (Math.random() - 0.5) * 20;
            this.y = y + (Math.random() - 0.5) * 20;
            this.size = Math.random() * 0.2 + 1.8;
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
                let dx = this.x - mouse.x,
                    dy = this.y - mouse.y,
                    d = Math.hypot(dx, dy);
                if (d < mouse.radius && d > 0.0001) {       // avoid divide-by-0
                    const f = (mouse.radius - d) / mouse.radius;
                    this.vx += (dx / d) * f * 2;
                    this.vy += (dy / d) * f * 2;
                }
            }
            /* fire-ball repulsion */
            {
                let dx = this.x - autoCircle.x,
                    dy = this.y - autoCircle.y,
                    d = Math.hypot(dx, dy);
                if (d < autoCircle.radius && d > 0.0001) {
                    const f = (autoCircle.radius - d) / autoCircle.radius;
                    this.vx += (dx / d) * f * 2;
                    this.vy += (dy / d) * f * 2;
                }
            }
            /* spring back & movement */
            this.vx += (this.baseX - this.x) / (this.density * 10);
            this.vy += (this.baseY - this.y) / (this.density * 10);
            this.vx *= 0.9; this.vy *= 0.9;
            this.x += this.vx; this.y += this.vy;
            this.hue = (this.hue + 0.4) % 360;
        }
    }

    /* ─── Build “MPSG” particle mask ────────────────────────────────── */
    const particles = [];
    function initParticles() {
        particles.length = 0;

        const TEXT = 'MPSG';
        const temp = document.createElement('canvas');
        const tctx = temp.getContext('2d');
        tctx.font = 'bold 100px Inter, Helvetica, sans-serif';
        temp.width = Math.ceil(tctx.measureText(TEXT).width) + 20;
        temp.height = 140;

        tctx.fillStyle = '#000';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.font = 'bold 100px Inter, Helvetica, sans-serif';
        tctx.fillText(TEXT, temp.width / 2, temp.height / 2);

        const img = tctx.getImageData(0, 0, temp.width, temp.height).data;
        const dpr = window.devicePixelRatio || 1;
        const offX = (canvas.width / dpr - temp.width) / 2;
        const offY = (canvas.height / dpr - temp.height) / 2;
        const gap = 5;

        for (let y = 0; y < temp.height; y += gap) {
            for (let x = 0; x < temp.width; x += gap) {
                if (img[(y * temp.width + x) * 4 + 3] > 128) {
                    particles.push(new Particle(x + offX, y + offY));
                }
            }
        }
    }

    /* ─── Thin particle connections ─────────────────────────────────── */
    function connect() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x,
                    dy = particles[i].y - particles[j].y,
                    d = Math.hypot(dx, dy);
                if (d < 15) {
                    ctx.strokeStyle =
                        `hsla(${particles[i].hue},80%,60%,${0.5 - 0.5 * (d / 15)})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    /* ─── Main animation loop ───────────────────────────────────────── */
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        /* move the invisible repeller */
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        autoCircle.x += autoCircle.vx;
        if (autoCircle.x > w + autoCircle.radius) autoCircle.x = -autoCircle.radius;

        /* update + draw particles */
        for (const p of particles) { p.update(); p.draw(); }
        connect();

        requestAnimationFrame(animate);
    }

    /* ─── Responsive / Hi-DPI handling ──────────────────────────────── */
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);          // reset transform
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);      // scale all draws
        autoCircle.y = (canvas.height / dpr) * 0.45;
        initParticles();
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
})();
