/* =================================================================
   GLOBAL HELPERS
================================================================== */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =================================================================
   1. THREE.JS — engraved plaque in the hero
   A simple rotating plaque with brass-toned edges. Kept lightweight
   (no external textures/models) so it loads instantly from CDN-only deps.
================================================================== */
function initPlaque() {
  const container = $('#plaque-canvas');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();

  // Camera sized to the container's aspect ratio, refreshed on resize
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting: a soft key light + warm fill to suggest a brass/engraved surface
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8c7a5c, 0.6);
  fillLight.position.set(-4, -2, 3);
  scene.add(fillLight);

  scene.add(new THREE.AmbientLight(0xf7f5f0, 0.55));

  // --- The plaque itself: a rounded plate with a raised inset border,
  // built from two stacked extruded shapes rather than a flat plane,
  // so it reads as an "engraving" rather than a sticker.
  const plaqueGroup = new THREE.Group();

  function roundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return shape;
  }

  // Base plate — deep pine color, like a mounted nameplate backing
  const baseShape = roundedRectShape(4.4, 3, 0.28);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2e4034, metalness: 0.25, roughness: 0.55 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  plaqueGroup.add(baseMesh);

  // Inset brass panel — sits slightly above the base, like an engraved insert
  const panelShape = roundedRectShape(3.9, 2.5, 0.2);
  const panelGeo = new THREE.ExtrudeGeometry(panelShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x9c8868, metalness: 0.65, roughness: 0.32 });
  const panelMesh = new THREE.Mesh(panelGeo, panelMat);
  panelMesh.position.z = 0.32;
  plaqueGroup.add(panelMesh);

  // Three thin "engraved" lines on the panel suggesting text rows,
  // without rendering actual typography in WebGL (kept abstract on purpose)
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x4a4742, metalness: 0.1, roughness: 0.8 });
  const lineWidths = [2.6, 1.7, 2.1];
  lineWidths.forEach((w, i) => {
    const lineGeo = new THREE.BoxGeometry(w, 0.09, 0.04);
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.set(-((3.9 - w) / 2) + 0, 0.55 - i * 0.55, 0.45);
    plaqueGroup.add(lineMesh);
  });

  scene.add(plaqueGroup);

  // --- Resize handling: keep canvas matched to its container box
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Interaction: drag to rotate, gentle auto-rotation when idle,
  // and a subtle tilt-toward-cursor effect for a "living object" feel
  let dragging = false;
  let lastX = 0, lastY = 0;
  let targetRotY = 0.35, targetRotX = -0.15;
  let currentRotY = targetRotY, currentRotX = targetRotX;
  let idleTime = 0;

  function pointerDown(e) {
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
  }
  function pointerMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastX;
    const dy = p.clientY - lastY;
    targetRotY += dx * 0.005;
    targetRotX += dy * 0.005;
    targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX));
    lastX = p.clientX; lastY = p.clientY;
  }
  function pointerUp() { dragging = false; }

  container.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  container.addEventListener('touchstart', pointerDown, { passive: true });
  window.addEventListener('touchmove', pointerMove, { passive: true });
  window.addEventListener('touchend', pointerUp);

  function animate() {
    requestAnimationFrame(animate);

    // Gentle ambient rotation only when the user isn't dragging,
    // and only if motion is not reduced for accessibility
    if (!dragging && !prefersReducedMotion) {
      idleTime += 0.005;
      targetRotY += 0.0018;
    }

    // Smooth easing toward the target rotation (lerp)
    currentRotY += (targetRotY - currentRotY) * 0.08;
    currentRotX += (targetRotX - currentRotX) * 0.08;

    plaqueGroup.rotation.y = currentRotY;
    plaqueGroup.rotation.x = currentRotX;
    plaqueGroup.position.y = prefersReducedMotion ? 0 : Math.sin(idleTime) * 0.06;

    renderer.render(scene, camera);
  }
  animate();
}

/* =================================================================
   2. SCROLL SPY + SPINE NAV ACTIVE STATE
   Uses IntersectionObserver to mark the spine link for whichever
   section currently fills most of the viewport.
================================================================== */
function initScrollSpy() {
  const sections = $$('.section');
  const spineLinks = $$('.spine-list a');
  const mobileLinks = $$('.mobile-menu a');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        [...spineLinks, ...mobileLinks].forEach((link) => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach((sec) => observer.observe(sec));
}

/* =================================================================
   3. SCROLL REVEAL
   Fades/lifts each section in once as it enters the viewport.
================================================================== */
function initRevealOnScroll() {
  const targets = $$('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // reveal once, then stop watching
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((t) => observer.observe(t));
}

/* =================================================================
   4. MOBILE MENU TOGGLE
================================================================== */
function initMobileMenu() {
  const toggle = $('#mobileToggle');
  const menu = $('#mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu after a link is tapped, so it doesn't stay open mid-navigation
  $$('a', menu).forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* =================================================================
   5. SKILLS — filter chips + animated bar fill on first view
================================================================== */
function initSkills() {
  const chips = $$('.filter-chip');
  const rows = $$('.skill-row');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      rows.forEach((row) => {
        const match = filter === 'all' || row.dataset.cat === filter;
        row.classList.toggle('is-hidden', !match);
      });
    });
  });

  // Animate each bar to its data-level width only once it's visible,
  // so the fill reads as a deliberate reveal rather than a page-load jolt
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const fill = $('.skill-fill', entry.target);
        const level = entry.target.dataset.level || 0;
        fill.style.width = `${level}%`;
        barObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  rows.forEach((row) => barObserver.observe(row));
}

/* =================================================================
   6. CERTIFICATES — click to flip each stamp
================================================================== */
function initCertFlip() {
  $$('.cert-stamp').forEach((stamp) => {
    stamp.addEventListener('click', () => stamp.classList.toggle('is-flipped'));
  });
}

/* =================================================================
   7. PROJECTS — filmstrip drag-to-scroll + arrow controls + flip
================================================================== */
function initProjects() {
  const strip = $('#filmstrip');
  if (!strip) return;

  // Click a card to flip it for details, unless the click was part of a drag
  let dragged = false;
  $$('.reel-card', strip).forEach((card) => {
    card.addEventListener('click', () => {
      if (!dragged) card.classList.toggle('is-flipped');
    });
  });

  // Arrow buttons scroll by one card-width
  $('#stripPrev')?.addEventListener('click', () => strip.scrollBy({ left: -340, behavior: 'smooth' }));
  $('#stripNext')?.addEventListener('click', () => strip.scrollBy({ left: 340, behavior: 'smooth' }));

  // Drag-to-scroll with the mouse (desktop convenience; touch scrolling works natively)
  let isDown = false, startX = 0, startScroll = 0;

  strip.addEventListener('mousedown', (e) => {
    isDown = true;
    dragged = false;
    startX = e.pageX;
    startScroll = strip.scrollLeft;
    strip.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const delta = e.pageX - startX;
    if (Math.abs(delta) > 6) dragged = true; // distinguish a drag from a click
    strip.scrollLeft = startScroll - delta;
  });
  window.addEventListener('mouseup', () => {
    isDown = false;
    strip.style.cursor = 'grab';
  });
}

/* =================================================================
   8. CONTACT FORM — front-end validation + simulated submit feedback
   No backend is wired up; this provides the UX flow for when the
   developer connects a real endpoint (e.g. Formspree, EmailJS, API).
================================================================== */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;
  const note = $('#formNote');
  const submitBtn = $('.btn-submit', form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = $('#fname').value.trim();
    const email = $('#femail').value.trim();
    const message = $('#fmessage').value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !message) {
      note.textContent = 'Please fill in your name and a short message.';
      note.style.color = '#a4453a';
      return;
    }
    if (!emailPattern.test(email)) {
      note.textContent = 'That email address doesn\u2019t look quite right.';
      note.style.color = '#a4453a';
      return;
    }

    // Simulated send — swap this block for a real fetch() call to your
    // form endpoint or serverless function when wiring up the backend.
    note.textContent = '';
    submitBtn.classList.add('is-sent');
    submitBtn.disabled = true;

    setTimeout(() => {
      form.reset();
      submitBtn.classList.remove('is-sent');
      submitBtn.disabled = false;
      note.textContent = 'Thanks for reaching out — I\u2019ll reply soon.';
      note.style.color = 'var(--ink-soft)';
    }, 2200);
  });
}

/* =================================================================
   9. SMOOTH ANCHOR SCROLL OFFSET
   Native scroll-behavior:smooth already handles anchors; this just
   ensures clicks on spine/mobile links don't fight the IntersectionObserver.
================================================================== */
function initAnchorLinks() {
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });
}

/* =================================================================
   INIT — boot everything once the DOM is ready, then lift the loader
================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initPlaque();
  initScrollSpy();
  initRevealOnScroll();
  initMobileMenu();
  initSkills();
  initCertFlip();
  initProjects();
  initContactForm();
  initAnchorLinks();

  // Reveal the very first section immediately (it's already in view on load)
  $('#about')?.classList.add('is-visible');

  // Lift the loader curtain shortly after init so the 3D scene has painted
  setTimeout(() => $('#loader')?.classList.add('is-hidden'), 450);
});
