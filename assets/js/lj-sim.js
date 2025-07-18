// 2D Lennard-Jones MD sim for Argon (p5.js)
// Features: glowing two atom groups, toggleable NVE/NVT, adjustable playback speed,
// interactive "mouse obstacle" (spring‐force), plus "MMSL" spelled by red atoms.

let atoms = [];
let lastMouseSimX, lastMouseSimY;

const N_init = 400;
const boxWidth = 48;
const boxHeight = 18;
const sigma = 1.0;
const epsilon = 5.0;
const mass = 1.0;
const kb = 1.0;
const dt = 0.01;
const gravityX = 0;

const T_low = 1.5;
const T_high = 4.0;
const T_target = 2.5;

let stepsPerFrame = 5;
let paused = true;
let useThermostat = false;

const canvasPxX = 350;
const canvasPxY = (canvasPxX * boxHeight) / boxWidth;
const displayScaleX = canvasPxX / boxWidth;
const displayScaleY = canvasPxY / boxHeight;
const atomDisplaySize = sigma * Math.min(displayScaleX, displayScaleY) * 0.95;
const maxLocalTemp = 500 * Math.pow(4 * Math.sqrt(kb * T_target / mass), 2);

// Mouse atom parameters
const mousescale = 2.5
const mouseRadius = mousescale * sigma;
const springK = 1000;  // spring constant for repulsion

function addAtom(xArg = null, yArg = null, groupArg = null) {
    let tries = 5;
    while (tries-- > 0) {
        const px = xArg !== null ? xArg : random(boxWidth);
        const py = yArg !== null ? yArg : random(boxHeight);
        if (atoms.some(a => {
            let dx = px - a.x; dx -= boxWidth * round(dx / boxWidth);
            let dy = py - a.y; dy -= boxHeight * round(dy / boxHeight);
            return sqrt(dx * dx + dy * dy) < 0.95 * sigma;
        })) continue;

        const group = groupArg !== null ? groupArg : 0;
        const vScale = sqrt(kb * (group === 0 ? T_low : T_high) / mass);
        atoms.push({ x: px, y: py, vx: randomGaussian() * vScale, vy: randomGaussian() * vScale, fx: 0, fy: 0, group });
        return;
    }
}

function findSafeMouseStart() {
    const margin = sigma + mouseRadius;
    const step = mouseRadius;
    for (let y = margin; y < boxHeight - margin; y += step) {
        for (let x = margin; x < boxWidth - margin; x += step) {
            const safe = atoms.every(a => {
                let dx = a.x - x; dx -= boxWidth * round(dx / boxWidth);
                let dy = a.y - y; dy -= boxHeight * round(dy / boxHeight);
                return sqrt(dx * dx + dy * dy) >= margin;
            });
            if (safe) { lastMouseSimX = x; lastMouseSimY = y; return; }
        }
    }
    lastMouseSimX = boxWidth / 2; lastMouseSimY = boxHeight / 2;
}

function setup() {
    atoms = [];
    paused = true;
    createCanvas(canvasPxX, canvasPxY).parent('p5-canvas');
    colorMode(HSB, 360, 100, 100, 255);
    frameRate(60);
    setTimeout(() => paused = false, 3000);

    // Render MMSL into offscreen buffer
    let pg = createGraphics(boxWidth, boxHeight);
    pg.pixelDensity(1);
    pg.background(0);
    pg.stroke(0); pg.strokeWeight(2);
    pg.fill(255, 255, 0);
    pg.textAlign(CENTER, CENTER);
    pg.textSize(boxHeight * 0.8);
    pg.text('MMSL', boxWidth / 2, boxHeight / 2 + boxHeight * 0.05);
    pg.loadPixels();

    let redPixels = [];
    for (let y = 0; y < boxHeight; y++) {
        for (let x = 0; x < boxWidth; x++) {
            if (pg.pixels[4 * (y * boxWidth + x)] > 128) redPixels.push({ x: x + 0.5, y: y + 0.5 });
        }
    }
    redPixels.forEach(p => addAtom(p.x, p.y, 1));
    while (atoms.length < N_init) addAtom();

    findSafeMouseStart();
    // start the 30 s clock
    lastRestartTime = millis();
}

function draw() {
    if (millis() - lastRestartTime > 60000) {
        setup();
        return;  // skip one frame so we don’t immediately simulate/draw
    }

    background(255);

    if (paused) {
        push(); fill(60, 100, 100, 180); stroke(0); strokeWeight(3);
        textAlign(CENTER, CENTER);
        textSize(boxHeight * displayScaleY * 0.8);
        text('MMSL', width / 2, height / 2 + displayScaleY * 0.05);
        pop();
    }

    noFill(); stroke(0);
    const ctx = drawingContext;
    ctx.setLineDash([5, 5]); rect(0, 0, width, height);

    if (!paused) for (let i = 0; i < stepsPerFrame; i++) simulateStep();

    noStroke();
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.shadowBlur = atomDisplaySize * 1.5;
    atoms.forEach(a => {
        const localT = 0.5 * (a.vx * a.vx + a.vy * a.vy);
        const alpha = map(localT, 0, 3 * T_target, 50, 255);
        const hue = a.group === 0 ? 220 : 0;
        fill(hue, 80, 80, alpha);
        ctx.shadowColor = a.group === 0
            ? `rgba(30,144,255,${alpha / 255})`
            : `rgba(255,50,50,${alpha / 255})`;
        ellipse(a.x * displayScaleX, a.y * displayScaleY, atomDisplaySize);
    });
    ctx.shadowBlur = 0;

    // mouse‐atom sticks exactly to cursor
    const rawX = mouseX / displayScaleX;
    const rawY = mouseY / displayScaleY;
    const candidateX = rawX;
    const candidateY = rawY;

    if (!paused) {
        lastMouseSimX = candidateX;
        lastMouseSimY = candidateY;
    } else {
        const minD = sigma + mouseRadius;
        if (atoms.every(a => {
            let ddx = a.x - candidateX; ddx -= boxWidth * round(ddx / boxWidth);
            let ddy = a.y - candidateY; ddy -= boxHeight * round(ddy / boxHeight);
            return sqrt(ddx * ddx + ddy * ddy) >= minD;
        })) {
            lastMouseSimX = candidateX;
            lastMouseSimY = candidateY;
        }
    }

    // only draw the green “mouse atom” when NOT paused
    if (!paused) {
        push();
        noStroke();
        fill(120, 80, 80, 100);
        ellipse(
            lastMouseSimX * displayScaleX,
            lastMouseSimY * displayScaleY,
            mouseRadius * 2 * displayScaleX
        );
        pop();
    }
}

function simulateStep() {
    atoms.forEach(a => { a.vx += 0.5 * (a.fx / mass) * dt; a.vy += 0.5 * (a.fy / mass) * dt; });
    atoms.forEach(a => {
        a.x = (a.x + a.vx * dt + boxWidth) % boxWidth;
        a.y = (a.y + a.vy * dt + boxHeight) % boxHeight;
        a.fx = a.fy = 0;
    });
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            let [fx, fy] = ljForce(atoms[i], atoms[j]);
            atoms[i].fx += fx; atoms[i].fy += fy;
            atoms[j].fx -= fx; atoms[j].fy -= fy;
        }
    }
    atoms.forEach(a => a.fx += gravityX);
    applyMouseInteraction();
    atoms.forEach(a => { a.vx += 0.5 * (a.fx / mass) * dt; a.vy += 0.5 * (a.fy / mass) * dt; });
    if (useThermostat) {
        let ke = atoms.reduce((s, a) => s + 0.5 * mass * (a.vx * a.vx + a.vy * a.vy), 0);
        let T_inst = (2 * ke) / (2 * atoms.length * kb);
        let scale = sqrt(T_target / T_inst);
        atoms.forEach(a => { a.vx *= scale; a.vy *= scale; });
    }
    const maxDisp = 0.05 * sigma;
    const vmax = maxDisp / dt;
    atoms.forEach(a => {
        a.vx = constrain(a.vx, -vmax, vmax);
        a.vy = constrain(a.vy, -vmax, vmax);
    });
}

function ljForce(p1, p2) {
    let dx = p1.x - p2.x, dy = p1.y - p2.y;
    dx -= boxWidth * round(dx / boxWidth);
    dy -= boxHeight * round(dy / boxHeight);
    let r2 = dx * dx + dy * dy;
    if (r2 === 0) return [0, 0];
    let ir2 = 1 / r2, ir6 = ir2 * ir2 * ir2;
    let f = 48 * epsilon * ir6 * (ir6 - 0.5) * ir2;
    return [f * dx, f * dy];
}

function applyMouseInteraction() {
    const cx = lastMouseSimX, cy = lastMouseSimY;
    const r0 = mouseRadius;
    atoms.forEach(a => {
        let dx = a.x - cx, dy = a.y - cy;
        dx -= boxWidth * round(dx / boxWidth);
        dy -= boxHeight * round(dy / boxHeight);
        let r2 = dx * dx + dy * dy;
        if (r2 < r0 * r0) {
            let r = sqrt(r2) || r0;
            let overlap = r0 - r;
            let nx = dx / r, ny = dy / r;
            let F = springK * overlap;
            a.fx += F * nx;
            a.fy += F * ny;
        }
    });
}

function keyPressed() {
    if (key === ' ') paused = !paused;
    else if (key === 't') useThermostat = !useThermostat;
    else if (key === '+') stepsPerFrame++;
    else if (key === '-') stepsPerFrame = max(1, stepsPerFrame - 1);
}
