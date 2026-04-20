/* ═══════════════════════════════════════════════════
   AETHER — main.js
   Three.js card  |  GSAP ScrollTrigger  |  Form
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── NAV scroll state ───────────────────────────── */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ══════════════════════════════════════════════
     THREE.JS — METALLIC CREDIT CARD
  ══════════════════════════════════════════════ */
  const canvas    = document.getElementById('threeCanvas');
  const cssCard   = document.getElementById('cssCard');
  let   webglOK   = false;
  let   renderer, scene, camera, card, animFrame;
  let   mouse     = { x: 0, y: 0 };
  let   targetRot = { x: 0, y: 0 };

  function tryWebGL() {
    try {
      const testCtx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!testCtx) throw new Error('No WebGL');
      webglOK = true;
    } catch (e) {
      webglOK = false;
    }
  }
  tryWebGL();

  if (!webglOK) {
    canvas.style.display = 'none';
    cssCard.style.display = 'flex';
  } else {
    initThree();
  }

  function initThree() {
    const scene_container = document.getElementById('cardScene');
    const W = scene_container.clientWidth;
    const H = scene_container.clientHeight;

    /* ── Renderer ── */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    /* ── Scene ── */
    scene = new THREE.Scene();

    /* ── Camera ── */
    camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    /* ── Lighting ── */
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    // Key light — warm gold
    const keyLight = new THREE.DirectionalLight(0xf0c060, 1.8);
    keyLight.position.set(3, 3, 4);
    scene.add(keyLight);

    // Fill light — cool blue rim
    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.6);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, -4, -3);
    scene.add(rimLight);

    // Point light — gold glow behind card
    const goldGlow = new THREE.PointLight(0xc9973a, 1.5, 8);
    goldGlow.position.set(0, 0, -2);
    scene.add(goldGlow);

    /* ── Card geometry ── */
    buildCard();

    /* ── Mouse tracking ── */
    document.addEventListener('mousemove', onMouseMove, { passive: true });

    /* ── Resize ── */
    window.addEventListener('resize', onResize);

    /* ── Render loop ── */
    animate();
  }

  function buildCard() {
    const group = new THREE.Group();

    /* Card body — rounded box via ShapeGeometry extruded */
    const W = 3.37, H = 2.125, D = 0.04, R = 0.12;

    const shape = new THREE.Shape();
    shape.moveTo(-W / 2 + R, -H / 2);
    shape.lineTo(W / 2 - R, -H / 2);
    shape.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
    shape.lineTo(W / 2, H / 2 - R);
    shape.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
    shape.lineTo(-W / 2 + R, H / 2);
    shape.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
    shape.lineTo(-W / 2, -H / 2 + R);
    shape.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);

    const extrudeSettings = {
      depth: D,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 4,
    };

    const cardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    cardGeo.center();

    /* Card material — glass/metallic mix */
    const cardMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1929,
      metalness: 0.85,
      roughness: 0.15,
      transmission: 0.12,
      thickness: 0.5,
      reflectivity: 1,
      envMapIntensity: 1.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.96,
    });

    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    group.add(cardMesh);

    /* Gold shimmer overlay — thin plane slightly in front */
    const overlayGeo = new THREE.PlaneGeometry(W * 0.99, H * 0.99, 1, 1);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: 0xc9973a,
      transparent: true,
      opacity: 0.03,
      depthTest: false,
    });
    const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
    overlayMesh.position.z = D / 2 + 0.005;
    group.add(overlayMesh);

    /* Chip */
    addChip(group, D);

    /* Logo text placeholder using a gold plane */
    addLogo(group, W, H, D);

    /* Stripe */
    addStripe(group, W, H, D);

    /* Holographic shimmer strip */
    addHolo(group, W, H, D);

    card = group;
    scene.add(card);
  }

  function addChip(group, D) {
    const chipGeo = new THREE.BoxGeometry(0.4, 0.32, 0.01);
    const chipMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9973a,
      metalness: 0.95,
      roughness: 0.1,
      clearcoat: 0.8,
    });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.position.set(-1.1, 0.45, D / 2 + 0.012);

    /* Chip lines */
    for (let i = -1; i <= 1; i++) {
      const lineGeo = new THREE.BoxGeometry(0.38, 0.01, 0.002);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a6820 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, i * 0.07, 0.006);
      chip.add(line);
    }
    for (let i = -1; i <= 1; i++) {
      const lineGeo = new THREE.BoxGeometry(0.01, 0.3, 0.002);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a6820 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(i * 0.1, 0, 0.006);
      chip.add(line);
    }

    group.add(chip);
  }

  function addLogo(group, W, H, D) {
    /* Gold circle as Æ placeholder */
    const torusGeo = new THREE.RingGeometry(0.18, 0.22, 32);
    const torusMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0c060,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
    const logo = new THREE.Mesh(torusGeo, torusMat);
    logo.position.set(W / 2 - 0.4, H / 2 - 0.38, D / 2 + 0.012);
    group.add(logo);

    /* Inner dot */
    const dotGeo = new THREE.CircleGeometry(0.07, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xc9973a });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(W / 2 - 0.4, H / 2 - 0.38, D / 2 + 0.014);
    group.add(dot);
  }

  function addStripe(group, W, H, D) {
    /* Magnetic stripe on back — show as bottom strip on face for visual */
    const stripeGeo = new THREE.PlaneGeometry(W * 0.94, 0.06);
    const stripeMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9973a,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: 0.25,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, -H / 2 + 0.45, D / 2 + 0.011);
    group.add(stripe);
  }

  function addHolo(group, W, H, D) {
    /* Holographic shimmer rectangle */
    const holoGeo = new THREE.PlaneGeometry(0.55, 0.38);
    const holoMat = new THREE.MeshPhysicalMaterial({
      color: 0x88aaff,
      metalness: 0.5,
      roughness: 0.05,
      iridescence: 1,
      iridescenceIOR: 1.3,
      transparent: true,
      opacity: 0.45,
    });
    const holo = new THREE.Mesh(holoGeo, holoMat);
    holo.position.set(W / 2 - 0.6, -H / 2 + 0.28, D / 2 + 0.012);
    group.add(holo);
  }

  /* ── Mouse handler ── */
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
  }

  /* ── Resize ── */
  function onResize() {
    if (!renderer) return;
    const container = document.getElementById('cardScene');
    const W = container.clientWidth;
    const H = container.clientHeight;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  /* ── Animate loop ── */
  let clock_t = 0;
  function animate() {
    animFrame = requestAnimationFrame(animate);
    clock_t += 0.01;

    if (card) {
      /* Lerp toward mouse */
      targetRot.x += (mouse.y * 0.3 - targetRot.x) * 0.06;
      targetRot.y += (mouse.x * 0.4 - targetRot.y) * 0.06;

      card.rotation.x = targetRot.x;
      card.rotation.y = targetRot.y + Math.sin(clock_t * 0.5) * 0.08;
      card.position.y  = Math.sin(clock_t * 0.8) * 0.06;
    }

    renderer.render(scene, camera);
  }

  /* ══════════════════════════════════════════════
     GSAP ScrollTrigger
  ══════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);

  /* Card shrink/move on scroll */
  if (webglOK) {
    gsap.to('#cardScene', {
      scale: 0.55,
      y: -60,
      opacity: 0.4,
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });
  }

  /* Hero content parallax */
  gsap.to('.hero-content', {
    y: -80,
    opacity: 0.2,
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  /* SVG growth chart — animate stroke on scroll into view */
  ScrollTrigger.create({
    trigger: '.feature-large',
    start: 'top 75%',
    onEnter: () => {
      document.querySelector('.chart-line').classList.add('animate');
      document.querySelector('.chart-dot').classList.add('animate');
      document.querySelector('.chart-fill').classList.add('animate');
    },
  });

  /* Feature cards — stagger reveal */
  gsap.from('.feature-card', {
    y: 40,
    opacity: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.features-grid',
      start: 'top 80%',
    },
  });

  /* Stats strip */
  gsap.from('.stat-item', {
    y: 24,
    opacity: 0,
    duration: 0.6,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.stats-strip',
      start: 'top 85%',
    },
  });

  /* Waitlist section */
  gsap.from('.waitlist-copy', {
    x: -40,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.waitlist',
      start: 'top 75%',
    },
  });

  gsap.from('.frosted-form', {
    x: 40,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.waitlist',
      start: 'top 75%',
    },
  });

  /* ══════════════════════════════════════════════
     SIGN-UP FORM
  ══════════════════════════════════════════════ */
  const form      = document.getElementById('signupForm');
  const formWrap  = document.getElementById('formWrap');
  const successEl = document.getElementById('successState');
  const submitBtn = document.getElementById('submitBtn');
  const btnText   = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  const inlineErr = document.getElementById('inlineError');

  const firstNameInput  = document.getElementById('firstName');
  const emailInput      = document.getElementById('email');
  const consentInput    = document.getElementById('consent');

  const firstNameError  = document.getElementById('firstNameError');
  const emailError      = document.getElementById('emailError');
  const consentError    = document.getElementById('consentError');

  function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function clearErrors() {
    firstNameError.textContent = '';
    emailError.textContent     = '';
    consentError.textContent   = '';
    firstNameInput.classList.remove('error');
    emailInput.classList.remove('error');
    inlineErr.style.display    = 'none';
  }

  function validate() {
    let valid = true;
    clearErrors();

    if (!firstNameInput.value.trim()) {
      firstNameError.textContent = 'Please enter your first name.';
      firstNameInput.classList.add('error');
      valid = false;
    }

    if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
      emailError.textContent = 'Please enter a valid email address.';
      emailInput.classList.add('error');
      valid = false;
    }

    if (!consentInput.checked) {
      consentError.textContent = 'You must agree to receive marketing emails to join the waitlist.';
      valid = false;
    }

    return valid;
  }

  function setLoading(loading) {
    submitBtn.disabled     = loading;
    btnText.style.display  = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline-flex' : 'none';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstNameInput.value.trim(),
          email:     emailInput.value.trim(),
          consent:   consentInput.checked,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        /* Show success */
        formWrap.style.display  = 'none';
        successEl.style.display = 'flex';

        gsap.from(successEl, {
          scale: 0.9,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(1.7)',
        });
      } else {
        inlineErr.textContent = data.message || 'Something went wrong. Please try again or contact us directly.';
        inlineErr.style.display = 'block';
      }
    } catch (err) {
      inlineErr.textContent = 'Something went wrong. Please try again or contact us directly.';
      inlineErr.style.display = 'block';
    } finally {
      setLoading(false);
    }
  });

  /* ── Page-load entrance animations ── */
  gsap.from('.hero-eyebrow', { opacity: 0, y: 20, duration: 0.8, delay: 0.3, ease: 'power3.out' });
  gsap.from('.hero-title .hero-title-line', { opacity: 0, y: 30, duration: 0.9, delay: 0.5, stagger: 0.15, ease: 'power3.out' });
  gsap.from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.8, delay: 0.85, ease: 'power3.out' });
  gsap.from('.hero-btn',     { opacity: 0, y: 16, duration: 0.7, delay: 1.05, ease: 'power3.out' });
  gsap.from('#cardScene',    { opacity: 0, x: 40, duration: 1.1, delay: 0.6,  ease: 'power3.out' });

})();
