/* ==========================================================================
   Motion (GSAP + ScrollTrigger, loaded from cdnjs)

   Everything here is an enhancement. The page is complete without it:
   theme.js only hides animated elements while the "motion-pending" class is
   on <html>, and this file removes that class whether or not GSAP loaded.

   1. Word splitting (survives language switches)
   2. Hero entrance + scroll drift
   3. Headline and block reveals
   4. Intro words lighting up with scroll
   5. Counters
   6. Project chapters: clip reveal + inner parallax
   7. Cursor label over project images, preview on the work index
   8. Reduced motion, honoured live
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function release() {
    root.classList.remove('motion-pending');
  }

  function t(key, fallback) {
    return window.I18n ? window.I18n.t(key) : fallback;
  }

  if (!window.gsap || !window.ScrollTrigger || reduce.matches) {
    release();
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-on');

  var EASE = 'expo.out';

  /* 1. Word splitting ------------------------------------------------------ */
  /* Wraps every word in a mask + inner span. Text already inside a mask is
     skipped, so calling it twice is harmless. Real spaces stay between the
     words, so screen readers read the sentence normally. */
  function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (!node.parentNode.closest || !node.parentNode.closest('.sw__i')) nodes.push(node);
    }

    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        var outer = document.createElement('span');
        outer.className = 'sw';
        var inner = document.createElement('span');
        inner.className = 'sw__i';
        inner.textContent = part;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.parentNode.replaceChild(frag, node);
    });

    return el.querySelectorAll('.sw__i');
  }

  var splits = [];

  function armSplit(el, alreadyHandled) {
    var record = { el: el, done: !!alreadyHandled };
    var words = splitWords(el);
    el.style.opacity = '1';
    splits.push(record);
    if (alreadyHandled) return words;

    gsap.set(words, { yPercent: 118 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: function () {
        record.done = true;
        gsap.to(el.querySelectorAll('.sw__i'), {
          yPercent: 0,
          duration: 1.15,
          ease: EASE,
          stagger: 0.055
        });
      }
    });
    return words;
  }

  /* 2. Hero ---------------------------------------------------------------- */
  var hero = document.querySelector('.hero');
  var heroStatement = hero ? hero.querySelector('.hero__statement') : null;

  if (hero) {
    var name = hero.querySelector('.hero__name');
    var lines = hero.querySelectorAll('.hero__line');
    var portrait = hero.querySelector('.hero__portrait');
    var portraitImg = portrait ? portrait.querySelector('img') : null;
    var fadeIns = hero.querySelectorAll('.hero__meta, .hero__side, .hero__cue');

    lines.forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      text.split('').forEach(function (char) {
        var span = document.createElement('span');
        span.className = 'ch';
        span.textContent = char;
        line.appendChild(span);
      });
    });

    var chars = hero.querySelectorAll('.ch');
    var statementWords = heroStatement ? armSplit(heroStatement, true) : [];

    gsap.set(name, { opacity: 1 });
    gsap.set(chars, { yPercent: 108 });
    gsap.set(statementWords, { yPercent: 118 });
    gsap.set(fadeIns, { opacity: 0, y: 18 });
    if (portrait) {
      gsap.set(portrait, { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(portraitImg, { scale: 1.35 });
    }

    var intro = gsap.timeline({
      delay: 0.1,
      defaults: { ease: EASE },
      /* Drop the per-letter layers once settled: overlapping composited
         letters can show hairline seams at tight letter-spacing. */
      onComplete: function () { gsap.set(chars, { clearProps: 'transform,willChange' }); }
    });
    intro
      .to(chars, { yPercent: 0, duration: 1.35, stagger: 0.03 })
      .to(portrait, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }, 0.2)
      .to(portraitImg, { scale: 1, duration: 2 }, 0.2)
      .to(statementWords, { yPercent: 0, duration: 1.1, stagger: 0.045 }, 0.55)
      .to(fadeIns, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.75);

    /* As the visitor leaves the hero the two name lines drift apart and the
       portrait rises a little faster than the page. */
    var drift = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
    if (lines[0]) gsap.to(lines[0], { xPercent: -6, ease: 'none', scrollTrigger: drift });
    if (lines[1]) gsap.to(lines[1], { xPercent: 5, ease: 'none', scrollTrigger: drift });
    if (portrait) gsap.to(portrait, { yPercent: -14, ease: 'none', scrollTrigger: drift });
  }

  /* 3. Reveals ------------------------------------------------------------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    if (el === heroStatement) return;
    armSplit(el, false);
  });

  var reveals = gsap.utils.toArray('[data-reveal]').filter(function (el) {
    return !el.closest('.hero');
  });
  gsap.set(reveals, { opacity: 0, y: 36 });
  ScrollTrigger.batch(reveals, {
    start: 'top 92%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.09, overwrite: true });
    }
  });

  /* 4. Intro words light up with scroll ----------------------------------- */
  var scrubbers = [];
  document.querySelectorAll('[data-scrub-words]').forEach(function (el) {
    var tween = null;
    function build() {
      if (tween) {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
      }
      var words = splitWords(el);
      tween = gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: 0.5 }
      });
    }
    build();
    scrubbers.push(build);
  });

  /* 5. Counters ------------------------------------------------------------ */
  var counters = document.querySelectorAll('[data-count]');
  counters.forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var state = { v: 0 };
    el.textContent = '0+';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: function () {
        gsap.to(state, {
          v: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: function () { el.textContent = Math.round(state.v) + '+'; }
        });
      }
    });
  });

  /* 6. Project chapters ---------------------------------------------------- */
  gsap.utils.toArray('.case__frame').forEach(function (frame) {
    var img = frame.querySelector('img');
    gsap.fromTo(frame,
      { clipPath: 'inset(12% 9% 12% 9%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top 96%', end: 'top 50%', scrub: 0.8 }
      });
    if (img) {
      gsap.fromTo(img,
        { scale: 1.18 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'center 55%', scrub: true }
        });
    }
  });

  document.querySelectorAll('[data-parallax-frame] img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* 7. Cursor label + work index preview ---------------------------------- */
  if (finePointer.matches) {
    var targets = document.querySelectorAll('[data-cursor]');
    if (targets.length) {
      var cursor = document.createElement('div');
      cursor.className = 'cursor';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.textContent = t('proj.cursor', 'View live');
      document.body.appendChild(cursor);

      var cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
      var cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
      window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });

      targets.forEach(function (target) {
        target.addEventListener('pointerenter', function () {
          gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.5, ease: EASE, overwrite: 'auto' });
        });
        target.addEventListener('pointerleave', function () {
          gsap.to(cursor, { scale: 0, opacity: 0, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        });
      });

      if (window.I18n) window.I18n.onChange(function () { cursor.textContent = t('proj.cursor', 'View live'); });
    }

    var box = document.querySelector('[data-preview-box]');
    var list = document.querySelector('[data-index]');
    var wide = window.matchMedia('(min-width: 56rem)');
    if (box && list && wide.matches) {
      list.classList.add('has-preview');
      var imgs = box.querySelectorAll('img');
      var px = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' });
      var py = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
      var lastX = 0;
      gsap.set(box, { x: window.innerWidth / 2, y: window.innerHeight / 2 });

      list.addEventListener('pointermove', function (e) {
        px(e.clientX);
        py(e.clientY);
        gsap.to(box, { rotation: gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.4), duration: 0.6, ease: 'power3', overwrite: 'auto' });
        lastX = e.clientX;
      }, { passive: true });

      list.querySelectorAll('[data-preview]').forEach(function (row) {
        row.addEventListener('pointerenter', function () {
          var index = parseInt(row.getAttribute('data-preview'), 10);
          imgs.forEach(function (img, i) { img.classList.toggle('is-on', i === index); });
          gsap.to(box, { opacity: 1, scale: 1, duration: 0.5, ease: EASE });
        });
      });
      list.addEventListener('pointerleave', function () {
        gsap.to(box, { opacity: 0, scale: 0.8, duration: 0.4, ease: 'power3.out' });
      });
    }
  }

  /* Language switches replace text, so re-split anything that has not been
     revealed yet, rebuild the scroll-lit paragraph, and remeasure. */
  if (window.I18n) {
    window.I18n.onChange(function () {
      splits.forEach(function (record) {
        if (record.done) return;
        gsap.set(splitWords(record.el), { yPercent: 118 });
      });
      scrubbers.forEach(function (build) { build(); });
      ScrollTrigger.refresh();
    });
  }

  /* Fonts change line lengths, so measure again once they arrive. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  release();

  /* 8. Reduced motion switched on mid-visit: stop every drive and pin every
     element to its finished state. */
  reduce.addEventListener('change', function (event) {
    if (!event.matches) return;
    ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
    gsap.globalTimeline.getChildren(true, true, true).forEach(function (anim) { anim.progress(1).kill(); });
    gsap.set('[data-reveal], [data-split], .sw__i, .ch, .hero__line, .hero__name, .hero__portrait, .hero__portrait img, .hero__meta, .hero__side, .hero__cue, .case__frame, .case__frame img, [data-parallax-frame] img', { clearProps: 'all' });
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count') + '+'; });
  });
})();
