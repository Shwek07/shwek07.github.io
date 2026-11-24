/* ==========================================================================
   "Five manual steps. One tap."

   The one interactive moment on the site. Holding the button collapses the
   old way of booking (five manual steps) into a single result. Progress
   builds while held and eases back down when released early; it never snaps.
   All drawing happens in CSS from one custom property, --p (0 to 1).

   Works with mouse, touch, keyboard (hold Space or Enter) and assistive tech
   (a plain activation completes it at once). Reduced motion completes it
   instantly too.
   ========================================================================== */

(function () {
  'use strict';

  var section = document.querySelector('[data-simplify]');
  if (!section) return;

  var button = section.querySelector('[data-hold]');
  var label = section.querySelector('[data-hold-label]');
  var status = section.querySelector('[data-hold-status]');
  var list = section.querySelector('[data-steps]');
  var steps = section.querySelectorAll('.step');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var FILL_SECONDS = 1.5;
  var DRAIN_SECONDS = 0.9;

  var progress = 0;
  var holding = false;
  var done = false;
  var frame = null;
  var last = 0;
  var lastKeyAt = 0;

  function t(key, fallback) {
    return window.I18n ? window.I18n.t(key) : fallback;
  }

  /* Each step learns how far it is from the centre of the list, so it can
     travel there as it collapses. offsetLeft/Top ignore transforms, so this
     is safe to call mid-animation. */
  function measure() {
    var w = list.offsetWidth;
    var h = list.offsetHeight;
    steps.forEach(function (step) {
      var x = step.offsetLeft + step.offsetWidth / 2;
      var y = step.offsetTop + step.offsetHeight / 2;
      step.style.setProperty('--tx', (w / 2 - x).toFixed(1) + 'px');
      step.style.setProperty('--ty', (h / 2 - y).toFixed(1) + 'px');
    });
  }

  function render() {
    section.style.setProperty('--p', progress.toFixed(4));
  }

  function setLabel() {
    label.textContent = done ? t('simplify.buttonDone', 'Show the old way again') : t('simplify.button', 'Hold to simplify');
  }

  function complete() {
    done = true;
    holding = false;
    progress = 1;
    render();
    button.classList.remove('is-holding');
    section.classList.add('is-done');
    setLabel();
    status.textContent = t('simplify.status', 'Five steps became one: booked.');
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (holding) {
      progress = Math.min(1, progress + dt / FILL_SECONDS);
    } else if (!done) {
      /* Ease out on the way down: faster when far along, gentle near zero. */
      progress = Math.max(0, progress - (dt / DRAIN_SECONDS) * (0.35 + progress));
    }
    render();

    if (holding && progress >= 1) {
      frame = null;
      complete();
      return;
    }

    var moving = holding || (!done && progress > 0);
    frame = moving ? window.requestAnimationFrame(loop) : null;
  }

  function kick() {
    if (frame !== null) return;
    last = performance.now();
    frame = window.requestAnimationFrame(loop);
  }

  function start() {
    if (done) return;
    if (reduce.matches) {
      complete();
      return;
    }
    holding = true;
    button.classList.add('is-holding');
    kick();
  }

  function stop() {
    if (!holding) return;
    holding = false;
    button.classList.remove('is-holding');
    kick();
  }

  function reset() {
    done = false;
    section.classList.remove('is-done');
    status.textContent = '';
    setLabel();
    if (reduce.matches) {
      progress = 0;
      render();
      return;
    }
    kick();
  }

  button.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    if (done) {
      reset();
      return;
    }
    try { button.setPointerCapture(event.pointerId); } catch (e) { /* not essential */ }
    start();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
    button.addEventListener(type, stop);
  });

  button.addEventListener('keydown', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    lastKeyAt = performance.now();
    if (event.repeat) return;
    if (done) {
      reset();
      return;
    }
    start();
  });
  button.addEventListener('keyup', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    lastKeyAt = performance.now();
    stop();
  });

  /* Screen readers and switch devices send a bare click with no press to
     hold. Give them the result straight away. */
  button.addEventListener('click', function (event) {
    if (event.detail !== 0) return;
    if (performance.now() - lastKeyAt < 400) return;
    if (done) reset();
    else complete();
  });

  button.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 120);
  });

  if (window.I18n) {
    window.I18n.onChange(function () {
      setLabel();
      if (done) status.textContent = t('simplify.status', 'Five steps became one: booked.');
      measure();
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
  render();
})();
