/**
 * KitMat — app.js v2.0
 * Motor centralizado: autenticación, guardias de ruta,
 * transiciones de página, partículas, animaciones GSAP.
 * 
 * Credenciales demo:
 *   Usuario:    Leidy2004
 *   Contraseña: SalchipapaConCola1!
 */

'use strict';

/* ============================================================
   CONSTANTES Y CONFIGURACIÓN
   ============================================================ */
const KITMAT = {
  /** Credenciales hardcodeadas para evaluación */
  DEMO_USER: 'Leidy2004',
  DEMO_PASS: 'SalchipapaConCola1!',

  /** Clave de localStorage (solo sesión activa, sin credenciales permanentes) */
  STORAGE_KEY: 'kitmat_session',

  /** URL de la API de Google Apps Script */
  API_URL: 'https://script.google.com/macros/s/AKfycbxbwTgcAzahTca8CNvgaeaeoNwVMSxX_JYTBGNhGc1W5yGwH3mJlyjhmsF0835fFcdjeg/exec',

  /** Páginas */
  PAGES: {
    home:  'index.html',
    auth:  'auth.html',
    store: 'store.html',
  },
};

/* ============================================================
   UTILIDADES BÁSICAS
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Verifica si GSAP está disponible */
const hasGSAP = () => typeof gsap !== 'undefined';

/* ============================================================
   GESTIÓN DE SESIÓN (Auth State)
   ============================================================ */
const KitmatAuth = {
  /** ¿Hay sesión activa? */
  isLoggedIn() {
    try {
      const raw = localStorage.getItem(KITMAT.STORAGE_KEY);
      return raw ? !!JSON.parse(raw) : false;
    } catch { return false; }
  },

  /** Devuelve el objeto de usuario o null */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(KITMAT.STORAGE_KEY)) ?? null;
    } catch { return null; }
  },

  /** Guarda sesión y dispara evento personalizado */
  login(userData) {
    localStorage.setItem(KITMAT.STORAGE_KEY, JSON.stringify(userData));
    document.dispatchEvent(new CustomEvent('kitmat:login', { detail: userData }));
  },

  /** Elimina sesión */
  logout() {
    localStorage.removeItem(KITMAT.STORAGE_KEY);
    document.dispatchEvent(new CustomEvent('kitmat:logout'));
  },

  /**
   * Valida credenciales contra los datos hardcodeados + usuarios registrados.
   * Primero verifica el usuario demo; luego busca en sesiones registradas.
   */
  validateCredentials(usuario, contrasena) {
    // 1. Credenciales demo hardcodeadas
    if (usuario === KITMAT.DEMO_USER && contrasena === KITMAT.DEMO_PASS) {
      return {
        usuario: KITMAT.DEMO_USER,
        nombre: 'Leidy',
        apellido: 'Demo',
        isDemo: true,
      };
    }
    // 2. Usuario registrado en localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(KITMAT.STORAGE_KEY));
      if (
        stored &&
        stored.usuario === usuario &&
        stored.contrasena === contrasena
      ) {
        return stored;
      }
    } catch { /* ignore */ }
    return null;
  },

  /** Si no está logueado, redirige a auth.html con toast */
  requireAuth() {
    if (!this.isLoggedIn()) {
      showToast(
        '🔒 Debes iniciar sesión para acceder a la tienda.',
        'warning',
        4000
      );
      setTimeout(() => pageTransitionTo(KITMAT.PAGES.auth), 800);
      return false;
    }
    return true;
  },

  /** Si ya está logueado, redirige a store.html */
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      pageTransitionTo(KITMAT.PAGES.store);
      return true;
    }
    return false;
  },
};

/* ============================================================
   TRANSICIONES DE PÁGINA (GPU-accelerated overlay)
   ============================================================ */
let _overlayEl = null;

function _ensureOverlay() {
  if (_overlayEl) return _overlayEl;
  _overlayEl = document.getElementById('kitmat-overlay');
  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'kitmat-overlay';
    document.body.appendChild(_overlayEl);
  }
  return _overlayEl;
}

/** Navega a una URL con fade-out overlay */
function pageTransitionTo(url) {
  const overlay = _ensureOverlay();
  if (hasGSAP()) {
    gsap.to(overlay, {
      opacity: 1,
      duration: 0.40,
      ease: 'power2.inOut',
      onComplete: () => { window.location.href = url; },
    });
  } else {
    window.location.href = url;
  }
}

/** Fade-in al cargar la página */
function _pageEntrance() {
  const overlay = _ensureOverlay();
  overlay.style.opacity = '1';
  if (hasGSAP()) {
    gsap.to(overlay, { opacity: 0, duration: 0.55, ease: 'power2.out', delay: 0.05 });
  } else {
    overlay.style.transition = 'opacity 0.55s';
    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
  }
}

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
let _toastContainer = null;

function _ensureToastContainer() {
  if (_toastContainer) return _toastContainer;
  _toastContainer = document.getElementById('toast-container');
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Muestra un toast animado.
 * @param {string} message  - Texto del toast
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration - Duración en ms (0 = manual)
 */
function showToast(message, type = 'info', duration = 3200) {
  const container = _ensureToastContainer();
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] ?? '💬'}</span><span>${message}</span>`;
  el.style.opacity = '0';
  el.style.transform = 'translateX(20px)';
  container.appendChild(el);

  const remove = () => {
    if (hasGSAP()) {
      gsap.to(el, { opacity: 0, x: 20, duration: 0.25, onComplete: () => el.remove() });
    } else {
      el.remove();
    }
  };

  if (hasGSAP()) {
    gsap.to(el, { opacity: 1, x: 0, duration: 0.30, ease: 'power2.out' });
  } else {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
  }

  el.addEventListener('click', remove);
  if (duration > 0) setTimeout(remove, duration);
}

/* ============================================================
   CONFETTI (GPU-accelerated GSAP)
   ============================================================ */
const CONFETTI_COLORS = [
  '#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#ec4899','#facc15','#06b6d4'
];
const CONFETTI_SHAPES = ['square', 'circle', 'tri'];

function createConfetti(count = 65) {
  if (!hasGSAP()) return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 8 + Math.random() * 10;

    el.className = `confetti-piece confetti-${shape}`;

    el.style.setProperty('--c-left', `${cx}px`);
    el.style.setProperty('--c-top', `${cy}px`);
    el.style.setProperty('--c-size', `${size}px`);
    el.style.setProperty('--c-half-size', `${size/2}px`);
    el.style.setProperty('--c-color', color);

    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const dist  = 200 + Math.random() * 350;
    const dur   = 1.4 + Math.random() * 1.2;

    gsap.fromTo(el,
      { x: 0, y: 0, rotation: 0, opacity: 1 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 100,
        rotation: (Math.random() - 0.5) * 540,
        opacity: 0,
        duration: dur,
        ease: 'power2.out',
        delay: Math.random() * 0.3,
        onComplete: () => el.remove(),
      }
    );
  }
}

/* ============================================================
   CANVAS PARTICLE SYSTEM (lightweight, 60fps)
   ============================================================ */
function _initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles, raf;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r  = 1 + Math.random() * 1.5;
    this.alpha = 0.15 + Math.random() * 0.35;
  };
  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) this.x = W;
    if (this.x > W) this.x = 0;
    if (this.y < 0) this.y = H;
    if (this.y > H) this.y = 0;
  };
  Particle.prototype.draw = function () {
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = '#a5b4fc';
    ctx.fill();
  };

  function init() {
    resize();
    const count = Math.min(Math.floor((W * H) / 14000), 80);
    particles = Array.from({ length: count }, () => new Particle());
  }

  function drawConnections() {
    const maxDist = 110;
    ctx.lineWidth = 0.4;
    for (let i = 0; i < particles.length - 1; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          ctx.globalAlpha = (1 - d / maxDist) * 0.12;
          ctx.strokeStyle = '#818cf8';
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }

  init();
  loop();

  // Pause when hidden for battery/CPU savings
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { loop(); }
  });

  window.addEventListener('resize', () => { init(); }, { passive: true });
}

/* ============================================================
   SCROLL REVEAL (IntersectionObserver — sin GSAP para CPU)
   ============================================================ */
function _initScrollReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}

/* ============================================================
   NAVBAR SCROLL BEHAVIOUR
   ============================================================ */
function _initNavbarScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 70);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   HAMBURGER MENU
   ============================================================ */
function initHamburger() {
  const btn  = document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  let open = false;
  const lines = $$('.hb-line', btn);

  function toggle() {
    open = !open;
    btn.setAttribute('aria-expanded', open);

    if (open) {
      menu.style.display = 'flex';
      if (hasGSAP()) {
        gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
        if (lines[0]) gsap.to(lines[0], { rotation: 45, y: 7, duration: 0.25 });
        if (lines[1]) gsap.to(lines[1], { opacity: 0, duration: 0.15 });
        if (lines[2]) gsap.to(lines[2], { rotation: -45, y: -7, duration: 0.25 });
      } else {
        menu.style.opacity = '1';
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (hasGSAP()) {
        gsap.to(menu, {
          opacity: 0, duration: 0.22,
          onComplete: () => { menu.style.display = 'none'; }
        });
        if (lines[0]) gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.25 });
        if (lines[1]) gsap.to(lines[1], { opacity: 1, duration: 0.15 });
        if (lines[2]) gsap.to(lines[2], { rotation: 0, y: 0, duration: 0.25 });
      } else {
        menu.style.display = 'none';
      }
      document.body.style.overflow = '';
    }
  }

  btn.addEventListener('click', toggle);

  // Cerrar con ESC o click en link
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(); });
  $$('.mobile-nav-link, .mobile-cta', menu).forEach(a => a.addEventListener('click', () => { if (open) toggle(); }));
}

/* ============================================================
   MAGNETIC BUTTON EFFECT (sólo escritorio)
   ============================================================ */
function _initMagneticButtons() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // no en táctil
  $$('.btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const dy = (e.clientY - rect.top  - rect.height/ 2) * 0.25;
      if (hasGSAP()) {
        gsap.to(btn, { x: clamp(dx,-8,8), y: clamp(dy,-6,6), duration: 0.25, ease: 'power2.out' });
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (hasGSAP()) gsap.to(btn, { x: 0, y: 0, duration: 0.40, ease: 'elastic.out(1,0.5)' });
    });
  });
}

/* ============================================================
   FLOATING CTA (Landing page)
   ============================================================ */
function _initFloatingCTA() {
  const cta = document.getElementById('floating-cta');
  if (!cta) return;

  let shown = false;
  window.addEventListener('scroll', () => {
    if (!shown && window.scrollY > 120) {
      shown = true;
      cta.classList.add('visible');
    } else if (shown && window.scrollY <= 80) {
      shown = false;
      cta.classList.remove('visible');
    }
  }, { passive: true });

  cta.addEventListener('click', e => {
    e.preventDefault();
    const dest = KitmatAuth.isLoggedIn() ? KITMAT.PAGES.store : KITMAT.PAGES.auth;
    pageTransitionTo(dest);
  });
}

/* ============================================================
   ROUTE GUARD — store.html
   ============================================================ */
function _runRouteGuard() {
  const path = window.location.pathname;
  const isStore = path.endsWith('store.html') || path.includes('/store');
  if (isStore) {
    KitmatAuth.requireAuth(); // redirige si no hay sesión
  }
}

/* ============================================================
   PÁGINA AUTH — validación en vivo, tabs, submit
   ============================================================ */
function initAuthPage() {
  if (!document.getElementById('auth-card')) return;

  /* ── Auto-redirect si ya está logueado ── */
  if (KitmatAuth.isLoggedIn()) {
    pageTransitionTo(KITMAT.PAGES.store);
    return;
  }

  /* ── Variables de estado ── */
  const cardEl       = document.getElementById('auth-card');
  const tabBar       = document.getElementById('tab-bar');
  const tabIndicator = document.getElementById('tab-indicator');
  const tabs         = $$('.tab-btn', tabBar ?? document);
  const signupPanel  = document.getElementById('panel-signup');
  const loginPanel   = document.getElementById('panel-login');
  const errorBanner  = document.getElementById('auth-error-banner');
  const errorMsg     = document.getElementById('auth-error-msg');

  /* ── Tab switching ── */
  let activeTab = 0; // 0=signup, 1=login

  function switchTab(idx) {
    if (idx === activeTab) return;
    activeTab = idx;

    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));

    // Mover indicador
    if (tabIndicator) {
      const tabW = (tabBar?.offsetWidth ?? 300) / 2;
      if (hasGSAP()) {
        gsap.to(tabIndicator, { x: idx * tabW, width: tabW, duration: 0.30, ease: 'power2.inOut' });
      } else {
        tabIndicator.style.transform = `translateX(${idx * tabW}px)`;
        tabIndicator.style.width = `${tabW}px`;
      }
    }

    const fromPanel = idx === 0 ? loginPanel  : signupPanel;
    const toPanel   = idx === 0 ? signupPanel : loginPanel;
    hideErrorBanner();

    if (hasGSAP() && fromPanel && toPanel) {
      gsap.to(fromPanel, {
        opacity: 0, y: -10, duration: 0.18,
        onComplete: () => {
          fromPanel.classList.add('hidden-panel');
          toPanel.classList.remove('hidden-panel');
          gsap.fromTo(toPanel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
        }
      });
    } else {
      fromPanel?.classList.add('hidden-panel');
      toPanel?.classList.remove('hidden-panel');
    }
  }

  tabs.forEach((tab, idx) => tab.addEventListener('click', () => switchTab(idx)));

  // Link "ya tengo cuenta / regístrate"
  document.getElementById('switch-to-login')?.addEventListener('click', e => { e.preventDefault(); switchTab(1); });
  document.getElementById('switch-to-signup')?.addEventListener('click', e => { e.preventDefault(); switchTab(0); });

  /* ── Inicializar indicador ── */
  if (tabIndicator && tabBar) {
    const tabW = tabBar.offsetWidth / 2;
    tabIndicator.style.width = `${tabW}px`;
    tabIndicator.style.transform = 'translateX(0)';
  }

  /* ── Validación en vivo de campos ── */
  const VALIDATORS = {
    nombre:    v => v.trim().length >= 2,
    apellido:  v => v.trim().length >= 2,
    usuario:   v => /^[a-zA-Z0-9_]{4,20}$/.test(v.trim()),
    cedula:    v => /^\d{10}$/.test(v),
    email:     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    contrasena:v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v),
  };

  const HELPERS = {
    nombre:    { ok: 'Nombre válido ✓', error: 'Mínimo 2 caracteres' },
    apellido:  { ok: 'Apellido válido ✓', error: 'Mínimo 2 caracteres' },
    usuario:   { ok: 'Usuario disponible ✓', error: '4-20 caracteres: letras, números o guion bajo' },
    cedula:    { ok: 'Cédula válida ✓', error: 'Debe tener exactamente 10 dígitos' },
    email:     { ok: 'Correo válido ✓', error: 'Formato de correo inválido' },
    contrasena:{ ok: 'Contraseña segura ✓', error: 'Mínimo 8 caracteres, mayúscula, minúscula y número' },
  };

  function applyInputState(input, helperEl, isValid) {
    input.classList.toggle('valid', isValid);
    input.classList.toggle('invalid', !isValid);
    if (helperEl) {
      helperEl.textContent = isValid
        ? (HELPERS[input.dataset.validate]?.ok ?? '')
        : (HELPERS[input.dataset.validate]?.error ?? '');
      helperEl.className = `input-helper ${isValid ? 'ok' : 'error'}`;
    }
  }

  $$('[data-validate]').forEach(input => {
    const key  = input.dataset.validate;
    const helper = document.getElementById(`helper-${key}`);

    // Solo permitir dígitos en cédula
    if (key === 'cedula') {
      input.addEventListener('keydown', e => {
        const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
      });
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 10);
      });
    }

    input.addEventListener('blur', () => {
      if (input.value === '') return; // no marcar vacíos en blur
      const valid = VALIDATORS[key]?.(input.value) ?? true;
      applyInputState(input, helper, valid);
    });

    input.addEventListener('input', () => {
      // Quitar estado de error mientras escribe
      if (input.classList.contains('invalid')) {
        const valid = VALIDATORS[key]?.(input.value) ?? true;
        if (valid) applyInputState(input, helper, true);
      }
      hideErrorBanner();
    });
  });

  /* ── Medidor de fortaleza de contraseña ── */
  $$('[data-pw-strength]').forEach(input => {
    const segs = $$('.strength-seg', input.closest('.input-group') ?? document);
    if (!segs.length) return;
    input.addEventListener('input', () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[a-z]/.test(v)) score++;
      if (/\d/.test(v) || /[^a-zA-Z\d]/.test(v)) score++;
      const COLORS = ['#ef4444','#f97316','#facc15','#10b981'];
      segs.forEach((seg, i) => {
        seg.style.background = i < score ? COLORS[score - 1] : 'rgba(255,255,255,0.10)';
      });
    });
  });

  /* ── Show/hide contraseña ── */
  $$('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`;
    });
  });

  /* ── Error banner ── */
  function showErrorBanner(msg) {
    if (!errorBanner) return;
    if (errorMsg) errorMsg.textContent = msg;
    errorBanner.classList.add('show');
    if (hasGSAP()) {
      gsap.fromTo(errorBanner, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25 });
    }
  }
  function hideErrorBanner() {
    errorBanner?.classList.remove('show');
  }

  /* ── Shake animation ── */
  function shakeCard() {
    if (!cardEl) return;
    if (hasGSAP()) {
      gsap.timeline()
        .to(cardEl, { x: -10, duration: 0.07 })
        .to(cardEl, { x:  10, duration: 0.07 })
        .to(cardEl, { x:  -8, duration: 0.07 })
        .to(cardEl, { x:   8, duration: 0.07 })
        .to(cardEl, { x:   0, duration: 0.07 });
    }
  }

  /* ── SIGN UP SUBMIT ── */
  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const fields = {
      nombre:    $('#input-nombre'),
      apellido:  $('#input-apellido'),
      usuario:   $('#input-usuario'),
      cedula:    $('#input-cedula'),
      email:     $('#input-email'),
      contrasena:$('#input-pass-signup'),
    };

    let valid = true;
    Object.entries(fields).forEach(([key, input]) => {
      if (!input) return;
      const helper = document.getElementById(`helper-${key}`);
      const isValid = VALIDATORS[key]?.(input.value) ?? true;
      applyInputState(input, helper, isValid);
      if (!isValid) valid = false;
    });

    if (!valid) {
      shakeCard();
      showErrorBanner('⚠️ Por favor corrige los errores antes de continuar.');
      return;
    }

    const userData = {
      accion:     'registrar',
      nombre:     fields.nombre?.value.trim(),
      apellido:   fields.apellido?.value.trim(),
      usuario:    fields.usuario?.value.trim(),
      cedula:     fields.cedula?.value.trim(),
      email:      fields.email?.value.trim(),
      contrasena: fields.contrasena?.value,
    };

    const btn = document.getElementById('btn-signup');
    const originalText = btn?.textContent ?? 'Registrarse';
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

    try {
      // Google Apps Script no permite CORS con POST JSON,
      // enviamos como application/x-www-form-urlencoded con mode no-cors
      const body = new URLSearchParams(userData).toString();
      await fetch(KITMAT.API_URL, {
        method: 'POST',
        mode:   'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      // no-cors no devuelve body legible; asumimos éxito si no hubo error de red
      const sessionData = { ...userData };
      delete sessionData.accion;
      KitmatAuth.login(sessionData);
      showToast('✅ ¡Cuenta creada con éxito! Bienvenido/a.', 'success', 2000);
      setTimeout(() => pageTransitionTo(KITMAT.PAGES.store), 800);
    } catch (err) {
      shakeCard();
      showErrorBanner('❌ Error de conexión. Verifica tu internet e intenta de nuevo.');
      showToast('❌ No se pudo conectar con el servidor.', 'error', 3500);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });

  /* ── LOGIN SUBMIT ── */
  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const usuarioInput = $('#input-usuario-login');
    const passInput    = $('#input-pass-login');
    if (!usuarioInput || !passInput) return;

    const usuario    = usuarioInput.value.trim();
    const contrasena = passInput.value;

    if (!usuario || !contrasena) {
      shakeCard();
      showErrorBanner('⚠️ Por favor ingresa tu usuario y contraseña.');
      return;
    }

    const btn = document.getElementById('btn-login');
    const originalText = btn?.textContent ?? 'Iniciar sesión';
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

    try {
      /* ── PASO 1: Enviar datos a Google Sheets via POST no-cors ──
         Mismo método que el registro. Garantiza que el intento de login
         queda registrado en la hoja de cálculo sin importar el resultado.
         (no-cors no devuelve body legible, pero el POST SÍ llega al servidor) */
      await fetch(KITMAT.API_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ accion: 'login', usuario, contrasena }).toString(),
      });

      /* ── PASO 2: Verificar credenciales localmente ──
         - Primero busca el usuario demo hardcodeado
         - Luego busca en localStorage (usuario registrado en este dispositivo) */
      const localResult = KitmatAuth.validateCredentials(usuario, contrasena);

      if (localResult) {
        KitmatAuth.login(localResult);
        showToast(`✅ ¡Bienvenido/a, ${localResult.nombre ?? localResult.usuario}!`, 'success', 2000);
        setTimeout(() => pageTransitionTo(KITMAT.PAGES.store), 700);
        return;
      }

      /* ── PASO 3: Verificación GET contra la API (fallback para usuarios
         registrados en sesiones anteriores que el backend pueda confirmar) ──
         Usa redirect:'follow' para manejar el redirect 302 de Google Apps Script */
      let apiVerified = false;
      try {
        const params   = new URLSearchParams({ accion: 'verificar', usuario, contrasena });
        const response = await fetch(`${KITMAT.API_URL}?${params.toString()}`, {
          method: 'GET', mode: 'cors', redirect: 'follow',
        });
        if (response.ok) {
          const raw  = await response.text();
          const data = raw.trim() ? JSON.parse(raw) : null;
          // Apps Script devuelve { valido: true, datos: {...} }
          if (data && (data.valido === true || data.exito === true)) {
            const sessionData = data.datos ?? { usuario, nombre: data.nombre ?? usuario };
            KitmatAuth.login(sessionData);
            showToast(`✅ ¡Bienvenido/a, ${sessionData.nombre ?? sessionData.usuario}!`, 'success', 2000);
            setTimeout(() => pageTransitionTo(KITMAT.PAGES.store), 700);
            apiVerified = true;
          }
        }
      } catch (_) { /* GET opcional — si falla CORS, solo muestra error de credenciales */ }

      if (!apiVerified) {
        shakeCard();
        applyInputState(usuarioInput, null, false);
        applyInputState(passInput, null, false);
        showErrorBanner('❌ Usuario o contraseña incorrectos. Verifica tus datos.');
      }

    } catch (err) {
      shakeCard();
      applyInputState(usuarioInput, null, false);
      applyInputState(passInput, null, false);
      showErrorBanner('❌ Error de conexión. Verifica tu internet e intenta de nuevo.');
      showToast('❌ No se pudo conectar con el servidor.', 'error', 3500);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });

  /* ── GSAP entrance del card ── */
  if (hasGSAP() && cardEl) {
    gsap.fromTo(cardEl,
      { opacity: 0, y: 55, scale: 0.96 },
      { opacity: 1, y: 0,  scale: 1, duration: 0.80, ease: 'elastic.out(1, 0.65)', delay: 0.2 }
    );
  }

  /* ── Orbs animados ── */
  $$('.auth-orb').forEach((orb, i) => {
    if (hasGSAP()) {
      gsap.fromTo(orb, { opacity: 0 }, {
        opacity: 1, duration: 1.5, delay: i * 0.3,
        ease: 'power2.inOut',
      });
    }
  });
}

/* ============================================================
   PÁGINA STORE — galería, tabs, pedido
   ============================================================ */
function initStorePage() {
  if (!document.getElementById('store-gallery-main')) return;

  /* ── Personalización ── */
  const user = KitmatAuth.getUser();
  const greetEl = document.getElementById('store-greeting');
  if (greetEl && user) {
    greetEl.textContent = `¡Hola, ${user.nombre ?? user.usuario}! 👋`;
    greetEl.style.display = 'block';
  }

  /* ── Galería de imágenes ── */
  const mainImg  = $('#store-gallery-main img');
  const thumbs   = $$('.thumb-item');
  const IMAGES   = [
    'assets/images/kitmat_boxart.jpg',
    'assets/images/cornio_tube_clean.png',
    'assets/images/kitmat_components.png',
    'assets/images/kitmat_box.png',
  ];

  function setMainImage(src, activeThumb) {
    if (!mainImg) return;
    if (hasGSAP()) {
      gsap.to(mainImg, {
        opacity: 0, duration: 0.18,
        onComplete: () => {
          mainImg.src = src;
          gsap.to(mainImg, { opacity: 1, duration: 0.22 });
        }
      });
    } else {
      mainImg.src = src;
    }
    thumbs.forEach(t => t.classList.remove('active'));
    activeThumb?.classList.add('active');
  }

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => setMainImage(IMAGES[idx] ?? IMAGES[0], thumb));
  });
  thumbs[0]?.classList.add('active');

  /* ── Delivery tabs ── */
  const delTabs  = $$('.del-tab');
  const delForms = $$('.del-form');

  delTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      delTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      delForms.forEach((f, fi) => {
        f.classList.toggle('open', fi === idx);
      });
    });
  });
  // Abrir el primero por defecto
  delForms[0]?.classList.add('open');
  delTabs[0]?.classList.add('active');

  /* ── Actualizar info de tienda según ciudad ── */
  const citySelect = document.getElementById('pickup-city');
  const cityInfo   = document.getElementById('pickup-info');
  citySelect?.addEventListener('change', () => {
    if (cityInfo) cityInfo.textContent = `📍 Retiro en tienda disponible en ${citySelect.value}`;
  });

  /* ── Botón Confirmar Pedido ── */
  const confirmBtn = document.getElementById('btn-confirm-order');
  const mobileCTA  = document.getElementById('mobile-cta-order');

  function triggerOrder() {
    if (!confirmBtn) return;
    confirmBtn.disabled = true;
    confirmBtn.classList.add('loading');
    if (mobileCTA) { mobileCTA.disabled = true; mobileCTA.textContent = 'Procesando...'; }

    setTimeout(() => {
      confirmBtn.classList.remove('loading');
      showSuccessModal();
    }, 1500);
  }

  confirmBtn?.addEventListener('click', triggerOrder);
  mobileCTA?.addEventListener('click', triggerOrder);

  /* ── Modal de éxito ── */
  function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (!modal) return;
    modal.classList.add('show');
    if (hasGSAP()) {
      gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.30 });
    }
    createConfetti(65);
  }

  document.getElementById('btn-modal-close')?.addEventListener('click', () => {
    pageTransitionTo(KITMAT.PAGES.home);
  });

  /* ── Product description tabs ── */
  const descTabs   = $$('.desc-tab-btn');
  const descPanels = $$('.desc-panel');

  descTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      descTabs.forEach(t => t.classList.remove('active'));
      descPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      descPanels[idx]?.classList.add('active');
    });
  });
  descTabs[0]?.classList.add('active');
  descPanels[0]?.classList.add('active');

  /* ── Logout ── */
  document.getElementById('btn-logout')?.addEventListener('click', e => {
    e.preventDefault();
    KitmatAuth.logout();
    showToast('Sesión cerrada correctamente.', 'info');
    setTimeout(() => pageTransitionTo(KITMAT.PAGES.home), 800);
  });
}

/* ============================================================
   PÁGINA LANDING — hero timeline
   ============================================================ */
function initLandingPage() {
  if (!document.getElementById('hero-logo-wrap')) return;

  if (!hasGSAP()) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.fromTo('#hero-logo-wrap',
    { opacity: 0, scale: 0.2, rotation: -8 },
    { opacity: 1, scale: 1, rotation: 0, duration: 1.0, ease: 'elastic.out(1, 0.55)' }
  );

  tl.fromTo('.slogan-word, .slogan-dot',
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0, duration: 0.55, stagger: 0.10 },
    '-=0.4'
  );

  tl.fromTo('#hero-subtitle',
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.50 },
    '-=0.2'
  );

  tl.fromTo('#hero-actions',
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.45 },
    '-=0.15'
  );

  // Light flare
  tl.call(() => {
    const flare = document.createElement('div');
    flare.className = 'hero-flare';
    document.body.appendChild(flare);
    gsap.to(flare, {
      scale: 10, opacity: 0, duration: 1.0, ease: 'power2.out',
      onComplete: () => flare.remove(),
    });
  }, [], '-=0.6');
}

/* ============================================================
   INICIALIZACIÓN GLOBAL (DOMContentLoaded)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Fade-in de página
  _pageEntrance();

  // 2. Guard de ruta (store.html requiere sesión)
  _runRouteGuard();

  // 3. Partículas (solo en páginas con canvas)
  _initParticles();

  // 4. Scroll reveal
  _initScrollReveal();

  // 5. Navbar scroll
  _initNavbarScroll();

  // 6. Hamburger
  initHamburger();

  // 7. Magnetic buttons (solo desktop)
  _initMagneticButtons();

  // 8. Floating CTA (landing)
  _initFloatingCTA();

  // 9. Páginas específicas
  initLandingPage();
  initAuthPage();
  initStorePage();

  // 10. Exponer API pública
  window.KITMAT_AUTH    = KitmatAuth;
  window.showToast      = showToast;
  window.createConfetti = createConfetti;
  window.pageTransitionTo = pageTransitionTo;
  window.initHamburger  = initHamburger;
});
