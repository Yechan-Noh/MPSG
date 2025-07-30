---
permalink: /
layout: default
title: ""
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

/* hero canvas */
#titleCanvas{
  width: clamp(240px, 72vw, 400px);   /*  ← was 72vw 760px  */
  height: 120px;
  display:block;
  margin:0 auto 1.6rem;
}

html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;margin:0;color:var(--gray-750);line-height:1.55;font-size:15px;background:#fff}
h1,h2,h3{margin:0;font-weight:700;color:var(--gray-750)}
a{color:var(--accent1);text-decoration:none}
a:hover{text-decoration:underline}

/* — Hero — (now white) */
.hero{
  text-align:center;
  padding:4rem 1rem 3rem;
  background:#fff;
}
.mission{font-size:1.04rem;margin-top:.9rem;max-width:740px;margin-inline:auto}

.hero-heading {
  font-size: clamp(1.6rem, 4vw, 2.4rem); 
  font-weight: 700;
  letter-spacing: -0.4px;
  margin: 0 0 1.2rem;
  color: var(--gray-750);
}

/* — Research Cards — */
.grid{
  display:grid;gap:1.4rem;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  max-width:1100px;margin:0 auto 4rem;padding:0 1rem;
}
.card{
  background:#fff;border:1px solid var(--gray-150);border-radius:12px;
  padding:1.25rem 1.35rem;
  transition:transform .25s,border-color .25s;
  transform-style:preserve-3d;perspective:600px;
}
.card:hover{border-color:var(--accent1);transform:translateY(-4px) rotateX(3deg) rotateY(-3deg)}
.card h3{font-size:1rem;margin-bottom:.6rem;color:var(--accent1)}
.card p{margin:0;font-size:.88rem;color:var(--gray-500)}

/* Footer */
.footer{border-top:1px solid var(--gray-150);padding:1rem 0;text-align:center;font-size:.8rem;color:var(--gray-500)}
</style>

<!-- — HERO — -->
<section class="hero">
  <h1 class="hero-heading">Molecular Physics Simulation Group</h1>

  <canvas id="titleCanvas"></canvas>

  <p class="mission">
    Through advance computater simulations, we engineer advanced devices in molecular-quntum level.
  </p>
</section>

<!-- — RESEARCH PILLARS — -->
<div class="grid">
  <div class="card">
    <h3><i class="fa-solid fa-brain"></i> Iontronics &amp; Neuromorphic Interfaces</h3>
    <p>Å-scale ion channels, memristors, and electrochemical logic that emulate synaptic computation with ultra-low energy budgets.</p>
  </div>

  <div class="card">
    <h3><i class="fa-solid fa-dna"></i> Bio-inspired Nanofluidics</h3>
    <p>Selectivity, gating, mechanosensing—translating biological transport principles into synthetic membranes for separations and sensing.</p>
  </div>

  <div class="card">
    <h3><i class="fa-solid fa-rocket"></i> Multiscale Simulation Engines</h3>
    <p>Coupling <strong>DFT ↔ MD ↔ continuum</strong> with ML surrogates & HPC workflows to bridge electronic to device scales.</p>
  </div>
</div>

<!-- — FOOTER — -->
<div class="footer">
  © {{ site.time | date: "%Y" }} MPSG ·
  <a href="mailto:ynoh@nd.edu">Contact</a> ·
  <a href="{{ site.author.googlescholar }}">Google Scholar</a>
</div>

<!-- p5 hero graphic -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.5.0/p5.min.js"></script>
<script src="{{ '/assets/js/lj-hero.js' | relative_url }}"></script>

<!-- Fade-in cards -->
<script>
document.addEventListener('DOMContentLoaded',()=>{
  const cards=document.querySelectorAll('.card');
  const io=new IntersectionObserver(e=>e.forEach(i=>i.isIntersecting&&i.target.classList.add('in')),
                                    {threshold:.15});
  cards.forEach(c=>io.observe(c));
});
</script>
