---
layout: default
title: ""
permalink: /
author_profile: false
---

<!-- Fonts & Icons -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">

<style>
:root{
  --accent1:#364f6b;   /* deep slate */
  --accent2:#809bce;   /* soft steel */
  --gray-750:#2e3440;
  --gray-500:#4f5b66;
  --gray-150:#e5e9f0;
}

/* ── HERO CANVAS ─────────────────────────────────────────────── */
#titleCanvas {
  display: block;
  margin: 0 auto;
  width: min(90vw, 500px); /* scale to viewport width */
  height: auto;           /* let browser auto-scale height */
  max-width: 100%;        /* never overflow parent */
  aspect-ratio: 5 / 2;    /* preserve proportions */
}

/* ── HERO BLOCK ──────────────────────────────────────────────── */
.hero{
  text-align:center;
  padding:1.5rem 1rem 1.5rem; /* (top | sides | bottom) */
  background:#fff;
}

@media (max-width: 480px) {
  .hero {
    padding: 1rem 0.5rem 1.5rem; /* reduce side padding on mobile */
  }
}

.hero-heading{
  font-size:clamp(1.6rem,4vw,2.4rem);
  font-weight:700;
  letter-spacing:-0.4px;
  margin:0 0 0.25rem;  /* much tighter gap */
  color:var(--gray-750);
}

.mission {
  font-size: 1.2rem;        /* Slightly larger than body text */
  line-height: 1.6;         /* Comfortable spacing */
  color: var(--gray-500);   /* Softer than pure black */
  max-width: 720px;         /* Restrict width for better readability */
  margin: 0.5rem auto 2.5rem; /* Centered and spaced vertically */
  text-align: center;
  font-weight: 400;
}
.mission::before {
  content: "";
  display: block;
  width: 50px;
  height: 3px;
  background: var(--accent1);
  margin: 0 auto 1rem;
  border-radius: 2px;
  opacity: 0.7;
}

/* ── RESEARCH CARDS ──────────────────────────────────────────── */
.grid{
  display:grid;
  gap:1.4rem;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  max-width:1100px;
  margin:0 auto 4rem;
  padding:0 1rem;
}
.card{
  background:#fff;
  border:1px solid var(--gray-150);
  border-radius:12px;
  padding:1.25rem 1.35rem;
  transition:transform .25s,border-color .25s;
  transform-style:preserve-3d;
  perspective:600px;
}
.card:hover{border-color:var(--accent1);transform:translateY(-4px) rotateX(3deg) rotateY(-3deg)}
.card h3{font-size:1rem;margin-bottom:.6rem;color:var(--accent1)}
.card p{margin:0;font-size:.88rem;color:var(--gray-500)}

/* ── FOOTER ──────────────────────────────────────────────────── */
.footer{
  border-top:1px solid var(--gray-150);
  padding:1rem 0;
  text-align:center;
  font-size:.8rem;
  color:var(--gray-500);
}
</style>

<!-- ── HERO ──────────────────────────────────────────────────── -->
<section class="hero">
  <h1 class="hero-heading">Molecular Physics Simulation Group</h1>

  <canvas id="titleCanvas"></canvas>

  <p class="mission">
    We harness cutting-edge computer simulations to engineer at the molecular and quantum levels, driving innovative solutions to industrial challenges.
  </p>
</section>

<!-- ── RESEARCH PILLARS ──────────────────────────────────────── -->
<div class="grid">
  <!-- 1 › Multiscale simulation technique -->
  <div class="card">
    <h3><i class="fa-solid fa-cubes"></i> Innovative Multiscale Simulation</h3>
    <p>
      We aim to develop computational simulation techniques that seamlessly bridge <strong>quantum ↔ atomistic ↔ continuum</strong> physics. Our current interests include machine-learning molecular dynamics and extended/generalized Lattice-Boltzmann methods, while we remain open to any innovative ideas for novel simulation approaches.
    </p>
  </div>

  <!-- 2 › Molecular–quantum biomimetic engineering -->
  <div class="card">
    <h3><i class="fa-solid fa-dna"></i> Molecular-Quantum Biomimetic Engineering</h3>
    <p>
      Biological systems perform intelligence, energy conversion, learning, and molecular separation with remarkable efficiency and sustainability. Our research seeks to implement the molecular–quantum principles of living systems in engineered devices.
    </p>
  </div>

  <!-- 3 › Foundational mathematical theory -->
  <div class="card">
    <h3><i class="fa-solid fa-compass-drafting"></i> Foundational Transport Theory</h3>
    <p>
      Developing a foundational theory for atomistic physics has long been a dream in physical chemistry and statistical physics. By leveraging cutting-edge atomistic simulations, we aim to establish an advanced theoretical framework for atomistic phenomena, including nanoscale thermal–fluid transport and beyond.
    </p>
  </div>
</div>

<!-- p5 hero graphic -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.5.0/p5.min.js"></script>
<script src="{{ '/assets/js/hero_graphic.js' | relative_url }}"></script>

<!-- Fade-in cards -->
<script>
document.addEventListener('DOMContentLoaded',()=>{
  const cards = document.querySelectorAll('.card');
  const io = new IntersectionObserver(entries =>
    entries.forEach(e=> e.isIntersecting && e.target.classList.add('in')),
    { threshold: .15 }
  );
  cards.forEach(c=> io.observe(c));
});
</script>