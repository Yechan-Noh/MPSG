// 2D Lennard-Jones MD simulation for Argon using Nosé–Hoover thermostat (p5.js)
// Modified: 2:1 box aspect ratio and vertical solid line with a central hole
// Units: σ = 1.0, ε = 1.0, m = 1.0, kB = 1.0 (reduced units)
// T* = 2.5 (≈300 K), dt = 0.01 (≈20 fs)

let atoms = [];
const N_init = 100;
const boxWidth = 20;   // σ units (x-dimension)
const boxHeight = 10;  // σ units (y-dimension)
const sigma = 1.0;
const epsilon = 1.5;
const mass = 1.0;
const kb = 1.0;
const T_target = 2.5;
const dt = 0.01;
const gravityX = 1;
// Nosé–Hoover thermostat parameters
const Q = 1 * N_init * kb * T_target;    // Q = dof * kB * T_target (dof = 2·N_init)
let xi = 0.0;    // thermostat friction variable       // thermostat friction variable

// Visualization
const canvasPxX = 500;
const canvasPxY = (canvasPxX * boxHeight) / boxWidth;
const displayScaleX = canvasPxX / boxWidth;
const displayScaleY = canvasPxY / boxHeight;
const atomDisplaySize = sigma * Math.min(displayScaleX, displayScaleY) * 0.90;

const solids = [];
const holeYs = [
    boxHeight / 2,           // center
    boxHeight / 2 - 3,       // just below center
    boxHeight / 2 + 3        // just above center
];

for (let y = 0; y <= boxHeight; y++) {
    if (!holeYs.includes(y)) {
        solids.push({ x: boxWidth / 2, y: y });
    }
}

let paused = false;

function setup() {
    let canvas = createCanvas(canvasPxX, canvasPxY);
    canvas.parent("p5-canvas");
    // Add initial fluid atoms avoiding solids
    for (let i = 0; i < N_init; i++) addAtom();
}

function draw() {
    background(255);

    // Draw simulation box
    stroke(0);
    noFill();
    rect(0, 0, width, height);

    // Draw static solids
    noStroke();
    fill(150);
    solids.forEach(s => {
        let sx = s.x * displayScaleX;
        let sy = s.y * displayScaleY;
        ellipse(sx, sy, atomDisplaySize * 1.1, atomDisplaySize * 1.1);
    });

    if (!paused) {
        // Half-step velocity update (forces + friction)
        atoms.forEach(a => {
            a.vx += 0.5 * (a.fx / mass) * dt - 0.5 * xi * a.vx * dt;
            a.vy += 0.5 * (a.fy / mass) * dt - 0.5 * xi * a.vy * dt;
        });

        // Position update
        atoms.forEach(a => {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.x = (a.x + boxWidth) % boxWidth;
            a.y = (a.y + boxHeight) % boxHeight;
        });

        // Recompute forces
        atoms.forEach(a => { a.fx = 0; a.fy = 0; });
        for (let i = 0; i < atoms.length; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                let [fx, fy] = ljForce(atoms[i], atoms[j], boxWidth, boxHeight);
                atoms[i].fx += fx;
                atoms[i].fy += fy;
                atoms[j].fx -= fx;
                atoms[j].fy -= fy;
            }
        }
        atoms.forEach(a => {
            solids.forEach(s => {
                let [fx, fy] = ljForce(a, s, boxWidth, boxHeight);
                a.fx += fx;
                a.fy += fy;
            });
        });

        // Add constant x-direction gravity force to fluid atoms
        atoms.forEach(a => {
            a.fx += gravityX;
        });

        // Instantaneous temperature (after half-step velocities)
        let ke = 0;
        atoms.forEach(a => {
            ke += 0.5 * mass * (a.vx * a.vx + a.vy * a.vy);
        });
        let dof = 2 * atoms.length;
        let T_inst = (2 * ke) / (dof * kb);

        // Update xi (friction coefficient)
        xi += dt * (T_inst - T_target) * (dof * kb) / Q;

        // Complete velocity update (forces + new xi)
        atoms.forEach(a => {
            a.vx += 0.5 * (a.fx / mass) * dt - 0.5 * xi * a.vx * dt;
            a.vy += 0.5 * (a.fy / mass) * dt - 0.5 * xi * a.vy * dt;
        });
    }

    // ——————————————————————————————
    // Draw glowing blue atoms (works on white)
    // ——————————————————————————————
    noStroke();
    const ctx = drawingContext;            // grab native CanvasRenderingContext2D
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = atomDisplaySize * 2;      // how “soft” the glow is
    ctx.shadowColor = 'rgba(30,144,255,0.7)';    // glow color + opacity

    fill(30, 144, 255);                     // core fill
    atoms.forEach(a => {
        const sx = a.x * displayScaleX;
        const sy = a.y * displayScaleY;
        ellipse(sx, sy, atomDisplaySize);
    });

    // turn off shadow for everything else
    ctx.shadowBlur = 0;
    blendMode(BLEND);

    // Display stats
    fill(0);
    noStroke();
    textSize(14);
    text(`Atoms: ${atoms.length}`, 10, height - 40);
    text(`T*: ${computeTemperature().toFixed(3)}`, 10, height - 20);
}

// Lennard-Jones force with periodic boundaries
function ljForce(p1, p2, bw, bh) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    dx -= bw * round(dx / bw);
    dy -= bh * round(dy / bh);
    let r2 = dx * dx + dy * dy;
    if (r2 === 0) return [0, 0];
    let invr2 = 1.0 / r2;
    let invr6 = invr2 * invr2 * invr2;
    let fmag = 48 * epsilon * invr6 * (invr6 - 0.5) * invr2;
    return [fmag * dx, fmag * dy];
}

// Add a new fluid atom avoiding overlap
function addAtom(x = null, y = null) {
    let tries = 100;
    while (tries-- > 0) {
        let px = x !== null ? x : random(boxWidth);
        let py = y !== null ? y : random(boxHeight);

        // Check solids
        let tooCloseToSolid = solids.some(s => {
            let dx = px - s.x;
            dx -= boxWidth * round(dx / boxWidth);
            let dy = py - s.y;
            dy -= boxHeight * round(dy / boxHeight);
            return sqrt(dx * dx + dy * dy) < 0.95 * sigma;
        });
        if (tooCloseToSolid) continue;

        // Check fluid atoms
        let tooCloseToAtoms = atoms.some(a => {
            let dx = px - a.x;
            dx -= boxWidth * round(dx / boxWidth);
            let dy = py - a.y;
            dy -= boxHeight * round(dy / boxHeight);
            return sqrt(dx * dx + dy * dy) < 0.90 * sigma;
        });
        if (tooCloseToAtoms) continue;

        // Accept position and add atom
        let vScale = sqrt(kb * T_target / mass);
        atoms.push({
            x: px,
            y: py,
            vx: randomGaussian() * vScale,
            vy: randomGaussian() * vScale,
            fx: 0,
            fy: 0
        });
        return; // added successfully
    }
}

// Compute instantaneous temperature
function computeTemperature() {
    let ke = 0;
    atoms.forEach(a => ke += 0.5 * mass * (a.vx * a.vx + a.vy * a.vy));
    let dof = 2 * atoms.length;
    return (2 * ke) / (dof * kb);
}

// Mouse click to add atom
function mousePressed() {
    let mx = map(mouseX, 0, width, 0, boxWidth);
    let my = map(mouseY, 0, height, 0, boxHeight);
    addAtom(mx, my);
}

// Controls: space to pause, R to reset
function keyPressed() {
    if (key === ' ') paused = !paused;
    if (key === 'r' || key === 'R') {
        atoms = [];
        for (let i = 0; i < N_init; i++) addAtom();
    }
}
