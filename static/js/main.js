/**
 * Aurex Core — Premium Animation Engine
 * ──────────────────────────────────────
 * Cinematic preloader, custom cursor, scroll progress,
 * blur reveals, magnetic buttons, 3D card tilt,
 * typewriter hero, SVG stroke draw-in, parallax,
 * form micro-interactions
 *
 * Works on desktop + mobile. Respects prefers-reduced-motion.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return document.querySelectorAll(s); };

  // ══════════════════════════════════════════
  //  1. CINEMATIC PRELOADER
  // ══════════════════════════════════════════
  function initPreloader(onDone) {
    var preloader = $('#preloader');
    if (!preloader) { onDone(); return; }

    var alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem('aurex_preloader_shown_v6') === '1'; } catch (e) { }

    if (prefersReducedMotion || alreadyShown) {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      onDone();
      return;
    }

    try { sessionStorage.setItem('aurex_preloader_shown_v6', '1'); } catch (e) { }
    document.body.style.overflow = 'hidden';

    var completed = false;
    function complete() {
      if (completed) return;
      completed = true;
      document.body.style.overflow = '';
      onDone();
    }

    function runFallback() {
      var fb = document.getElementById('plFallback');
      if (fb) fb.classList.add('is-active');
      setTimeout(function () {
        preloader.classList.add('is-done');
        setTimeout(function () {
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
          complete();
        }, 500);
      }, 1400);
    }

    // Wait up to 800ms for the Three.js ES module to resolve and register window.AurexPreloader3D.
    // If it doesn't arrive in time (CDN slow, import map unsupported, etc.), use the logo-fade fallback.
    var waited = 0;
    var pollStep = 40;
    var maxWait = 800;
    (function waitForModule() {
      if (window.AurexPreloader3D && typeof window.AurexPreloader3D.run === 'function') {
        try {
          window.AurexPreloader3D.run(complete);
        } catch (e) {
          runFallback();
        }
        return;
      }
      waited += pollStep;
      if (waited >= maxWait) { runFallback(); return; }
      setTimeout(waitForModule, pollStep);
    })();
  }

  // ══════════════════════════════════════════
  //  2. CUSTOM CURSOR (desktop only)
  // ══════════════════════════════════════════
  function initCursor() {
    if (prefersReducedMotion || isTouch) return;

    var dot = $('#cr');
    var ring = $('#crr');
    if (!dot || !ring) return;

    var cx = 0, cy = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', function (e) {
      cx = e.clientX;
      cy = e.clientY;
      gsap.set(dot, { x: cx, y: cy });
    });

    (function animRing() {
      rx += (cx - rx) * 0.11;
      ry += (cy - ry) * 0.11;
      gsap.set(ring, { x: rx, y: ry });
      requestAnimationFrame(animRing);
    })();

    document.addEventListener('mousedown', function () { document.body.classList.add('cursor-click'); });
    document.addEventListener('mouseup', function () { document.body.classList.remove('cursor-click'); });

    $$('a, button, .card, .card-glass, .card-dark, .btn-primary, .btn-secondary, .btn-ghost, .partner-logo-img, .map-marker, input, textarea, select').forEach(function (el) {
      el.addEventListener('mouseenter', function () { document.body.classList.add('cursor-hover'); });
      el.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-hover'); });
    });

    document.addEventListener('mouseleave', function () {
      gsap.to([dot, ring], { opacity: 0, duration: 0.25 });
    });
    document.addEventListener('mouseenter', function () {
      gsap.to([dot, ring], { opacity: 1, duration: 0.25 });
    });
  }

  // ══════════════════════════════════════════
  //  3. SCROLL PROGRESS BAR (all devices)
  // ══════════════════════════════════════════
  function initScrollProgress() {
    var bar = $('#scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      var pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
  }

  // ══════════════════════════════════════════
  //  4. MAGNETIC BUTTONS (desktop only)
  // ══════════════════════════════════════════
  function initMagnetic() {
    if (prefersReducedMotion || isTouch) return;
    $$('.btn-primary, .btn-secondary').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.25, y: dy * 0.25, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
      });
    });
  }

  // ══════════════════════════════════════════
  //  5. 3D CARD TILT ON HOVER (desktop only)
  // ══════════════════════════════════════════
  function initCardTilt() {
    if (prefersReducedMotion || isTouch) return;

    $$('.card, .card-glass, .card-dark').forEach(function (card) {
      card.style.transformStyle = 'preserve-3d';

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = ((y - centerY) / centerY) * -6;
        var rotateY = ((x - centerX) / centerX) * 6;

        gsap.to(card, {
          rotateX: rotateX,
          rotateY: rotateY,
          duration: 0.4,
          ease: 'power2.out',
          transformPerspective: 800
        });
      });

      card.addEventListener('mouseleave', function () {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'elastic.out(1,0.5)',
          transformPerspective: 800
        });
      });
    });
  }

  // ══════════════════════════════════════════
  //  6. HERO ORB PARALLAX ON MOUSE (desktop)
  // ══════════════════════════════════════════
  function initOrbParallax() {
    if (prefersReducedMotion || isTouch) return;
    var orb = $('#hero-orb');
    var hero = $('#hero');
    if (!orb || !hero) return;

    hero.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth) - 0.5;
      var y = (e.clientY / window.innerHeight) - 0.5;
      gsap.to(orb, { x: x * 50, y: y * 35, duration: 0.9, ease: 'power2.out' });
    });
  }

  // ══════════════════════════════════════════
  //  7. HERO TYPEWRITER / WORD CYCLING
  // ══════════════════════════════════════════
  function initTypewriter() {
    var el = $('.shimmer-text');
    if (!el || prefersReducedMotion) return;

    var phrases = [
      'New Zealand businesses',
      'scalable infrastructure',
      'intelligent automation',
      'secure environments',
      'operational excellence'
    ];
    var currentIndex = 0;

    function cycleWord() {
      currentIndex = (currentIndex + 1) % phrases.length;
      gsap.to(el, {
        opacity: 0, y: 14, filter: 'blur(4px)', duration: 0.35, ease: 'power2.in',
        onComplete: function () {
          el.textContent = phrases[currentIndex];
          gsap.fromTo(el,
            { opacity: 0, y: -14, filter: 'blur(4px)' },
            { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' }
          );
        }
      });
    }

    setTimeout(function () {
      setInterval(cycleWord, 3000);
    }, 3500);
  }

  // ══════════════════════════════════════════
  //  8. SVG ICON STROKE DRAW-IN ON SCROLL
  // ══════════════════════════════════════════
  function initSVGDraw() {
    if (prefersReducedMotion) return;

    $$('.card svg, .card-glass svg, .card-dark svg').forEach(function (svg) {
      var paths = svg.querySelectorAll('path');
      if (!paths.length) return;

      var drawable = [];
      paths.forEach(function (path) {
        try {
          var len = path.getTotalLength();
          if (len > 0) {
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
            drawable.push(path);
          }
        } catch (e) { /* skip non-drawable paths */ }
      });

      if (!drawable.length) return;

      ScrollTrigger.create({
        trigger: svg.closest('.card, .card-glass, .card-dark') || svg,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          drawable.forEach(function (path, i) {
            gsap.to(path, {
              strokeDashoffset: 0,
              duration: 0.9,
              ease: 'power2.out',
              delay: i * 0.1 + 0.2
            });
          });
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  9. GSAP REVEAL + PARALLAX SYSTEM
  // ══════════════════════════════════════════
  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      $$('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);

    gsap.defaults({ ease: 'power3.out', duration: prefersReducedMotion ? 0.01 : 0.7 });

    // ── Set initial invisible states with blur ─────────────
    if (!prefersReducedMotion) {
      gsap.set('.reveal', { opacity: 0, y: 36, filter: 'blur(5px)' });
      gsap.set('.reveal-left', { opacity: 0, x: -30, filter: 'blur(4px)' });
      gsap.set('.reveal-right', { opacity: 0, x: 30, filter: 'blur(4px)' });
      gsap.set('.reveal-scale', { opacity: 0, scale: 0.88, filter: 'blur(6px)' });
    }

    // ── Reveal: fade up + blur ─────────────────────────────
    $$('.reveal').forEach(function (el) {
      var delay = parseFloat(el.dataset.delay || 0);
      gsap.to(el, {
        opacity: 1, y: 0, filter: 'blur(0px)', delay: delay,
        duration: prefersReducedMotion ? 0.01 : 0.75,
        ease: 'power3.out',
        clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });

    // ── Reveal: slide left + blur ──────────────────────────
    $$('.reveal-left').forEach(function (el) {
      var delay = parseFloat(el.dataset.delay || 0);
      gsap.to(el, {
        opacity: 1, x: 0, filter: 'blur(0px)', delay: delay,
        duration: prefersReducedMotion ? 0.01 : 0.75,
        clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });

    // ── Reveal: slide right + blur ─────────────────────────
    $$('.reveal-right').forEach(function (el) {
      var delay = parseFloat(el.dataset.delay || 0);
      gsap.to(el, {
        opacity: 1, x: 0, filter: 'blur(0px)', delay: delay,
        duration: prefersReducedMotion ? 0.01 : 0.75,
        clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });

    // ── Reveal: scale + blur ───────────────────────────────
    $$('.reveal-scale').forEach(function (el) {
      var delay = parseFloat(el.dataset.delay || 0);
      gsap.to(el, {
        opacity: 1, scale: 1, filter: 'blur(0px)', delay: delay,
        duration: prefersReducedMotion ? 0.01 : 0.75,
        clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });

    // ── Hero parallax layers ───────────────────────────────
    if (!prefersReducedMotion) {
      var hero = $('#hero');
      if (hero) {
        var hexLayer1 = $('#hex-layer-1');
        if (hexLayer1) {
          gsap.to(hexLayer1, {
            yPercent: 8, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 2.5 },
          });
        }
        var hexLayer2 = $('#hex-layer-2');
        if (hexLayer2) {
          gsap.to(hexLayer2, {
            yPercent: 22, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.8 },
          });
        }
        var heroOrb = $('#hero-orb');
        if (heroOrb) {
          gsap.to(heroOrb, {
            yPercent: 35, xPercent: 5, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.2 },
          });
        }
        if (!isMobile) {
          var heroCopy = hero.querySelector('.grid > div:first-child');
          if (heroCopy) {
            gsap.to(heroCopy, {
              y: -30, ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.7 },
            });
          }
        }
      }
    }

    // ── Scroll indicator dot bounce ─────────────────────────
    var scrollDot = $('#scroll-dot');
    if (scrollDot && !prefersReducedMotion) {
      gsap.to(scrollDot, { y: 12, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }

    // ── Step number pop ─────────────────────────────────────
    $$('.step-num').forEach(function (el, i) {
      gsap.fromTo(el,
        { scale: 0.7, opacity: 0 },
        {
          scale: 1, opacity: 1,
          duration: prefersReducedMotion ? 0.01 : 0.4,
          delay: i * 0.1,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
        }
      );
    });

    // ── Animated stat counters ──────────────────────────────
    $$('.counter-num[data-target]').forEach(function (el) {
      var target = parseFloat(el.dataset.target);
      var isFloat = String(target).includes('.');
      var obj = { val: 0 };

      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          if (prefersReducedMotion) {
            el.textContent = isFloat ? target.toFixed(1) : target;
            return;
          }
          gsap.to(obj, {
            val: target, duration: 1.8, ease: 'power2.out',
            onUpdate: function () {
              el.textContent = isFloat ? obj.val.toFixed(1) : Math.round(obj.val);
            },
          });
        },
      });
    });

    // ── NZ map markers stagger entrance ─────────────────────
    var mapMarkers = $$('.map-marker');
    if (mapMarkers.length > 0) {
      gsap.fromTo(mapMarkers,
        { scale: 0, opacity: 0 },
        {
          scale: 1, opacity: 1,
          duration: prefersReducedMotion ? 0.01 : 0.5,
          stagger: 0.15,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: mapMarkers[0].closest('section') || mapMarkers[0],
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // ── Section hex background parallax ─────────────────────
    if (!prefersReducedMotion) {
      $$('section.section-pad').forEach(function (sec) {
        var hexBg = sec.querySelector('.hex-overlay, .hex-overlay-dark');
        if (hexBg) {
          gsap.to(hexBg, {
            backgroundPositionY: '20%', ease: 'none',
            scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1 }
          });
        }
      });
    }

    // ── SVG icon stroke draw-in ─────────────────────────────
    initSVGDraw();

    // ── Partner marquee: pause on tab-blur ──────────────────
    var marqueeEl = $('.marquee-animate');
    if (marqueeEl) {
      document.addEventListener('visibilitychange', function () {
        marqueeEl.style.animationPlayState = document.hidden ? 'paused' : 'running';
      });
    }

    // ── Smooth scroll for anchor links ──────────────────────
    if (typeof ScrollToPlugin !== 'undefined') {
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var target = $(a.getAttribute('href'));
          if (!target) return;
          e.preventDefault();
          gsap.killTweensOf(window);
          gsap.to(window, { scrollTo: { y: target, offsetY: 72 }, duration: 0.95, ease: 'power2.inOut' });
        });
      });
    }

    // ── Refresh ScrollTrigger on resize ─────────────────────
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        isMobile = window.matchMedia('(max-width: 768px)').matches;
        ScrollTrigger.refresh();
      }, 250);
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) ScrollTrigger.refresh();
    });
  }

  // ══════════════════════════════════════════
  //  10. FORM MICRO-INTERACTIONS
  // ══════════════════════════════════════════
  function initFormEnhancements() {
    // ── Filled-state visual feedback ────────────────────────
    $$('.form-input').forEach(function (field) {
      function checkValue() {
        if (field.value && field.value.trim()) {
          field.classList.add('has-value');
        } else {
          field.classList.remove('has-value');
        }
      }
      field.addEventListener('input', checkValue);
      field.addEventListener('change', checkValue);
      field.addEventListener('blur', checkValue);
      checkValue();
    });

    // ── Focus micro-pulse animation ─────────────────────────
    if (!prefersReducedMotion) {
      $$('.form-input').forEach(function (field) {
        field.addEventListener('focus', function () {
          gsap.fromTo(field,
            { scale: 1 },
            { scale: 1.01, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }
          );
        });
      });
    }

    // ── Success state animation ─────────────────────────────
    if (!prefersReducedMotion) {
      var successBlock = null;
      $$('.rounded-2xl').forEach(function (el) {
        if (el.textContent && el.textContent.indexOf('Thank you') !== -1) successBlock = el;
      });
      if (successBlock) {
        var checkIcon = successBlock.querySelector('svg');
        var textEls = successBlock.querySelectorAll('p');
        if (checkIcon) gsap.from(checkIcon, { scale: 0, rotation: -90, opacity: 0, duration: 0.6, ease: 'back.out(1.7)', delay: 0.2 });
        if (textEls.length) gsap.from(textEls, { y: 15, opacity: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out', delay: 0.5 });
      }
    }

    // ── Submit button arrow animation ────────────────────────
    var submitBtn = $('button[type="submit"]');
    if (submitBtn && !prefersReducedMotion) {
      var arrow = submitBtn.querySelector('svg');
      if (arrow) {
        submitBtn.addEventListener('mouseenter', function () {
          gsap.to(arrow, { x: 4, duration: 0.3, ease: 'power2.out' });
        });
        submitBtn.addEventListener('mouseleave', function () {
          gsap.to(arrow, { x: 0, duration: 0.3, ease: 'power2.out' });
        });
      }
    }

    // ── Live validation (from original) ─────────────────────
    $$('input[required], textarea[required], select[required]').forEach(function (field) {
      field.addEventListener('blur', function () {
        if (!field.value.trim()) {
          field.classList.add('ring-1', 'ring-red-400', 'border-red-300');
        } else {
          field.classList.remove('ring-1', 'ring-red-400', 'border-red-300');
        }
      });
      field.addEventListener('input', function () {
        if (field.value.trim()) {
          field.classList.remove('ring-1', 'ring-red-400', 'border-red-300');
        }
      });
    });

    // ── Honeypot protection ─────────────────────────────────
    $$('form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        var honeypot = form.querySelector('input[name="website"]');
        if (honeypot && honeypot.value) {
          e.preventDefault();
          return false;
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  BOOT SEQUENCE
  // ══════════════════════════════════════════
  function bootSite() {
    initCursor();
    initScrollProgress();
    initMagnetic();
    initCardTilt();
    initOrbParallax();
    initTypewriter();
    initGSAP();
    initFormEnhancements();
  }

  function boot() {
    initPreloader(function () {
      if (typeof gsap !== 'undefined') {
        bootSite();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
