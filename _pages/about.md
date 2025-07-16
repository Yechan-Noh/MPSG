---
permalink: /
title: "Multiphysics Modeling & Simulation LAB (MMSL)"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

Welcome to the **Multiphysics Modeling & Simulation Lab (MMSL)**, led by Dr. Yechan Noh. Our lab develops advanced computational and theoretical tools to explore **molecular transport phenomena**, with applications in **nanofluidics**, **iontronics**, and **neuromorphic computing**.

<div id="viewer" style="width: 100%; height: 400px;"></div>
<script src="https://3Dmol.csb.pitt.edu/build/3Dmol-min.js"></script>
<script>
  let element = document.getElementById("viewer");
  let config = { backgroundColor: "white" };
  let viewer = $3Dmol.createViewer(element, config);
  $3Dmol.download("pdb:1BNA", viewer, {}, function () {
    viewer.setStyle({}, { stick: {} });
    viewer.zoomTo();
    viewer.render();
  });
</script>

Our research lies at the intersection of physics, chemistry, and engineering. We aim to understand how ions and molecules move through nanoscale environments—especially under confinement, voltage gating, and structural asymmetries—by integrating **molecular dynamics**, **statistical mechanics**, and **continuum models**. These insights are used to design **bio-inspired ionic devices**, such as memristors and artificial ion channels, that emulate the efficiency of biological systems.

We are currently exploring topics including:
- Voltage-gated ion transport through sub-nanometer pores
- Energy landscapes and entropic barriers in ion confinement
- Ionic memristive behavior for low-power neuromorphic systems
- Multiphysics coupling in synthetic membranes

MMSL is committed to open science and interdisciplinary collaboration. Our group values clear communication, computational rigor, and translational impact—from fundamental theory to real-world technologies.

Please explore the site to learn more about our [publications](/publications/), [team members](/people/), and ongoing [research projects](/projects/). If you're interested in collaborating or joining the lab, feel free to [get in touch](/contact/).