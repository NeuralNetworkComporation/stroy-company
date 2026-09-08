/**
 * BERG HOUSE video player.
 *
 * A self-hosted replacement for the YouTube embed: nothing is requested until
 * the viewer presses play, and the chrome follows the site's own palette.
 * Markup only declares a `.bhp-player` shell with data attributes; every
 * control below is built here so the two pages that use it stay short.
 */
(() => {
  'use strict';

  const translate = (value) => (window.BH_I18N && window.BH_I18N.t ? window.BH_I18N.t(value) : value);

  const svg = (body) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
  const ICONS = {
    play: svg('<path d="M8 5.2 19 12 8 18.8z"/>'),
    pause: svg('<path d="M7 5h3.3v14H7zM13.7 5H17v14h-3.3z"/>'),
    volume: svg('<path d="M4 9.4h3.3L12 5.3v13.4L7.3 14.6H4z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M17.9 6.7a7.5 7.5 0 0 1 0 10.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    muted: svg('<path d="M4 9.4h3.3L12 5.3v13.4L7.3 14.6H4z"/><path d="m15.6 9.6 4.8 4.8m0-4.8-4.8 4.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    gear: svg('<path d="M12 8.6A3.4 3.4 0 1 0 12 15.4 3.4 3.4 0 0 0 12 8.6z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.9l1.5 2.2 2.6-.5.5 2.6 2.2 1.5-1.3 2.3 1.3 2.3-2.2 1.5-.5 2.6-2.6-.5L12 21.1l-1.5-2.2-2.6.5-.5-2.6-2.2-1.5L4.5 13l-1.3-2.3 2.2-1.5.5-2.6 2.6.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
    enter: svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
    exit: svg('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  };

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
  };

  const button = (name, label, markup) =>
    `<button class="bhp-btn bhp-btn--${name}" type="button" data-action="${name}" aria-label="${label}">${markup}</button>`;

  const build = (root) => {
    if (root.dataset.bhpReady) return;
    root.dataset.bhpReady = '1';

    const startAt = Number(root.dataset.videoStart || 0) || 0;
    const source = root.dataset.videoSrc;
    const fallbackUrl = root.dataset.videoFallback || '';
    const title = root.dataset.videoTitle || '';

    const video = root.querySelector('video');
    if (!video) return;
    video.setAttribute('playsinline', '');
    video.preload = 'none';

    /* Until the file is uploaded the poster still works as a link out, so the
       section never shows a play button that leads nowhere. */
    if (!source) {
      if (!fallbackUrl) return;
      root.insertAdjacentHTML('beforeend',
        '<a class="bhp-poster-play bhp-poster-play--link" href="' + fallbackUrl + '" target="_blank" rel="noopener noreferrer" aria-label="' + translate('Смотреть на YouTube') + '">' +
          '<span class="bhp-poster-play__ring" aria-hidden="true"></span>' + ICONS.play +
        '</a>' +
        '<span class="bhp-external">' + translate('Смотреть на YouTube') + '</span>');
      root.classList.add('is-external');
      return;
    }

    root.insertAdjacentHTML('beforeend',
      '<button class="bhp-poster-play" type="button" aria-label="' + translate('Смотреть видео') + '">' +
        '<span class="bhp-poster-play__ring" aria-hidden="true"></span>' + ICONS.play +
      '</button>' +
      '<div class="bhp-spinner" hidden aria-hidden="true"></div>' +
      '<div class="bhp-bar">' +
        '<div class="bhp-track" role="slider" tabindex="-1" aria-label="' + translate('Перемотка') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<span class="bhp-track__rail"></span>' +
          '<span class="bhp-track__buffer"></span>' +
          '<span class="bhp-track__played"></span>' +
          '<span class="bhp-track__knob"></span>' +
          '<span class="bhp-track__tip" hidden></span>' +
        '</div>' +
        '<div class="bhp-row">' +
          button('play', translate('Воспроизвести'), ICONS.play) +
          '<div class="bhp-volume">' +
            button('mute', translate('Звук'), ICONS.volume) +
            '<input class="bhp-volume__slider" type="range" min="0" max="1" step="0.05" value="1" aria-label="' + translate('Громкость') + '">' +
          '</div>' +
          '<span class="bhp-time"><b>0:00</b> / <i>0:00</i></span>' +
          '<span class="bhp-spacer"></span>' +
          '<div class="bhp-speed">' +
            button('speed', translate('Скорость воспроизведения'), ICONS.gear) +
            '<div class="bhp-menu" hidden>' +
              SPEEDS.map((s) =>
                `<button class="bhp-menu__item${s === 1 ? ' is-active' : ''}" type="button" data-speed="${s}">${s === 1 ? translate('Обычная') : s + '×'}</button>`
              ).join('') +
            '</div>' +
          '</div>' +
          button('full', translate('Полный экран'), ICONS.enter) +
        '</div>' +
      '</div>'
    );

    const el = (sel) => root.querySelector(sel);
    const posterPlay = el('.bhp-poster-play');
    const spinner = el('.bhp-spinner');
    const track = el('.bhp-track');
    const buffer = el('.bhp-track__buffer');
    const played = el('.bhp-track__played');
    const knob = el('.bhp-track__knob');
    const tip = el('.bhp-track__tip');
    const playBtn = el('[data-action="play"]');
    const muteBtn = el('[data-action="mute"]');
    const fullBtn = el('[data-action="full"]');
    const speedBtn = el('[data-action="speed"]');
    const menu = el('.bhp-menu');
    const slider = el('.bhp-volume__slider');
    const current = el('.bhp-time b');
    const total = el('.bhp-time i');

    let loaded = false;
    let scrubbing = false;
    let hideTimer = 0;

    const showFallback = () => {
      const panel = document.createElement('div');
      panel.className = 'pd-video-fallback';
      panel.innerHTML =
        '<p class="pd-video-fallback__title">Видео не загрузилось</p>' +
        '<p class="pd-video-fallback__hint">Файл ещё не опубликован или заблокирован сетью.</p>' +
        (fallbackUrl
          ? '<a class="btn btn-brass" href="' + fallbackUrl + '" target="_blank" rel="noopener noreferrer">Смотреть на YouTube</a>'
          : '');
      root.replaceChildren(panel);
      if (window.BH_I18N && window.BH_I18N.apply) window.BH_I18N.apply(panel);
    };

    const showControls = () => {
      root.classList.add('is-active');
      window.clearTimeout(hideTimer);
      if (!video.paused) hideTimer = window.setTimeout(() => root.classList.remove('is-active'), 2600);
    };

    const paint = () => {
      const duration = video.duration;
      const ratio = Number.isFinite(duration) && duration > 0 ? video.currentTime / duration : 0;
      const percent = Math.min(100, Math.max(0, ratio * 100));
      played.style.width = percent + '%';
      knob.style.left = percent + '%';
      track.setAttribute('aria-valuenow', Math.round(percent));
      track.setAttribute('aria-valuetext', formatTime(video.currentTime));
      current.textContent = formatTime(video.currentTime);
      total.textContent = formatTime(duration);
      if (video.buffered.length && Number.isFinite(duration) && duration > 0) {
        buffer.style.width = Math.min(100, (video.buffered.end(video.buffered.length - 1) / duration) * 100) + '%';
      }
    };

    const setPlayIcon = () => {
      const markup = video.paused ? ICONS.play : ICONS.pause;
      playBtn.innerHTML = markup;
      playBtn.setAttribute('aria-label', translate(video.paused ? 'Воспроизвести' : 'Пауза'));
      root.classList.toggle('is-playing', !video.paused);
    };

    const setVolumeIcon = () => {
      const off = video.muted || video.volume === 0;
      muteBtn.innerHTML = off ? ICONS.muted : ICONS.volume;
      muteBtn.setAttribute('aria-label', translate(off ? 'Включить звук' : 'Выключить звук'));
      slider.value = off ? 0 : video.volume;
    };

    /** First press loads the file and jumps past the title card. */
    const start = () => {
      if (loaded) {
        video.play().catch(() => {});
        return;
      }
      loaded = true;
      spinner.hidden = false;
      root.classList.add('is-started');
      video.addEventListener('loadedmetadata', () => {
        if (startAt > 0 && startAt < video.duration) video.currentTime = startAt;
        video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', showFallback, { once: true });
      video.src = source;
      video.load();
    };

    const toggle = () => {
      if (!loaded) { start(); return; }
      if (video.paused) video.play().catch(() => {}); else video.pause();
    };

    const seekTo = (clientX) => {
      const box = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      if (Number.isFinite(video.duration)) video.currentTime = ratio * video.duration;
      paint();
    };

    const nudge = (delta) => {
      if (!Number.isFinite(video.duration)) return;
      video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + delta));
      showControls();
    };

    posterPlay.addEventListener('click', start);
    playBtn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('dblclick', () => fullBtn.click());
    video.addEventListener('play', () => { setPlayIcon(); showControls(); });
    video.addEventListener('pause', () => { setPlayIcon(); showControls(); });
    video.addEventListener('timeupdate', paint);
    video.addEventListener('progress', paint);
    video.addEventListener('durationchange', paint);
    video.addEventListener('waiting', () => { spinner.hidden = false; });
    video.addEventListener('playing', () => { spinner.hidden = true; });
    video.addEventListener('canplay', () => { spinner.hidden = true; });
    video.addEventListener('ended', () => { root.classList.remove('is-playing'); root.classList.add('is-active'); });
    video.addEventListener('volumechange', setVolumeIcon);

    track.addEventListener('pointerdown', (e) => {
      scrubbing = true;
      track.setPointerCapture(e.pointerId);
      seekTo(e.clientX);
    });
    track.addEventListener('pointermove', (e) => {
      const box = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
      if (Number.isFinite(video.duration)) {
        tip.hidden = false;
        tip.textContent = formatTime(ratio * video.duration);
        tip.style.left = ratio * 100 + '%';
      }
      if (scrubbing) seekTo(e.clientX);
    });
    track.addEventListener('pointerleave', () => { tip.hidden = true; });
    track.addEventListener('pointerup', (e) => {
      scrubbing = false;
      try { track.releasePointerCapture(e.pointerId); } catch {}
    });

    muteBtn.addEventListener('click', () => { video.muted = !video.muted; });
    slider.addEventListener('input', () => {
      video.volume = Number(slider.value);
      video.muted = video.volume === 0;
    });

    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-speed]');
      if (!item) return;
      video.playbackRate = Number(item.dataset.speed);
      menu.querySelectorAll('.bhp-menu__item').forEach((b) => b.classList.toggle('is-active', b === item));
      menu.hidden = true;
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !root.contains(e.target)) menu.hidden = true;
    });

    fullBtn.addEventListener('click', () => {
      if (document.fullscreenElement === root) document.exitFullscreen?.();
      else root.requestFullscreen?.().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === root;
      root.classList.toggle('is-full', on);
      fullBtn.innerHTML = on ? ICONS.exit : ICONS.enter;
      fullBtn.setAttribute('aria-label', translate(on ? 'Выйти из полного экрана' : 'Полный экран'));
    });

    root.addEventListener('pointermove', showControls);
    root.addEventListener('pointerleave', () => {
      if (!video.paused) root.classList.remove('is-active');
    });

    // Scoped to the player so the modal keeps its own Escape and arrow keys.
    root.addEventListener('keydown', (e) => {
      const keys = [' ', 'k', 'K', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'j', 'J', 'l', 'L', 'm', 'M', 'f', 'F'];
      if (!keys.includes(e.key)) return;
      if (e.target.matches('input,[data-speed]')) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === ' ' || e.key.toLowerCase() === 'k') toggle();
      else if (e.key === 'ArrowLeft') nudge(-5);
      else if (e.key === 'ArrowRight') nudge(5);
      else if (e.key.toLowerCase() === 'j') nudge(-10);
      else if (e.key.toLowerCase() === 'l') nudge(10);
      else if (e.key === 'ArrowUp') { video.muted = false; video.volume = Math.min(1, video.volume + 0.1); showControls(); }
      else if (e.key === 'ArrowDown') { video.volume = Math.max(0, video.volume - 0.1); showControls(); }
      else if (e.key.toLowerCase() === 'm') video.muted = !video.muted;
      else if (e.key.toLowerCase() === 'f') fullBtn.click();
    });

    if (title) video.setAttribute('title', title);
    setPlayIcon();
    setVolumeIcon();
    paint();
  };

  /* `.project-detail` is a hidden template that the modal clones. Building a
     player there would ship controls without their listeners into the clone,
     so those are left alone and initialised once they reach the dialog. */
  const init = (scope) => {
    (scope || document).querySelectorAll('.bhp-player').forEach((player) => {
      if (player.closest('.project-detail')) return;
      build(player);
    });
  };

  const stopAll = (scope) => {
    (scope || document).querySelectorAll('.bhp-player video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
  };

  window.BH_PLAYER = { init, stopAll };
  document.addEventListener('DOMContentLoaded', () => init(document));
})();
