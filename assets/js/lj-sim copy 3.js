// 2D Lennard-Jones MD sim for Argon (p5.js)
// Features: glowing two atom groups, toggleable NVE/NVT, adjustable playback speed,
// clickable atom addition, plus “MMSL” spelled by red atoms.

let atoms = [];
const N_init = 350;
const N_red = 250;   // number of red atoms to form "MMSL"
const boxWidth = 48;
const boxHeight = 18;
const sigma = 1.0;
const epsilon = 2.5;
const mass = 1.0;
const kb = 1.0;
const dt = 0.01;
const gravityX = 0;

// Temperatures
const T_low = 1.5;
const T_high = 4.0;
const T_target = 2.5;

// Playback & ensemble
let stepsPerFrame = 8;
let paused = true;   // start frozen for 5 s
let useThermostat = false;

// Visualization
const canvasPxX = 350;
const canvasPxY = (canvasPxX * boxHeight) / boxWidth;
const displayScaleX = canvasPxX / boxWidth;
const displayScaleY = canvasPxY / boxHeight;
const atomDisplaySize = sigma * Math.min(displayScaleX, displayScaleY) * 0.95;
const maxLocalTemp = 0.2 * Math.pow(4 * Math.sqrt(kb * T_target / mass), 2);

// single addAtom, optionally forced position & group
function addAtom(xArg = null, yArg = null, groupArg = null) {
    let tries = 5;
    while (tries-- > 0) {
        let px = xArg !== null ? xArg : random(boxWidth);
        let py = yArg !== null ? yArg : random(boxHeight);
        // avoid collisions
        if (atoms.some(a => {
            let dx = px - a.x; dx -= boxWidth * round(dx / boxWidth);
            let dy = py - a.y; dy -= boxHeight * round(dy / boxHeight);
            return sqrt(dx * dx + dy * dy) < 0.95 * sigma;
        })) continue;

        let group = (groupArg !== null)
            ? groupArg
            : 0;
        let vScale = sqrt(kb * (group === 0 ? T_low : T_high) / mass);
        atoms.push({
            x: px,
            y: py,
            vx: randomGaussian() * vScale,
            vy: randomGaussian() * vScale,
            fx: 0,
            fy: 0,
            group
        });
        return;
    }
}

function setup() {
    // 0) clear any old atoms
    atoms = [];

    // 1) canvas + styling
    createCanvas(canvasPxX, canvasPxY).parent('p5-canvas');
    colorMode(HSB, 360, 100, 100, 255);
    frameRate(60);

    // 2) hold that initial static view for 5 s
    setTimeout(() => { paused = false; }, 5000);

    // 3) draw “MMSL” into offscreen 80×20 buffer
    let pg = createGraphics(boxWidth, boxHeight);
    pg.pixelDensity(1);
    pg.background(0);
    pg.stroke(0);
    pg.strokeWeight(2);
    pg.fill(255, 255, 0);
    pg.textAlign(CENTER, CENTER);
    pg.textSize(boxHeight * 0.8);
    pg.text('MMSL', boxWidth / 2, boxHeight / 2 + boxHeight * 0.05);
    pg.loadPixels();

    // 4) collect every bright pixel (centered)
    let redPixels = [];
    for (let y = 0; y < boxHeight; y++) {
        for (let x = 0; x < boxWidth; x++) {
            if (pg.pixels[4 * (y * boxWidth + x)] > 128) {
                redPixels.push({ x: x + 0.5, y: y + 0.5 });
            }
        }
    }

    // 5) place one red atom at each letter‐pixel
    redPixels.forEach(p => addAtom(p.x, p.y, 1));

    // 6) fill the remainder up to N_init with blue atoms
    while (atoms.length < N_init) {
        addAtom();  // defaults to group=0 (blue)
    }
}


function draw() {
    background(255);

    // 0) if still paused, draw dashed-text “MMSL” overlay
    if (paused) {
        push();
        fill(60, 100, 100, 50); //yellow
        stroke(0);
        strokeWeight(3);
        textAlign(CENTER, CENTER);
        textSize(boxHeight * displayScaleY * 0.8);
        text('MMSL',
            width * 0.5,
            height * 0.5 + displayScaleY * 0.05);
        pop();
    }

    // box outline
    noFill(); stroke(0);
    const ctx = drawingContext;
    ctx.setLineDash([5, 5]);
    rect(0, 0, width, height);

    // advance sim if unpaused
    if (!paused) {
        for (let i = 0; i < stepsPerFrame; i++) simulateStep();
    }

    // draw atoms
    noStroke();
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.shadowBlur = atomDisplaySize * 2;
    atoms.forEach(a => {
        const localTemp = 0.5 * (a.vx * a.vx + a.vy * a.vy);
        const alpha = map(localTemp, 0, maxLocalTemp, 50, 255);
        const hue = (a.group === 0 ? 220 : 0);
        fill(hue, 80, 80, alpha);
        ctx.shadowColor = (a.group === 0
            ? `rgba(30,144,255,${alpha / 255})`
            : `rgba(255,50,50,${alpha / 255})`);
        ellipse(
            a.x * displayScaleX,
            a.y * displayScaleY,
            atomDisplaySize
        );
    });
    ctx.shadowBlur = 0;

    // UI text
    //fill(0); noStroke(); textSize(12);
    //text(`Ensemble: ${useThermostat ? 'NVT' : 'NVE'}`, 10, height - 50);
    //text(`Steps/frame: ${stepsPerFrame}`, 10, height - 35);
    //text(`Paused: ${paused}`, 10, height - 20);
}

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
        a.fx = a.fy = 0;
    });
    // Lennard-Jones forces
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            let [fx, fy] = ljForce(atoms[i], atoms[j]);
            atoms[i].fx += fx; atoms[i].fy += fy;
            atoms[j].fx -= fx; atoms[j].fy -= fy;
        }
    }
    atoms.forEach(a => a.fx += gravityX);
    // finish velocity
    atoms.forEach(a => {
        a.vx += 0.5 * (a.fx / mass) * dt;
        a.vy += 0.5 * (a.fy / mass) * dt;
    });
    // optional thermostat
    if (useThermostat) {
        let ke = atoms.reduce((s, a) => s + 0.5 * mass * (a.vx * a.vx + a.vy * a.vy), 0);
        let T_inst = (2 * ke) / (2 * atoms.length * kb);
        let scale = sqrt(T_target / T_inst);
        atoms.forEach(a => { a.vx *= scale; a.vy *= scale; });
    }
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
