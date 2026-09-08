/* ======================================================
   BERG HOUSE — main.js v2
   ====================================================== */

   (() => {
    'use strict';

    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('site-enhanced');
    window.addEventListener('load', () => root.classList.add('site-loaded'), { once: true });

    /* ---- SCROLL PROGRESS ---- */
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    document.body.prepend(progress);

    let progressTicking = false;
    const updateProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = Math.min(window.scrollY / max, 1);
      progress.style.transform = `scaleX(${value})`;
      progressTicking = false;
    };
    const requestProgress = () => {
      if (!progressTicking) {
        progressTicking = true;
        requestAnimationFrame(updateProgress);
      }
    };
    window.addEventListener('scroll', requestProgress, { passive: true });
    window.addEventListener('resize', requestProgress);
    requestProgress();
  
    /* ---- HEADER SCROLL ---- */
    const header = document.querySelector('.header');
    if (header) {
      const tick = () => header.classList.toggle('scrolled', window.scrollY > 60);
      window.addEventListener('scroll', tick, { passive: true });
      tick();
    }
  
    /* ---- FIXED REVEAL FOOTER ----
       The page content (.page-shell) is an opaque "sheet" sitting above the
       footer; the footer stays pinned to the bottom of the viewport and is
       uncovered as the sheet scrolls past it (see the html.footer-reveal
       rules in CSS). Only enabled when the footer actually fits in one
       viewport — a fixed footer taller than the screen would have its top
       permanently cut off, so narrow/mobile layouts (stacked columns) just
       fall back to a normal in-flow footer. */
    const footerEl = document.querySelector('.footer');
    const pageShell = document.querySelector('.page-shell');
    if (footerEl && pageShell) {
      let revealEnabled = false;
      const setFooterHeight = () => {
        const h = footerEl.offsetHeight;
        root.style.setProperty('--footer-h', h + 'px');
        revealEnabled = h > 0 && h <= window.innerHeight * 1.02;
        root.classList.toggle('footer-reveal', revealEnabled);
      };
      setFooterHeight();
      window.addEventListener('load', setFooterHeight);
      window.addEventListener('resize', setFooterHeight);
      if (window.ResizeObserver) new ResizeObserver(setFooterHeight).observe(footerEl);

      /* Content inside the footer slides up and fades in as its own slice
         of the reveal passes, staggered group by group — the "curtain"
         effect — instead of just popping in all at once. A light lerp
         toward the raw scroll progress gives it a springy catch-up rather
         than a linear, robotic feel. */
      const revealBlocks = [
        { el: footerEl.querySelector('.footer-brand'), from: 0.05 },
        ...Array.from(footerEl.querySelectorAll('.footer-col')).map((el, i) => ({ el, from: 0.2 + i * 0.12 })),
        { el: footerEl.querySelector('.footer-wordmark'), from: 0.55 },
        { el: footerEl.querySelector('.footer-bottom'), from: 0.72 },
      ].filter(b => b.el);

      const remap = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
      let smoothProgress = 0;
      let revealTicking = false;

      const resetBlocks = () => {
        revealBlocks.forEach(({ el }) => { el.style.transform = ''; el.style.opacity = ''; });
      };

      const applyReveal = () => {
        if (!revealEnabled || reducedMotion) { resetBlocks(); revealTicking = false; return; }
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const footerH = footerEl.offsetHeight || 1;
        const raw = remap(window.scrollY, maxScroll - footerH, maxScroll);
        smoothProgress += (raw - smoothProgress) * 0.16;
        if (Math.abs(smoothProgress - raw) < 0.001) smoothProgress = raw;
        revealBlocks.forEach(({ el, from }) => {
          const p = remap(smoothProgress, from, Math.min(1, from + 0.4));
          el.style.transform = `translateY(${((1 - p) * 46).toFixed(1)}px)`;
          el.style.opacity = p.toFixed(3);
        });
        if (raw > 0.001 || smoothProgress > 0.001) requestAnimationFrame(applyReveal);
        else revealTicking = false;
      };
      const requestReveal = () => {
        if (!revealTicking) { revealTicking = true; requestAnimationFrame(applyReveal); }
      };
      window.addEventListener('scroll', requestReveal, { passive: true });
      window.addEventListener('resize', requestReveal);
      requestReveal();
    }

    /* ---- MOBILE MENU ---- */
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    if (hamburger && mobileNav) {
      const mobileNavIcons = [
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M8.5 20v-6h7v6"/><path d="M3 20h18"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h7v5H4zM13 4h7v8h-7zM4 14h7v6H4zM13 14h7v6h-7z"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v14H4z"/><path d="M8 15l3-3 2.5 2.5L16 12l4 4"/><path d="M8 9h.01"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 11h6M9 15h6M9 19h4"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.2 3.5l3 3-2.1 2.4a15.8 15.8 0 0 0 7 7l2.4-2.1 3 3-1.7 3c-.5.8-1.4 1.2-2.3 1-6.7-1.5-11.8-6.6-13.3-13.3-.2-.9.2-1.8 1-2.3z"/></svg>'
      ];
      mobileNav.id ||= 'mobile-navigation';
      hamburger.setAttribute('aria-controls', mobileNav.id);
      hamburger.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
      mobileNav.setAttribute('inert', '');

      const panel = document.createElement('div');
      panel.className = 'mobile-nav__panel';
      const logo = document.querySelector('.logo');
      const logoImage = document.querySelector('.logo-img--light') || document.querySelector('.logo-img');
      panel.innerHTML = `
        <div class="mobile-nav__top">
          <a class="mobile-nav__brand" href="${logo?.getAttribute('href') || 'index.html'}" aria-label="BERG HOUSE — на главную">
            ${logoImage ? `<img src="${logoImage.getAttribute('src')}" alt="">` : '<span translate="no">BERG HOUSE</span>'}
          </a>
          <button class="mobile-nav__close" type="button" aria-label="Закрыть меню">
            <span></span><span></span>
          </button>
        </div>
        <div class="mobile-nav__section-label">Разделы сайта</div>
      `;
      if (!mobileNav.querySelector('.mobile-nav-contacts')) {
        const contacts = document.createElement('div');
        contacts.className = 'mobile-nav-contacts';
        contacts.innerHTML = '<a href="tel:+996554444448">+996 554 444 448</a><a href="mailto:info@bh.kg">info@bh.kg</a>';
        mobileNav.appendChild(contacts);
      }
      [...mobileNav.children].forEach((child) => panel.appendChild(child));
      const utility = document.createElement('div');
      utility.className = 'mobile-nav__utility';
      panel.appendChild(utility);
      mobileNav.appendChild(panel);
      mobileNav.querySelectorAll('.mobile-nav-link').forEach((link, index) => {
        const icon = link.querySelector('span');
        if (icon) {
          icon.className = 'mobile-nav-link__icon';
          icon.innerHTML = mobileNavIcons[index] || mobileNavIcons[0];
        }
        /* Compare paths with the .html extension and any trailing slash
           stripped — some hosts rewrite "/pages/services.html" to a clean
           "/pages/services" URL, and a plain string match against the
           literal href (which still says "services.html") would silently
           fail to mark that link active. */
        const normalizePagePath = (pathname) => pathname
          .replace(/index\.html$/, '')
          .replace(/\.html$/, '')
          .replace(/\/+$/, '') || '/';
        const linkPath = normalizePagePath(new URL(link.href, location.href).pathname);
        const currentPath = normalizePagePath(location.pathname);
        if (linkPath === currentPath) link.classList.add('active');
      });

      let returnFocus = null;
      const setMobileNavState = (open) => {
        mobileNav.classList.toggle('open', open);
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        mobileNav.setAttribute('aria-hidden', String(!open));
        if (open) mobileNav.removeAttribute('inert');
        else mobileNav.setAttribute('inert', '');
        document.body.classList.toggle('mobile-nav-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          returnFocus = document.activeElement;
          requestAnimationFrame(() => mobileNav.querySelector('.mobile-nav__close')?.focus());
        } else if (returnFocus instanceof HTMLElement) {
          returnFocus.focus({ preventScroll: true });
        }
      };

      hamburger.addEventListener('click', () => {
        setMobileNavState(!mobileNav.classList.contains('open'));
      });
      mobileNav.querySelector('.mobile-nav__close')?.addEventListener('click', () => setMobileNavState(false));
      mobileNav.addEventListener('click', (event) => {
        if (event.target === mobileNav) setMobileNavState(false);
      });
      mobileNav.querySelectorAll('.mobile-nav-link').forEach(l => {
        l.addEventListener('click', () => setMobileNavState(false));
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) setMobileNavState(false);
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && mobileNav.classList.contains('open')) setMobileNavState(false);
      });
    }
  
    /* ---- AUTO POLISH REVEALS ---- */
    const revealSelectors = [
      '.service-card', '.proj', '.pcard', '.post-card', '.post-small-row',
      '.team-card', '.cert-item', '.svc-block',
      '.form-wrap', '.cinfo-row', '.stat-item', '.feat', '.footer-col', '.nl-inner > *',
      '.partner-card'
    ].join(',');

    document.querySelectorAll(revealSelectors).forEach((el, i) => {
      if (!el.classList.contains('rev') && !el.classList.contains('rev-l') && !el.classList.contains('rev-r') && !el.classList.contains('rev-scale')) {
        el.classList.add(el.matches('.service-card, .proj, .pcard, .cert-item, .stat-item') ? 'rev-scale' : 'rev');
        el.style.transitionDelay = `${(i % 6) * 0.055}s`;
      }
    });

    /* ---- SCROLL REVEAL ---- */
    if (reducedMotion) {
      document.querySelectorAll('.rev, .rev-l, .rev-r, .rev-scale').forEach(el => el.classList.add('on'));
    } else {
      const revObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            revObs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -70px 0px' });
    
      document.querySelectorAll('.rev, .rev-l, .rev-r, .rev-scale').forEach(el => revObs.observe(el));
    }
  
    /* ---- NS-ITEMS LINE ANIMATION ---- */
    document.querySelectorAll('.ns-item').forEach(item => {
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { item.classList.add('on'); obs.disconnect(); }
      }, { threshold: 0.5 });
      obs.observe(item);
    });
  
    /* ---- PROCESS LINE TRIGGER ---- */
    const processSteps = document.querySelector('.process-steps');
    if (processSteps) {
      const procObs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { processSteps.classList.add('on'); procObs.disconnect(); }
      }, { threshold: 0.4 });
      procObs.observe(processSteps);
    }
  
    /* ---- COUNTER ANIMATION (ease-out) ---- */
    document.querySelectorAll('[data-count]').forEach(el => {
      const cObs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        const target = parseInt(el.dataset.count, 10);
        const start = performance.now();
        const duration = 2200;
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const update = (now) => {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = Math.floor(easeOut(t) * target).toLocaleString('ru-RU');
          if (t < 1) requestAnimationFrame(update);
          else el.textContent = target.toLocaleString('ru-RU');
        };
        requestAnimationFrame(update);
        cObs.disconnect();
      }, { threshold: 0.5 });
      cObs.observe(el);
    });
  
    /* ---- PREMIUM PARALLAX (smooth + restrained) ---- */
    const parallaxMap = [
      { sel: '.hero-video',       rate: 0.16, mode: 'down',   scale: 1.08, limit: 180 },
      { sel: '.page-hero-bg',     rate: 0.13, mode: 'center', scale: 1.08, limit: 80  },
      { sel: '.about-img-main',   rate: 0.055, mode: 'center', scale: 1.06, limit: 42 },
      { sel: '.about-img-accent', rate: 0.04,  mode: 'center', scale: 1.06, limit: 34 },
      { sel: '.why-img-main',     rate: 0.055, mode: 'center', scale: 1.06, limit: 42 },
      { sel: '.why-img-sub',      rate: 0.04,  mode: 'center', scale: 1.06, limit: 34 },
      { sel: '.cta-bg-img',       rate: 0.08,  mode: 'center', scale: 1.08, limit: 58 },
    ];

    const isMobile = () => window.innerWidth < 768;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const lerp = (a, b, n) => a + (b - a) * n;

    const parallaxItems = [];
    const collectParallaxItems = () => {
      parallaxItems.length = 0;
      if (reducedMotion) return;
      parallaxMap.forEach(cfg => {
        document.querySelectorAll(cfg.sel).forEach(el => {
          parallaxItems.push({ ...cfg, el, current: 0, target: 0 });
          el.style.willChange = 'transform';
        });
      });
    };

    collectParallaxItems();

    let parallaxRaf = null;
    const calculateParallax = () => {
      if (reducedMotion || isMobile()) {
        parallaxItems.forEach(item => { item.el.style.transform = ''; item.current = item.target = 0; });
        return;
      }

      const vy = window.scrollY;
      const vh = window.innerHeight;
      parallaxItems.forEach(item => {
        const wrap = item.el.parentElement || item.el;
        const rect = wrap.getBoundingClientRect();
        if (rect.bottom < -220 || rect.top > vh + 220) return;

        let offset = 0;
        if (item.mode === 'down') {
          offset = vy * item.rate;
        } else {
          const centerDelta = rect.top + rect.height / 2 - vh / 2;
          offset = -centerDelta * item.rate;
        }
        item.target = clamp(offset, -item.limit, item.limit);
      });
    };

    const renderParallax = () => {
      let keepGoing = false;
      parallaxItems.forEach(item => {
        item.current = lerp(item.current, item.target, 0.105);
        if (Math.abs(item.current - item.target) > 0.08) keepGoing = true;
        item.el.style.transform = `translate3d(0, ${item.current.toFixed(2)}px, 0) scale(${item.scale})`;
      });
      parallaxRaf = keepGoing ? requestAnimationFrame(renderParallax) : null;
    };

    const requestParallax = () => {
      calculateParallax();
      if (!parallaxRaf && !reducedMotion) parallaxRaf = requestAnimationFrame(renderParallax);
    };

    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', () => { collectParallaxItems(); requestParallax(); });
    requestParallax();

    /* ---- VIDEO PLAY ---- */
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
      const videoBreakpoint = window.matchMedia('(min-width: 769px)');
      const updateHeroVideo = () => {
        const mayLoadVideo = videoBreakpoint.matches && !reducedMotion && !navigator.connection?.saveData;
        if (mayLoadVideo) {
          if (!heroVideo.getAttribute('src') && heroVideo.dataset.src) {
            heroVideo.src = heroVideo.dataset.src;
            heroVideo.load();
          }
          heroVideo.play().catch(() => {});
        } else {
          heroVideo.pause();
          if (heroVideo.getAttribute('src')) {
            heroVideo.removeAttribute('src');
            heroVideo.load();
          }
        }
      };
      videoBreakpoint.addEventListener?.('change', updateHeroVideo);
      updateHeroVideo();
    }
  
    /* ---- FORM SUBMIT ---- */
    document.querySelectorAll('input, select, textarea').forEach((field, index) => {
      const group = field.closest('.form-group');
      const label = group?.querySelector('label') || field.closest('.form-check')?.querySelector('label');
      if (label) {
        field.id ||= `bh-field-${index + 1}`;
        label.htmlFor = field.id;
      } else if (!field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')) {
        const accessibleName = field.getAttribute('placeholder') || field.getAttribute('name');
        if (accessibleName) field.setAttribute('aria-label', accessibleName);
      }
    });

    document.querySelectorAll('.contact-form').forEach(form => {
      form.querySelectorAll('input, textarea').forEach((field) => {
        if (field.hasAttribute('maxlength')) return;
        if (field.matches('textarea')) field.maxLength = 2000;
        else if (field.matches('[type="email"]')) field.maxLength = 254;
        else if (field.matches('[type="tel"]')) field.maxLength = 40;
        else if (field.matches('[type="text"]')) field.maxLength = 120;
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const btn = form.querySelector('[type="submit"]');
        if (!btn) return;
        const data = new FormData(form);
        const read = (name, fallbackSelector = '') => {
          const value = data.get(name);
          if (typeof value === 'string' && value.trim()) return value.trim();
          return fallbackSelector ? form.querySelector(fallbackSelector)?.value.trim() || '' : '';
        };
        const isNewsletter = form.classList.contains('nl-form');
        const fields = isNewsletter
          ? [['Email', read('email', 'input[type="email"]')]]
          : [
              ['Имя', read('name')],
              ['Телефон', read('phone')],
              ['Email', read('email', 'input[type="email"]')],
              ['Тип задачи', read('type')],
              ['Описание', read('message')]
            ];
        const subject = isNewsletter
          ? 'Подписка на новости BERG HOUSE'
          : 'Заявка с сайта BERG HOUSE';
        const body = [
          'Здравствуйте!',
          '',
          isNewsletter ? 'Прошу добавить адрес в рассылку:' : 'Новая заявка с сайта:',
          ...fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
          '',
          `Страница: ${location.href}`
        ].join('\n');
        const mailto = `mailto:info@bh.kg?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const originalLabel = btn.textContent;
        let status = form.nextElementSibling;
        if (!status?.classList.contains('form-submit-note')) {
          status = document.createElement('p');
          status.className = 'form-submit-note';
          status.setAttribute('role', 'status');
          status.setAttribute('aria-live', 'polite');
          form.insertAdjacentElement('afterend', status);
        }

        btn.textContent = 'Открываем почту...';
        btn.disabled = true;
        status.textContent = 'Откроется почтовое приложение. Проверьте данные и отправьте подготовленное письмо.';

        /* If no mail client is configured, the mailto: does nothing at all and
           the enquiry is silently lost. The browser leaves the page (or at
           least blurs it) when a client does open, so if we are still focused
           a moment later we assume it failed and surface the message plus
           direct contacts instead. */
        let handedOff = false;
        const markHandedOff = () => { handedOff = true; };
        window.addEventListener('blur', markHandedOff, { once: true });
        document.addEventListener('visibilitychange', markHandedOff, { once: true });

        window.location.href = mailto;

        window.setTimeout(() => {
          btn.textContent = originalLabel;
          btn.disabled = false;
          window.removeEventListener('blur', markHandedOff);
          document.removeEventListener('visibilitychange', markHandedOff);
          if (handedOff || document.visibilityState === 'hidden') return;

          form.parentElement.querySelector('.form-fallback')?.remove();
          const panel = document.createElement('div');
          panel.className = 'form-fallback';
          panel.innerHTML =
            '<p class="form-fallback__title">Почтовое приложение не открылось</p>' +
            '<p class="form-fallback__hint">Скопируйте заявку и отправьте её удобным способом — мы ответим в рабочее время.</p>' +
            '<pre class="form-fallback__text"></pre>' +
            '<div class="form-fallback__actions">' +
              '<button type="button" class="btn btn-dark" data-copy>Скопировать заявку</button>' +
              '<a class="btn btn-outline" href="https://wa.me/996554444448" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
              '<a class="btn btn-outline" href="tel:+996554444448">Позвонить</a>' +
            '</div>';
          panel.querySelector('.form-fallback__text').textContent = body;
          status.insertAdjacentElement('afterend', panel);

          const copyBtn = panel.querySelector('[data-copy]');
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(body);
              copyBtn.textContent = 'Скопировано';
            } catch {
              const range = document.createRange();
              range.selectNodeContents(panel.querySelector('.form-fallback__text'));
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
              copyBtn.textContent = 'Выделено — нажмите Ctrl+C';
            }
            window.setTimeout(() => { copyBtn.textContent = 'Скопировать заявку'; }, 2600);
          });
        }, 1500);
      });
    });
  
    /* ---- SMOOTH ANCHOR SCROLL ---- */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });
  
    /* ---- CUSTOM CURSOR (desktop) ----
       Skipped when the visitor asks for reduced motion: the ring trails the
       pointer with easing every frame, and it hides the real system cursor,
       which is exactly what that preference exists to avoid. */
    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
      const style = document.createElement('style');
      style.textContent = `
        .c-cursor { position:fixed; top:0; left:0; pointer-events:none; z-index:9999; }
        .c-dot { position:absolute; width:5px; height:5px; background:rgba(255,255,255,.95); border-radius:50%;
          transform:translate(-50%,-50%); transition:transform .15s, background .3s; }
        .c-ring { position:absolute; width:32px; height:32px; border:1.5px solid rgba(255,255,255,.5);
          border-radius:50%; transform:translate(-50%,-50%);
          transition:width .4s var(--ease-out), height .4s var(--ease-out), border-color .3s, opacity .3s; }
        body.c-light:not(.c-hover) .c-dot { background:rgba(8,16,32,.85); }
        body.c-light:not(.c-hover) .c-ring { border-color:rgba(8,16,32,.42); }
        body.c-hover .c-dot { transform:translate(-50%,-50%) scale(2.5); background:var(--gold); }
        body.c-hover .c-ring { width:52px; height:52px; border-color:rgba(242,159,5,.62); }
        body.c-drag .c-ring { width:72px; height:72px; border-color:rgba(242,159,5,.28); opacity:.6; }
      `;
      document.head.appendChild(style);

      const cur = document.createElement('div');
      cur.className = 'c-cursor';
      cur.innerHTML = '<div class="c-dot"></div><div class="c-ring"></div>';
      document.body.appendChild(cur);

      /* Smart cursor: read the background luminance under the pointer so the
         dot/ring can flip to a dark tone over light sections instead of
         disappearing against white. */
      const bgLuminance = (x, y) => {
        let el = document.elementFromPoint(x, y);
        while (el) {
          const cs = getComputedStyle(el);
          const solid = cs.backgroundColor.match(/[\d.]+/g);
          if (solid) {
            const [r, g, b, a = 1] = solid.map(Number);
            if (a > 0.4) return 0.299 * r + 0.587 * g + 0.114 * b;
          }
          // Gradients report a transparent backgroundColor; sample the last
          // color stop of backgroundImage instead (the base tone — accent
          // glows are layered first in this codebase's gradients).
          if (cs.backgroundImage && cs.backgroundImage !== 'none') {
            const stops = [...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)];
            if (stops.length) {
              const [r, g, b] = stops[stops.length - 1][1].split(',').map(Number);
              return 0.299 * r + 0.587 * g + 0.114 * b;
            }
          }
          el = el.parentElement;
        }
        return 250;
      };

      let mx = 0, my = 0, rx = 0, ry = 0, lightTick = 0;
      document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

      const tick = () => {
        rx += (mx - rx) * 0.15;
        ry += (my - ry) * 0.15;
        if (++lightTick % 6 === 0) {
          document.body.classList.toggle('c-light', bgLuminance(mx, my) > 190);
        }
        cur.querySelector('.c-dot').style.cssText = `left:${mx}px;top:${my}px`;
        cur.querySelector('.c-ring').style.cssText = `left:${rx}px;top:${ry}px`;
        requestAnimationFrame(tick);
      };
      tick();
  
      document.querySelectorAll('a, button, .service-card, .proj, .pcard, .post-card, .post-small-row, .team-card, .cert-item, .stat-item, .cinfo-row').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
      });
  
      document.addEventListener('mousedown', () => document.body.classList.add('c-drag'));
      document.addEventListener('mouseup', () => document.body.classList.remove('c-drag'));
    }
  
    /* ---- SERVICE CARD 3D TILT ---- */
    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', e => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width  - 0.5;
          const y = (e.clientY - rect.top)  / rect.height - 0.5;
          card.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
        });
      });

      /* ---- MAGNETIC BUTTONS ---- */
      document.querySelectorAll('.btn, .nav-cta').forEach(el => {
        el.addEventListener('mousemove', e => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) * 0.13;
          const y = (e.clientY - rect.top - rect.height / 2) * 0.16;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });
      });

      /* ---- FOOTER DOCK (macOS-style hover magnify) ---- */
      document.querySelectorAll('.footer-socials').forEach(dock => {
        const items = Array.from(dock.querySelectorAll('.footer-social'));
        if (!items.length) return;
        const reach = 84;
        const maxScale = 0.45;
        dock.addEventListener('mousemove', e => {
          items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const dist = Math.abs(e.clientX - (rect.left + rect.width / 2));
            const strength = Math.max(0, 1 - dist / reach);
            const scale = 1 + strength * maxScale;
            item.style.transform = `translateY(${(-strength * 10).toFixed(1)}px) scale(${scale.toFixed(3)})`;
          });
        });
        dock.addEventListener('mouseleave', () => {
          items.forEach(item => { item.style.transform = ''; });
        });
      });
    }

    /* ---- PROJECT IMAGE HOVER LIFT ---- */
    document.querySelectorAll('.proj').forEach(proj => {
      proj.addEventListener('mouseenter', () => {
        document.querySelectorAll('.proj').forEach(p => {
          if (p !== proj) p.style.opacity = '0.65';
        });
      });
      proj.addEventListener('mouseleave', () => {
        document.querySelectorAll('.proj').forEach(p => { p.style.opacity = ''; });
      });
    });
  
  })();

/* BERG HOUSE runtime additions */
(() => {
  'use strict';
  const inPages = location.pathname.includes('/pages/');
  const pagePrefix = inPages ? '' : 'pages/';
  const maxAge = 60 * 60 * 24 * 180;
  const secureCookie = location.protocol === 'https:' ? '; Secure' : '';
  const setStored = (name, value, age = maxAge) => {
    try { age <= 0 ? localStorage.removeItem(name) : localStorage.setItem(name, value); } catch {}
    document.cookie = name + '=' + encodeURIComponent(value) + '; max-age=' + age + '; path=/; SameSite=Lax' + secureCookie;
  };
  const getStored = (name) => {
    try { const value = localStorage.getItem(name); if (value) return value; } catch {}
    const row = document.cookie.split('; ').find((item) => item.startsWith(name + '='));
    if (!row) return '';
    try { return decodeURIComponent(row.split('=').slice(1).join('=')); } catch { return ''; }
  };

  const languages = [
    ['ru','🇷🇺','RU','Русский','Выбрать язык'],
    ['ky','🇰🇬','KG','Кыргызча','Тилди тандоо'],
    ['en','🇬🇧','EN','English','Choose language']
  ];
  const getLanguage = (code) => languages.find((language) => language[0] === code) || languages[0];
  const setSiteLanguage = (lang) => {
    const selected = getLanguage(lang)[0];
    setStored('bh_language', selected);
    location.reload();
  };
  const createLanguagePicker = () => {
    const nav = document.querySelector('.nav-inner');
    if (!nav || document.querySelector('.language-picker')) return;
    const current = getStored('bh_language') || 'ru';
    const picker = document.createElement('div');
    picker.className = 'language-picker notranslate';
    picker.setAttribute('translate', 'no');
    const active = getLanguage(current);
    picker.innerHTML = '<button class="language-picker__button" type="button" aria-label="' + active[4] + '" data-label="' + active[4] + '"><span class="language-picker__flag">' + active[1] + '</span><span class="language-picker__code">' + active[2] + '</span></button><div class="language-picker__menu">' + languages.map(l => '<button class="language-picker__option ' + (l[0] === active[0] ? 'active' : '') + '" type="button" data-lang="' + l[0] + '"><span>' + l[1] + '</span><span>' + l[3] + '</span></button>').join('') + '</div>';
    nav.insertBefore(picker, nav.querySelector('.hamburger'));
    const mobile = document.querySelector('.mobile-nav');
    if (mobile) (mobile.querySelector('.mobile-nav__utility') || mobile).appendChild(picker.cloneNode(true));
    document.querySelectorAll('.language-picker').forEach((node) => {
      node.querySelector('.language-picker__button').addEventListener('click', () => node.classList.toggle('open'));
      node.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => setSiteLanguage(btn.dataset.lang)));
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.language-picker')) document.querySelectorAll('.language-picker').forEach(p => p.classList.remove('open')); });
  };
  createLanguagePicker();

  const createMobileDock = () => {
    if (document.querySelector('.mobile-bottom-nav')) return;
    const rootPrefix = inPages ? '../' : '';
    /* Same normalization as the off-canvas menu above: strip ".html" and any
       trailing slash so this still matches on hosts that serve clean URLs
       (e.g. "/pages/services" instead of "/pages/services.html"). */
    const normalizePagePath = (pathname) => pathname
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/+$/, '') || '/';
    const currentPath = normalizePagePath(location.pathname);
    const items = [
      {
        label: 'Главная',
        href: rootPrefix + 'index.html',
        match: (path) => !path.includes('/pages/'),
        icon: '<path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z"/>'
      },
      {
        label: 'Услуги',
        href: pagePrefix + 'services.html',
        match: (path) => path.endsWith('/services'),
        icon: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>'
      },
      {
        label: 'Проекты',
        href: pagePrefix + 'projects.html',
        match: (path) => path.endsWith('/projects'),
        icon: '<path d="M4 5.5h16v13H4z"/><path d="m7 15 3.2-3.4 2.5 2.4 2.2-2.1L18 15M8 9h.01"/>'
      },
      {
        label: 'Контакты',
        href: pagePrefix + 'contacts.html',
        match: (path) => path.endsWith('/contacts'),
        icon: '<path d="M6.8 3.5h3l1.5 4-2 1.6a15 15 0 0 0 5.6 5.6l1.6-2 4 1.5v3c0 1.5-1.3 2.8-2.8 2.7A16.4 16.4 0 0 1 4.1 6.3C4 4.8 5.3 3.5 6.8 3.5Z"/>'
      }
    ];
    const dock = document.createElement('nav');
    dock.className = 'mobile-bottom-nav';
    dock.setAttribute('aria-label', 'Основная мобильная навигация');
    dock.innerHTML = items.map((item) => {
      const active = item.match(currentPath);
      return `<a class="mobile-bottom-nav__link${active ? ' active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}>
        <span class="mobile-bottom-nav__icon"><svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg></span>
        <span>${item.label}</span>
      </a>`;
    }).join('');
    document.body.appendChild(dock);
    document.body.classList.add('has-mobile-dock');
  };
  createMobileDock();


  /* The map loads on its own (no "show map" click needed) — just the
     fallback safety net stays: if it hasn't rendered within a few seconds
     of coming into view, swap it for direct links instead of leaving a
     dead block on the page. */
  const initMapFallback = () => {
    const frame = document.querySelector('[data-map-frame]');
    if (!frame) return;
    const wrap = frame.closest('.google-map-wrap') || frame.parentElement;
    const { mapFallbackGoogle, mapFallbackYandex } = frame.dataset;

    let settled = false;
    const showFallback = () => {
      if (settled || !wrap) return;
      settled = true;
      frame.remove();
      const fallback = document.createElement('div');
      fallback.className = 'map-fallback';
      const links = [
        mapFallbackGoogle && ['Google Карты', mapFallbackGoogle],
        mapFallbackYandex && ['Яндекс Карты', mapFallbackYandex],
      ].filter(Boolean);
      fallback.innerHTML =
        '<p class="map-fallback__title">Карта не загрузилась</p>' +
        '<p class="map-fallback__hint">Возможная причина — VPN или блокировка стороннего контента. Откройте адрес напрямую:</p>' +
        '<div class="map-fallback__links">' +
        links.map(([label, href]) =>
          `<a class="btn btn-brass" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
        ).join('') +
        '</div>';
      wrap.appendChild(fallback);
    };
    frame.addEventListener('load', () => { settled = true; }, { once: true });
    frame.addEventListener('error', showFallback, { once: true });

    /* The iframe is loading="lazy", so the browser only fetches it once it
       nears the viewport — starting the countdown at page load would fire
       long before anyone scrolls down to it. Wait until it's actually in
       view before arming the timeout. */
    const armTimeout = () => window.setTimeout(showFallback, 8000);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        armTimeout();
      }, { rootMargin: '200px' });
      observer.observe(frame);
    } else {
      armTimeout();
    }
  };
  initMapFallback();

  const showCookieBanner = () => {
    document.querySelector('.cookie-banner')?.remove();
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = '<div><strong>Cookie-файлы</strong><p>Сайт использует необходимые cookie для сохранения языка, согласия и корректной работы интерфейса. <a href="' + pagePrefix + 'cookies.html">Подробнее</a></p></div><div class="cookie-actions"><button class="btn btn-outline" type="button" data-cookie-necessary>Только необходимые</button><button class="btn btn-dark" type="button" data-cookie-accept>Принять</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('[data-cookie-accept]').addEventListener('click', () => {
      setStored('bh_cookie_consent','all');
      banner.remove();
    });
    banner.querySelector('[data-cookie-necessary]').addEventListener('click', () => { setStored('bh_cookie_consent','necessary'); banner.remove(); });
  };
  if (!getStored('bh_cookie_consent')) showCookieBanner();
  document.getElementById('cookieSettingsBtn')?.addEventListener('click', () => { setStored('bh_cookie_consent','',0); showCookieBanner(); });

  const modal = document.createElement('div');
  modal.className = 'site-modal';
  modal.innerHTML = '<div class="site-modal__backdrop" data-close-modal></div><article class="site-modal__dialog" role="dialog" aria-modal="true"><button class="site-modal__close" type="button" data-close-modal aria-label="Закрыть">×</button><div class="site-modal__media"><img class="site-modal__img" alt="" loading="lazy"></div><div class="site-modal__body"></div></article><div class="site-lightbox" hidden><button class="site-lightbox__close" type="button" data-close-lightbox aria-label="Закрыть">×</button><button class="site-lightbox__nav site-lightbox__nav--prev" type="button" data-shot-step="-1" aria-label="Предыдущее фото">‹</button><img class="site-lightbox__img" alt=""><button class="site-lightbox__nav site-lightbox__nav--next" type="button" data-shot-step="1" aria-label="Следующее фото">›</button></div>';
  document.body.appendChild(modal);
  const dialog = modal.querySelector('.site-modal__dialog');
  const modalBody = modal.querySelector('.site-modal__body');
  const lightbox = modal.querySelector('.site-lightbox');
  const lightboxImg = modal.querySelector('.site-lightbox__img');

  // Photo viewer for the gallery inside a rich project card.
  let shots = [];
  let shotIndex = 0;
  const showShot = (index) => {
    if (!shots.length) return;
    shotIndex = (index + shots.length) % shots.length;
    const source = shots[shotIndex];
    lightboxImg.src = source.currentSrc || source.src;
    lightboxImg.alt = source.alt || '';
  };
  const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
  };
  const openLightbox = (index) => {
    showShot(index);
    lightbox.hidden = false;
  };
  lightbox.addEventListener('click', (e) => {
    const step = e.target.closest('[data-shot-step]');
    if (step) { showShot(shotIndex + Number(step.dataset.shotStep)); return; }
    closeLightbox();
  });
  const wireGallery = () => {
    shots = [...modalBody.querySelectorAll('.pd-shot img')];
    shots.forEach((shot, index) => {
      shot.parentElement.addEventListener('click', () => openLightbox(index));
    });
  };

  const closeModal = () => {
    closeLightbox();
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };
  modal.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') { if (lightbox.hidden) closeModal(); else closeLightbox(); return; }
    if (lightbox.hidden) return;
    if (e.key === 'ArrowLeft') showShot(shotIndex - 1);
    if (e.key === 'ArrowRight') showShot(shotIndex + 1);
  });
  const openModal = (card) => {
    const translate = window.BH_I18N?.t || ((value) => value);
    const detail = card.dataset.modalDetail ? document.getElementById(card.dataset.modalDetail) : null;
    const title = card.dataset.modalTitle || card.querySelector('h2,h3,h4,.service-title,.proj-name,.pcard-name,.cert-name')?.textContent?.trim() || 'BERG HOUSE';
    const text = card.dataset.modalText || card.querySelector('p,.service-desc,.step-desc,.cert-desc')?.textContent?.trim() || 'Описание будет добавлено после согласования материалов.';
    const media = modal.querySelector('.site-modal__media');
    const img = modal.querySelector('.site-modal__img');
    const sourceImg = card.querySelector('img');
    if (sourceImg?.src) {
      img.src = sourceImg.currentSrc || sourceImg.src;
      img.alt = sourceImg.alt || title;
      media.classList.add('has-img');
    } else {
      img.removeAttribute('src');
      media.classList.remove('has-img');
    }
    shots = [];
    closeLightbox();
    if (detail) {
      dialog.classList.add('is-rich');
      modalBody.innerHTML = detail.innerHTML;
      wireGallery();
    } else {
      dialog.classList.remove('is-rich');
      modalBody.innerHTML = '<span class="site-modal__kicker"></span><h3></h3><p></p>';
      modalBody.querySelector('.site-modal__kicker').textContent = translate(card.dataset.modalKicker || 'BERG HOUSE');
      modalBody.querySelector('h3').textContent = translate(title);
      modalBody.querySelector('p').textContent = translate(text);
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    dialog.scrollTop = 0;
  };
  document.querySelectorAll('.service-card,.svc-block,.proj,.pcard,.post-card,.post-small-row,.feat,.cert-item').forEach((card) => {
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
    card.addEventListener('click', (e) => { if (e.target.closest('a,button')) return; openModal(card); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); } });
  });
  window.BH_I18N?.apply(document);
})();
