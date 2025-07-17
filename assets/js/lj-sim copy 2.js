// 2D Lennard-Jones MD simulation for Argon (p5.js)
// Features: glowing two atom groups, toggleable NVE/NVT, adjustable playback speed, clickable atom addition

let atoms = [];
const N_init = 150;
const boxWidth = 40;
const boxHeight = 20;
const sigma = 1.0;
const epsilon = 1.5;
const mass = 1.0;
const kb = 1.0;
const dt = 0.01;
const gravityX = 0;

// Temperatures
const T_low = 1.5;
const T_high = 4.0;
const T_target = 2.5;

// Playback & ensemble
let stepsPerFrame = 10;
let paused = false;
let useThermostat = false;  // NVE vs NVT

// Visualization
const canvasPxX = 400;
const canvasPxY = (canvasPxX * boxHeight) / boxWidth;
const displayScaleX = canvasPxX / boxWidth;
const displayScaleY = canvasPxY / boxHeight;
const atomDisplaySize = sigma * Math.min(displayScaleX, displayScaleY) * 0.99;
const maxLocalTemp = 0.5 * Math.pow(4 * Math.sqrt(kb * T_target / mass), 2);

function setup() {
    createCanvas(canvasPxX, canvasPxY).parent('p5-canvas');
    colorMode(HSB, 360, 100, 100, 255);
    frameRate(60);
    for (let i = 0; i < N_init; i++) addAtom();
}

function draw() {
    background(255);

    // Dotted gray box outline
    noFill();
    stroke(0);
    const ctx = drawingContext;
    ctx.setLineDash([5, 5]);
    rect(0, 0, width, height);

    // Advance simulation
    if (!paused) {
        for (let i = 0; i < stepsPerFrame; i++) simulateStep();
    }

    // Draw glowing atoms
    noStroke();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = atomDisplaySize * 2;

    atoms.forEach(a => {
        const localTemp = 0.5 * (a.vx * a.vx + a.vy * a.vy);
        const alpha = map(localTemp, 0, maxLocalTemp, 50, 255);
        const hue = a.group === 0 ? 220 : 0;
        fill(hue, 80, 80, alpha);
        ctx.shadowColor = a.group === 0
            ? `rgba(30,144,255,${alpha / 255})`
            : `rgba(255,50,50,${alpha / 255})`;
        const sx = a.x * displayScaleX;
        const sy = a.y * displayScaleY;
        ellipse(sx, sy, atomDisplaySize);
    });

    ctx.shadowBlur = 0;

    // Display info
    fill(0);
    noStroke();
    textSize(12);
    text(`Ensemble: ${useThermostat ? 'NVT' : 'NVE'}`, 10, height - 50);
    text(`Steps/frame: ${stepsPerFrame}`, 10, height - 35);
    text(`Paused: ${paused}`, 10, height - 20);
}

// Single integration step
function simulateStep() {
    // half-step velocity
    atoms.forEach(a => {
        a.vx += 0.5 * (a.fx / mass) * dt;
        a.vy += 0.5 * (a.fy / mass) * dt;
    });

    // positions + clear forces
    atoms.forEach(a => {
        a.x = (a.x + a.vx * dt + boxWidth) % boxWidth;
        a.y = (a.y + a.vy * dt + boxHeight) % boxHeight;
        a.fx = 0;
        a.fy = 0;
    });

    // LJ forces
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            const [fx, fy] = ljForce(atoms[i], atoms[j]);
            atoms[i].fx += fx;
            atoms[i].fy += fy;
            atoms[j].fx -= fx;
            atoms[j].fy -= fy;
        }
    }
    atoms.forEach(a => a.fx += gravityX);

    // second half-step velocity
    atoms.forEach(a => {
        a.vx += 0.5 * (a.fx / mass) * dt;
        a.vy += 0.5 * (a.fy / mass) * dt;
    });

    // velocity-scaling thermostat
    if (useThermostat) {
        let ke = atoms.reduce((sum, a) => sum + 0.5 * mass * (a.vx * a.vx + a.vy * a.vy), 0);
        let T_inst = (2 * ke) / (2 * atoms.length * kb);
        let scale = sqrt(T_target / T_inst);
        atoms.forEach(a => {
            a.vx *= scale;
            a.vy *= scale;
        });
    }
}

function ljForce(p1, p2) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    dx -= boxWidth * round(dx / boxWidth);
    dy -= boxHeight * round(dy / boxHeight);
    let r2 = dx * dx + dy * dy;
    if (r2 === 0) return [0, 0];
    let invr2 = 1 / r2;
    let invr6 = invr2 * invr2 * invr2;
    let fmag = 48 * epsilon * invr6 * (invr6 - 0.5) * invr2;
    return [fmag * dx, fmag * dy];
}

// Add atom with optional coords
function addAtom(xArg = null, yArg = null) {
    let tries = 100;
    while (tries-- > 0) {
        let px = xArg !== null ? xArg : random(boxWidth);
        let py = yArg !== null ? yArg : random(boxHeight);
        if (atoms.some(a => {
            let dx = px - a.x; dx -= boxWidth * round(dx / boxWidth);
            let dy = py - a.y; dy -= boxHeight * round(dy / boxHeight);
            return sqrt(dx * dx + dy * dy) < 0.95 * sigma;
        })) continue;
        let group = px < boxWidth / 2 ? 0 : 1;
        let vScale = sqrt(kb * (group === 0 ? T_low : T_high) / mass);
        atoms.push({ x: px, y: py, vx: randomGaussian() * vScale, vy: randomGaussian() * vScale, fx: 0, fy: 0, group });
        return;
    }
}

function mousePressed() {
    let simX = mouseX / displayScaleX;
    let simY = mouseY / displayScaleY;
    addAtom(simX, simY);
}

function keyPressed() {
    if (key === ' ') paused = !paused;
    if (key === 't') useThermostat = !useThermostat;
    if (key === '+') stepsPerFrame++;
    if (key === '-') stepsPerFrame = max(1, stepsPerFrame - 1);
}
