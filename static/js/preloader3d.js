// AurexCore 3D Preloader
// Sequence: blank → explode from center → circuit network forms → merge back into honeycomb.
// Exposes: window.AurexPreloader3D.run(onComplete)

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}

// Build one hex prism with bevelled edges — the bevel is what makes it read as real 3D.
function makeHexGeometry() {
  const s = 0.55;                              // radius
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;   // flat-top hex
    const x = Math.cos(a) * s;
    const y = Math.sin(a) * s;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.055,
    bevelSegments: 2,
    curveSegments: 1
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

// Engraved hex-face texture — inner hex outline + short cardinal traces (emissive inlay).
// Applied as emissiveMap so the inlay glows cyan while base stays teal.
function makeHexFaceTexture() {
  const size = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000';                    // black = no emissive (base color shows)
  ctx.fillRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = '#3EDCFF';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Inner hex outline (75% size)
  ctx.lineWidth = 4;
  ctx.beginPath();
  const r = size * 0.34;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  // Second inner hex (smaller, dimmer) — makes it read as an etched chip
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  const r2 = size * 0.22;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const x = Math.cos(a) * r2, y = Math.sin(a) * r2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  // Center dot
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#3EDCFF';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Three short traces radiating from center → outer hex vertices (chip-trace feel)
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Tiny radial-gradient canvas texture — used for glow sprites (center flash + data pulses).
function makeGlowTexture() {
  const size = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(180, 248, 255, 1)');
  g.addColorStop(0.35, 'rgba(62, 220, 255, 0.75)');
  g.addColorStop(0.7, 'rgba(62, 220, 255, 0.15)');
  g.addColorStop(1.0, 'rgba(62, 220, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function run(onComplete) {
  const done = typeof onComplete === 'function' ? onComplete : function () {};
  const preloader = document.getElementById('preloader');
  const canvas = document.getElementById('pl-canvas');
  const wordmark = document.getElementById('plWordmark');
  if (!preloader || !canvas) { done(); return; }

  if (!hasWebGL() || typeof window.gsap === 'undefined') { done(); return; }

  let renderer, composer, bloom, scene, camera, rafId = 0, tl = null, disposed = false;
  let envMap = null, envPMREM = null, breatheTween = null;

  const hexGeo = makeHexGeometry();
  const glowTex = makeGlowTexture();
  const hexFaceTex = makeHexFaceTexture();
  const tubeGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);  // unit cylinder, reposed per circuit
  tubeGeo.translate(0, 0.5, 0);                                      // anchor at base, stretch along +Y
  const hexes = [];
  const circuits = [];
  const pulses = [];
  let particles = null;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (tl) tl.kill();
    if (breatheTween) { try { breatheTween.kill(); } catch (e) {} }
    try { hexGeo.dispose(); } catch (e) {}
    try { tubeGeo.dispose(); } catch (e) {}
    try { glowTex.dispose(); } catch (e) {}
    try { hexFaceTex.dispose(); } catch (e) {}
    if (envMap) { try { envMap.dispose(); } catch (e) {} }
    if (envPMREM) { try { envPMREM.dispose(); } catch (e) {} }
    if (particles) {
      try { particles.geometry.dispose(); } catch (e) {}
      try { particles.material.dispose(); } catch (e) {}
      if (particles.material.map) { try { particles.material.map.dispose(); } catch (e) {} }
    }
    hexes.forEach(function (h) {
      try { h.material.dispose(); } catch (e) {}
    });
    circuits.forEach(function (c) {
      if (c.core) { try { c.core.material.dispose(); } catch (e) {} }
      if (c.halo) { try { c.halo.material.dispose(); } catch (e) {} }
    });
    pulses.forEach(function (p) {
      try { p.sprite.material.dispose(); } catch (e) {}
    });
    if (composer) { try { composer.dispose(); } catch (e) {} }
    if (renderer) { try { renderer.dispose(); } catch (e) {} }
  }

  function finish() {
    preloader.classList.add('is-done');
    setTimeout(function () {
      dispose();
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      done();
    }, 650);
  }

  try {
    const w = window.innerWidth, h = window.innerHeight;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0xffffff, 1);

    scene = new THREE.Scene();
    // Explicit scene background — EffectComposer/RenderPass ignores renderer.setClearColor,
    // so without this the canvas goes black (with alpha:false).
    scene.background = new THREE.Color(0xffffff);
    camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);  // look at world origin — hexes at OX=-1.8 render left of center

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fefff, 0.45);
    rim.position.set(4, -2, 3);
    scene.add(rim);

    // Procedural PMREM environment — gives the bevelled hex faces real specular highlights
    // that track the camera orbit. Biggest single "premium" visual upgrade.
    try {
      envPMREM = new THREE.PMREMGenerator(renderer);
      envPMREM.compileEquirectangularShader();
      const envScene = new THREE.Scene();
      // Ceiling: warm soft light (gives the top bevels a subtle warm kick)
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 20),
        new THREE.MeshBasicMaterial({ color: 0xffe8d8 }));
      ceil.position.y = 5; envScene.add(ceil);
      // Walls: cool cyan (drives the side reflections)
      const wallMat = new THREE.MeshBasicMaterial({ color: 0xb5e8f0 });
      const wN = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.1), wallMat);
      wN.position.z = -5; envScene.add(wN);
      const wS = wN.clone(); wS.position.z = 5; envScene.add(wS);
      const wE = new THREE.Mesh(new THREE.BoxGeometry(0.1, 10, 20), wallMat);
      wE.position.x = 5; envScene.add(wE);
      const wW = wE.clone(); wW.position.x = -5; envScene.add(wW);
      // Floor: deeper teal
      const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 20),
        new THREE.MeshBasicMaterial({ color: 0x2a5555 }));
      floor.position.y = -5; envScene.add(floor);
      envMap = envPMREM.fromScene(envScene, 0.04).texture;
      scene.environment = envMap;
      envScene.traverse(function (o) {
        if (o.geometry) try { o.geometry.dispose(); } catch (e) {}
        if (o.material) try { o.material.dispose(); } catch (e) {}
      });
    } catch (e) {
      scene.environment = null;
    }

    // Pulsing core point-light — drives the "charging" feel during flash & merge.
    // Positioned at cluster-center (not world origin) to illuminate the hex burst.
    const OX_LIGHT = -1.8;
    const corePoint = new THREE.PointLight(0x3EDCFF, 0, 10, 1.7);
    corePoint.position.set(OX_LIGHT, 0, 0.6);
    scene.add(corePoint);

    // Final honeycomb layout — offset LEFT of center so the AUREX CORE wordmark
    // sits to its right (matches reference video framing).
    const OX = -1.8;
    const r = 0.96;
    const clusterTargets = [
      [OX + 0, 0, 0],
      [OX + r * Math.cos(0),                r * Math.sin(0),                0],
      [OX + r * Math.cos(Math.PI / 3),      r * Math.sin(Math.PI / 3),      0],
      [OX + r * Math.cos(2 * Math.PI / 3),  r * Math.sin(2 * Math.PI / 3),  0],
      [OX + r * Math.cos(Math.PI),          r * Math.sin(Math.PI),          0],
      [OX + r * Math.cos(4 * Math.PI / 3),  r * Math.sin(4 * Math.PI / 3),  0],
      [OX + r * Math.cos(5 * Math.PI / 3),  r * Math.sin(5 * Math.PI / 3),  0],
    ];

    // Scatter targets — where each hex flies OUT to before merging back.
    // Burst originates from cluster-center (OX, 0) and radiates outward.
    const scatterTargets = clusterTargets.map(function (_, i) {
      if (i === 0) return [OX, 0, 0];           // core hex stays at cluster center
      const baseAngle = ((i - 1) / 6) * Math.PI * 2;
      const angle = baseAngle + Math.sin(i * 1.7) * 0.18;
      const dist = 2.9 + ((i * 13) % 5) * 0.18;
      const z = -1.4 + ((i * 29) % 11) * 0.28;
      return [OX + Math.cos(angle) * dist, Math.sin(angle) * dist * 0.72, z];
    });

    // Hex meshes — spawn at CLUSTER-CENTER, scale 0, invisible. Blank screen at t=0.
    clusterTargets.forEach(function (target, i) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2E8F8A,
        emissive: 0x3EDCFF,
        emissiveIntensity: 0.25,        // higher — the emissive map inlay is only bright where drawn
        emissiveMap: hexFaceTex,        // engraved chip pattern glows cyan on each face
        metalness: 0.55,
        roughness: 0.38,
        envMapIntensity: 0.7,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(hexGeo, mat);
      // Start at cluster position (assembled) — matches video which opens with full logo visible.
      mesh.position.set(target[0], target[1], target[2]);
      mesh.scale.setScalar(1);

      const seed = i * 2.3 + 1;
      mesh.userData = {
        index: i,
        cluster: target,
        scatter: scatterTargets[i],
        spin: {
          x: Math.sin(seed) * 1.4,
          y: Math.cos(seed * 1.3) * 1.4,
          z: Math.sin(seed * 0.7) * 0.8
        }
      };
      scene.add(mesh);
      hexes.push(mesh);
    });

    // Central core glow sprite — the "flash" that births the hexes.
    const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    coreSprite.scale.set(2.5, 2.5, 1);
    coreSprite.position.set(OX, 0, 0.2);
    scene.add(coreSprite);

    // Floating ambient particles — 60 tiny glowing points drifting to add depth.
    (function addParticles() {
      const COUNT = 60;
      const positions = new Float32Array(COUNT * 3);
      const velocities = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
        velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.08;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        map: glowTex,
        color: 0x14A5B8,            // darker teal — shows on white bg (additive would be invisible)
        size: 0.18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,                 // faded in during explosion phase
        depthWrite: false
      });
      particles = new THREE.Points(geo, mat);
      particles.userData = { velocities: velocities };
      scene.add(particles);
    })();

    // Volumetric circuit tubes — each circuit gets a core tube + wider halo.
    // Reposed every frame from a→b hex positions; `draw` parameter 0..1 controls visible length.
    function makeTube(coreRadius, haloRadius, coreColor, haloColor) {
      // Normal blending, not additive — additive on white bg is invisible.
      // Core is a saturated cyan tube; halo wraps it with a softer fainter tube.
      const coreMat = new THREE.MeshBasicMaterial({
        color: coreColor, transparent: true, opacity: 0, depthWrite: false
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: haloColor, transparent: true, opacity: 0, depthWrite: false
      });
      const core = new THREE.Mesh(tubeGeo, coreMat);
      const halo = new THREE.Mesh(tubeGeo, haloMat);
      core.scale.set(coreRadius, 0.001, coreRadius);
      halo.scale.set(haloRadius, 0.001, haloRadius);
      scene.add(core);
      scene.add(halo);
      return { core: core, halo: halo, coreRadius: coreRadius, haloRadius: haloRadius };
    }
    for (let i = 1; i < hexes.length; i++) {
      const t = makeTube(0.028, 0.075, 0x14A5B8, 0x3EDCFF);
      circuits.push({
        core: t.core, halo: t.halo,
        coreR: t.coreRadius, haloR: t.haloRadius,
        a: hexes[i], b: hexes[0],
        kind: 'radial',
        coreOpacity: 0.95, haloOpacity: 0.35,
        draw: { v: 0 }
      });
    }
    for (let i = 1; i < hexes.length; i++) {
      const nxt = i === hexes.length - 1 ? 1 : i + 1;
      const t = makeTube(0.020, 0.055, 0x4FCDD6, 0x7fefff);
      circuits.push({
        core: t.core, halo: t.halo,
        coreR: t.coreRadius, haloR: t.haloRadius,
        a: hexes[i], b: hexes[nxt],
        kind: 'ring',
        coreOpacity: 0.75, haloOpacity: 0.22,
        draw: { v: 0 }
      });
    }

    // Data-pulse sprites — 3 per radial line, staggered t offsets and slightly different sizes.
    circuits.filter(function (c) { return c.kind === 'radial'; }).forEach(function (c) {
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, color: 0xffffff, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
        const sz = 0.28 + k * 0.07;
        sp.scale.set(sz, sz, 1);
        scene.add(sp);
        pulses.push({ sprite: sp, a: c.a, b: c.b, t: k / 3, speed: 0.42 + k * 0.14 });
      }
    });

    // Bloom
    let bloomEnabled = true;
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      // threshold MUST be > 1.0 — scene background is solid white (value 1.0);
      // any threshold at or below that blooms the entire background, washing the scene white.
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.5, 1.02);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (e) {
      bloomEnabled = false;
      composer = null;
    }

    const spinState = { factor: 0 };
    const cameraOrbit = { angle: 0, radius: 8, y: 0 };
    const pulseVisible = { v: 0 };

    // Wordmark: letters visible from t=0 (matches video — full logo shown from frame 1).
    const letters = wordmark ? wordmark.querySelectorAll('.pl-l') : [];
    if (wordmark) {
      wordmark.style.opacity = '1';
      wordmark.style.transform = 'translate(calc(-50% + 8vw), -50%)';
    }
    if (letters.length) {
      window.gsap.set(letters, { opacity: 1, y: 0 });
    }

    tl = window.gsap.timeline({ onComplete: finish });

    // ─── 0.0–0.8s: ASSEMBLED HOLD — full logo visible, tiny anticipation lift ───
    tl.to({}, { duration: 0.6 }, 0);
    // Very soft pre-scatter cue: emissive lifts slightly + center glow starts.
    tl.to(hexes.map(function (h) { return h.material; }),
      { emissiveIntensity: 0.12, duration: 0.3, ease: 'power1.inOut' }, 0.55);
    tl.to(coreSprite.material, { opacity: 0.55, duration: 0.25, ease: 'power2.out' }, 0.65)
      .to(coreSprite.scale,    { x: 1.8, y: 1.8, duration: 0.3, ease: 'power2.out' }, 0.65)
      .to(corePoint,           { intensity: 1.2, duration: 0.3, ease: 'power2.out' }, 0.65);

    // ─── 0.8–2.2s: SCATTER outward from the cluster ────────────────────
    for (let i = 1; i < hexes.length; i++) {
      const hx = hexes[i];
      const delay = 0.85 + (i - 1) * 0.04;
      tl.to(hx.position, {
        x: hx.userData.scatter[0],
        y: hx.userData.scatter[1],
        z: hx.userData.scatter[2],
        duration: 1.35,
        ease: 'power2.inOut'
      }, delay);
    }
    tl.to(spinState, { factor: 1, duration: 0.4, ease: 'power2.out' }, 0.85);
    tl.to(cameraOrbit, { angle: 0.4, y: 0.3, duration: 2.4, ease: 'sine.inOut' }, 0.85);

    // Ambient particles fade in as hexes start moving.
    if (particles) {
      tl.to(particles.material, { opacity: 0.55, duration: 1.0, ease: 'power2.out' }, 0.9);
    }

    // ─── 1.2–2.6s: CIRCUIT NETWORK DRAWS IN ────────────────────────────
    circuits.forEach(function (c, idx) {
      const startAt = c.kind === 'radial' ? 1.2 + idx * 0.04 : 1.6 + (idx - 6) * 0.05;
      tl.to(c.draw, { v: 1, duration: 0.6, ease: 'power2.out' }, startAt);
      tl.to(c.core.material, { opacity: c.coreOpacity, duration: 0.25, ease: 'power1.out' }, startAt);
      tl.to(c.halo.material, { opacity: c.haloOpacity, duration: 0.35, ease: 'power1.out' }, startAt);
    });
    tl.to(pulseVisible, { v: 1, duration: 0.4 }, 1.8);

    // Center core-flash decays (it was a soft cue, not a bright flash).
    tl.to(coreSprite.material, { opacity: 0.15, duration: 0.6, ease: 'power2.out' }, 1.2);
    tl.to(corePoint,           { intensity: 0.35, duration: 0.6, ease: 'power2.out' }, 1.2);

    // ─── 2.6–3.4s: PEAK HOLD — network glowing, hexes tumbling gently ──
    tl.to(hexes.map(function (h) { return h.material; }),
      { emissiveIntensity: 0.2, duration: 0.5 }, 2.6);
    if (bloomEnabled && bloom) {
      tl.to(bloom, { strength: 1.1, radius: 0.65, duration: 0.5 }, 2.6);
    }
    tl.to({}, { duration: 0.6 }, 2.7);

    // ─── 3.4–5.0s: SPIRAL MERGE back to assembled honeycomb ────────────
    // Each outer hex arcs inward on a curved path (perpendicular offset peaks at mid-travel)
    // rather than a straight line — reads as a fluid swirl instead of a mechanical retract.
    for (let i = 1; i < hexes.length; i++) {
      const hx = hexes[i];
      const startX = hx.userData.scatter[0], startY = hx.userData.scatter[1], startZ = hx.userData.scatter[2];
      const endX = hx.userData.cluster[0], endY = hx.userData.cluster[1], endZ = hx.userData.cluster[2];
      const dx = endX - startX, dy = endY - startY;
      const pathLen = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular direction (normalized) — which side the arc bulges toward.
      // Alternate sign per hex so they swirl from different sides, not all the same.
      const side = (i % 2 === 0) ? 1 : -1;
      const perpX = (-dy / pathLen) * side;
      const perpY = ( dx / pathLen) * side;
      const swirl = pathLen * 0.38;           // arc bulge = 38% of straight-line distance
      const proxy = { t: 0 };
      (function (proxy, hx, startX, startY, startZ, endX, endY, endZ, dx, dy, perpX, perpY, swirl) {
        tl.to(proxy, {
          t: 1, duration: 1.45, ease: 'power3.inOut',
          onUpdate: function () {
            const arc = Math.sin(proxy.t * Math.PI) * swirl;
            hx.position.set(
              startX + dx * proxy.t + perpX * arc,
              startY + dy * proxy.t + perpY * arc,
              startZ + (endZ - startZ) * proxy.t
            );
          }
        }, 3.4 + i * 0.025);
      })(proxy, hx, startX, startY, startZ, endX, endY, endZ, dx, dy, perpX, perpY, swirl);
      tl.to(hx.rotation, { x: 0, y: 0, z: 0, duration: 1.45, ease: 'power3.inOut' }, 3.4 + i * 0.025);
    }
    tl.to(spinState,   { factor: 0, duration: 1.3, ease: 'power2.inOut' }, 3.4);
    tl.to(cameraOrbit, { angle: 0, y: 0, radius: 6.8, duration: 1.5, ease: 'power2.inOut' }, 3.4);
    tl.to(pulseVisible, { v: 0, duration: 0.4 }, 3.6);

    // Circuits retract — draw shrinks, tubes fade.
    circuits.forEach(function (c) {
      tl.to(c.draw, { v: 0, duration: 0.7, ease: 'power2.in' }, 3.9);
      tl.to(c.core.material, { opacity: 0, duration: 0.5 }, 4.2);
      tl.to(c.halo.material, { opacity: 0, duration: 0.5 }, 4.2);
    });

    // Particles fade as focus returns to the logo.
    if (particles) {
      tl.to(particles.material, { opacity: 0.18, duration: 0.8, ease: 'power2.inOut' }, 4.0);
    }

    // ─── 5.0–6.2s: ASSEMBLED HOLD with AUREX CORE text ─────────────────
    tl.to(hexes.map(function (h) { return h.material; }),
      { emissiveIntensity: 0.35, duration: 0.3, ease: 'power2.out' }, 5.0);
    tl.to(corePoint, { intensity: 1.6, duration: 0.3, ease: 'power2.out' }, 5.0);
    if (bloomEnabled && bloom) {
      tl.to(bloom, { strength: 1.5, radius: 0.8, duration: 0.3, ease: 'power2.out' }, 5.0);
    }
    tl.to(hexes.map(function (h) { return h.material; }),
      { emissiveIntensity: 0.1, duration: 0.6, ease: 'power2.inOut' }, 5.35);
    tl.to(corePoint, { intensity: 0.5, duration: 0.6, ease: 'power2.inOut' }, 5.35);
    if (bloomEnabled && bloom) {
      tl.to(bloom, { strength: 0.6, radius: 0.5, duration: 0.6, ease: 'power2.inOut' }, 5.35);
    }
    tl.to({}, { duration: 1.0 }, 5.2);

    // ─── 6.2–7.0s: AUREX CORE fades, leaving clean honeycomb ───────────
    if (wordmark) {
      tl.to(wordmark, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 6.2);
    }
    if (letters.length) {
      tl.to(letters, { y: -2, duration: 0.6, ease: 'power2.in' }, 6.2);
    }
    // Subtle final glow peak just as the text leaves — draws the eye to the honeycomb.
    tl.to(hexes.map(function (h) { return h.material; }),
      { emissiveIntensity: 0.18, duration: 0.4, ease: 'power2.out' }, 6.2);

    // Subtle breathing on the assembled honeycomb — starts after the text clears.
    tl.call(function () {
      if (disposed) return;
      const breathe = { t: 0 };
      breatheTween = window.gsap.to(breathe, {
        t: Math.PI * 4,
        duration: 2.8,
        ease: 'none',
        repeat: -1,
        onUpdate: function () {
          const s = 1 + Math.sin(breathe.t) * 0.015;
          const e = 0.12 + (Math.sin(breathe.t) * 0.5 + 0.5) * 0.08;
          for (let i = 0; i < hexes.length; i++) {
            hexes[i].scale.set(s, s, s);
            hexes[i].material.emissiveIntensity = e;
          }
        }
      });
    }, null, 7.0);

    // ─── 7.0–7.6s: FINAL HONEYCOMB HOLD ────────────────────────────────
    tl.to({}, { duration: 0.6 }, 7.0);

    function onVisibility() {
      if (!tl) return;
      if (document.hidden) tl.pause();
      else tl.resume();
    }
    document.addEventListener('visibilitychange', onVisibility);

    function onResize() {
      if (disposed) return;
      const w2 = window.innerWidth, h2 = window.innerHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2, false);
      if (composer) composer.setSize(w2, h2);
    }
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('beforeunload', dispose);

    const clock = new THREE.Clock();
    function tick() {
      if (disposed) return;
      const dt = clock.getDelta();

      // 3D tumble while scattered
      if (spinState.factor > 0.001) {
        for (let i = 1; i < hexes.length; i++) {
          const s = hexes[i].userData.spin;
          hexes[i].rotation.x += s.x * dt * spinState.factor;
          hexes[i].rotation.y += s.y * dt * spinState.factor;
          hexes[i].rotation.z += s.z * dt * spinState.factor;
        }
      }

      // Camera orbit — parallax sells the 3D depth.
      camera.position.x = Math.sin(cameraOrbit.angle) * cameraOrbit.radius;
      camera.position.z = Math.cos(cameraOrbit.angle) * cameraOrbit.radius;
      camera.position.y = cameraOrbit.y;
      camera.lookAt(0, 0, 0);

      // Circuit tubes — reposition per frame between live hex endpoints.
      // Base of tubeGeo is at y=0, top at y=1; scale.y = length * draw.v for "draw-in" effect.
      const _from = new THREE.Vector3();
      const _to = new THREE.Vector3();
      const _up = new THREE.Vector3();
      const _q = new THREE.Quaternion();
      const _UP = new THREE.Vector3(0, 1, 0);
      circuits.forEach(function (c) {
        _from.copy(c.b.position);                          // start at center-hex end
        _to.copy(c.a.position);                            // end at outer-hex end
        _up.subVectors(_to, _from);
        const len = _up.length();
        if (len < 1e-4) return;
        _up.normalize();
        _q.setFromUnitVectors(_UP, _up);
        c.core.position.copy(_from);
        c.halo.position.copy(_from);
        c.core.quaternion.copy(_q);
        c.halo.quaternion.copy(_q);
        const visible = len * c.draw.v;
        c.core.scale.set(c.coreR, Math.max(0.001, visible), c.coreR);
        c.halo.scale.set(c.haloR, Math.max(0.001, visible), c.haloR);
      });

      // Particles drift slowly — wrap at bounds for an infinite ambient field.
      if (particles && particles.material.opacity > 0) {
        const arr = particles.geometry.attributes.position.array;
        const vel = particles.userData.velocities;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i]     += vel[i]     * dt;
          arr[i + 1] += vel[i + 1] * dt;
          arr[i + 2] += vel[i + 2] * dt;
          if (arr[i]     >  6.5) arr[i]     = -6.5;
          if (arr[i]     < -6.5) arr[i]     =  6.5;
          if (arr[i + 1] >  3.5) arr[i + 1] = -3.5;
          if (arr[i + 1] < -3.5) arr[i + 1] =  3.5;
          if (arr[i + 2] >  1.5) arr[i + 2] = -2.5;
          if (arr[i + 2] < -2.5) arr[i + 2] =  1.5;
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      // Data pulses travel center→outer along each radial line.
      pulses.forEach(function (p) {
        p.t += dt * p.speed;
        if (p.t > 1) p.t -= 1;
        const ap = p.b.position;                  // center
        const bp = p.a.position;                  // outer
        p.sprite.position.set(
          ap.x + (bp.x - ap.x) * p.t,
          ap.y + (bp.y - ap.y) * p.t,
          ap.z + (bp.z - ap.z) * p.t
        );
        p.sprite.material.opacity = pulseVisible.v * (0.8 - Math.abs(p.t - 0.5) * 0.6);
      });

      if (composer) composer.render();
      else renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    if (window.console && console.warn) console.warn('[AurexPreloader3D] init failed, falling back:', err);
    dispose();
    done();
  }
}

window.AurexPreloader3D = { run: run };
