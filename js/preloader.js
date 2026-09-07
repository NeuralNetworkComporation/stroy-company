'use strict';

(() => {
  const loader = document.getElementById('bhpLoader');
  if (!loader) {
    document.documentElement.classList.remove('bhp-lock');
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startedAt = performance.now();
  const minimumVisibleTime = reducedMotion ? 60 : 620;
  const maximumVisibleTime = reducedMotion ? 140 : 1450;
  let finished = false;
  let navigating = false;

  const readLanguage = () => {
    try {
      const stored = localStorage.getItem('bh_language');
      if (stored) return stored;
    } catch {}
    const row = document.cookie.split('; ').find((item) => item.startsWith('bh_language='));
    if (!row) return 'ru';
    try {
      return decodeURIComponent(row.split('=').slice(1).join('='));
    } catch {
      return 'ru';
    }
  };

  const language = readLanguage();
  const loadingCaptions = {
    ru: 'Готовим страницу',
    en: 'Preparing the page',
    ky: 'Баракты даярдап жатабыз'
  };
  const transitionCaptions = {
    ru: 'Открываем раздел',
    en: 'Opening the section',
    ky: 'Бөлүмдү ачып жатабыз'
  };
  const caption = document.getElementById('bhpLoaderCaption');
  if (caption) caption.textContent = loadingCaptions[language] || loadingCaptions.ru;

  const finish = () => {
    if (finished) return;
    finished = true;
    loader.classList.add('is-out');
    document.documentElement.classList.remove('bhp-lock');
    document.documentElement.classList.add('bhp-enter');
    window.setTimeout(() => {
      loader.classList.add('is-ready');
      loader.setAttribute('aria-hidden', 'true');
    }, reducedMotion ? 0 : 720);
  };

  const finishWhenReady = () => {
    const remaining = Math.max(0, minimumVisibleTime - (performance.now() - startedAt));
    window.setTimeout(finish, remaining);
  };

  if (document.readyState === 'complete') finishWhenReady();
  else window.addEventListener('load', finishWhenReady, { once: true });
  window.setTimeout(finish, maximumVisibleTime);

  const shouldTransition = (event, link) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || link.hasAttribute('download')
      || link.dataset.noTransition !== undefined
      || (link.target && link.target !== '_self')
    ) return false;

    let target;
    try {
      target = new URL(link.href, window.location.href);
    } catch {
      return false;
    }

    if (!['http:', 'https:'].includes(target.protocol) || target.origin !== window.location.origin) return false;
    if (
      target.pathname === window.location.pathname
      && target.search === window.location.search
      && target.hash
    ) return false;
    return target.href !== window.location.href;
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || navigating || !shouldTransition(event, link)) return;

    event.preventDefault();
    navigating = true;
    if (caption) caption.textContent = transitionCaptions[language] || transitionCaptions.ru;
    loader.classList.remove('is-ready');
    loader.setAttribute('aria-hidden', 'false');
    loader.getBoundingClientRect();

    requestAnimationFrame(() => {
      loader.classList.remove('is-out');
      loader.classList.add('is-covering');
      window.setTimeout(() => window.location.assign(link.href), reducedMotion ? 20 : 430);
    });
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted && !loader.classList.contains('is-covering')) return;
    navigating = false;
    loader.classList.remove('is-covering');
    loader.classList.add('is-out', 'is-ready');
    loader.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('bhp-lock');
  });
})();
