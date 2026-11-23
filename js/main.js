/* Small, dependency-free interactions; no jQuery/Bootstrap needed. */
(() => {
  'use strict';

  // All seven projects and their full descriptions are visible by default.
  // No JavaScript is required to reveal portfolio content.

  const root = document.documentElement;
  const year = document.getElementById('copyright-year');
  if (year) year.textContent = String(new Date().getFullYear());
  const themeButton = document.getElementById('theme-toggle');
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('site-navigation');
  const navLinks = navigation.querySelectorAll('a');
  const mobileQuery = window.matchMedia('(max-width: 960px)');
  const header = document.querySelector('.site-header');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateThemeButton() {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const label = `Switch to ${nextTheme} mode`;
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
    document.querySelector('meta[name="theme-color"]').content =
      root.dataset.theme === 'dark' ? '#202020' : '#eaf0f5';
  }

  themeButton.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    try { localStorage.setItem('calapps-theme', nextTheme); } catch (_) { /* optional */ }
    updateThemeButton();
  });
  updateThemeButton();

  function setMenuOpen(isOpen) {
    navigation.classList.toggle('is-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  }

  menuButton.addEventListener('click', () => {
    setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  /**
   * Smooth, time-limited section navigation.
   * Keep the heading 16px below the sticky header, regardless of screen size.
   * A custom duration (340–680ms) keeps long jumps from feeling sluggish.
   */
  let scrollAnimation = null;

  function stopScrollAnimation() {
    if (scrollAnimation !== null) {
      window.cancelAnimationFrame(scrollAnimation);
      scrollAnimation = null;
    }
  }

  // Respect users who prefer less motion, and let manual scrolling take over.
  ['wheel', 'touchstart'].forEach((type) => {
    window.addEventListener(type, stopScrollAnimation, { passive: true });
  });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      stopScrollAnimation();
    }
  });

  function jumpToSection(hash, addHistory = false, animate = true) {
    if (!hash || hash === '#') return;
    const id = decodeURIComponent(hash.slice(1));
    const section = document.getElementById(id);
    if (!section) return;

    let targetY = 0;
    if (id !== 'home' && id !== 'main') {
      const heading = section.querySelector('.section-heading') ||
        (id === 'contact' ? section.querySelector('h2') : null) || section;
      const headerHeight = header.getBoundingClientRect().height;
      targetY = Math.round(heading.getBoundingClientRect().top + window.scrollY - headerHeight - 16);
    }
    // Browsers cannot scroll past the bottom of the document.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetY = Math.max(0, Math.min(targetY, maxScroll));

    if (addHistory && location.hash !== hash) {
      history.pushState(null, '', hash);
    }

    stopScrollAnimation();
    const startY = window.scrollY;
    const distance = targetY - startY;
    const reducedMotion = reducedMotionQuery.matches;
    if (!animate || reducedMotion || Math.abs(distance) < 2) {
      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      return;
    }

    // Constant upper bound means clicking Home from Contact won't take seconds.
    const duration = Math.min(680, Math.max(340, 260 + Math.abs(distance) * 0.07));
    let startTime = null;
    function frame(timestamp) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo({ top: startY + distance * ease, left: 0, behavior: 'instant' });
      if (progress < 1) {
        scrollAnimation = window.requestAnimationFrame(frame);
      } else {
        scrollAnimation = null;
      }
    }
    scrollAnimation = window.requestAnimationFrame(frame);
  }

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    if (hash && hash.startsWith('#')) {
      event.preventDefault();
      setMenuOpen(false);
      jumpToSection(hash, true);
    }
  }));

  // The brand and accessibility skip link should behave the same way.
  document.querySelectorAll('.site-brand, .skip-link, .contact__back-to-top, .experience__education-link, .hero__actions a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || !hash.startsWith('#')) return;
      event.preventDefault();
      setMenuOpen(false);
      jumpToSection(hash, true);
    });
  });

  // Highlight the section currently in view without altering the scroll animation.
  const sectionLinks = Array.from(navigation.querySelectorAll('.site-nav__link[href^="#"]'));
  const sectionTargets = sectionLinks
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);
  let updatePending = false;
  function updateActiveSection() {
    // A thin accent line shows reading progress, without cluttering the page.
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--page-progress', String(Math.min(1, Math.max(0, window.scrollY / maxScroll))));
    const position = window.scrollY + header.offsetHeight + 48;
    let active = 'home';
    sectionTargets.forEach(({ link, section }) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      if (position >= top) active = section.id;
    });
    sectionTargets.forEach(({ link, section }) => {
      const selected = section.id === active;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    updatePending = false;
  }
  window.addEventListener('scroll', () => {
    if (!updatePending) {
      updatePending = true;
      window.requestAnimationFrame(updateActiveSection);
    }
  }, { passive: true });
  updateActiveSection();
  window.addEventListener('resize', () => {
    if (!updatePending) {
      updatePending = true;
      window.requestAnimationFrame(updateActiveSection);
    }
  }, { passive: true });

  // Also support direct section links and the browser's Back/Forward buttons.
  window.addEventListener('popstate', () => jumpToSection(location.hash || '#home', false, false));
  window.addEventListener('hashchange', () => jumpToSection(location.hash || '#home', false, false));
  window.addEventListener('load', () => {
    if (location.hash) jumpToSection(location.hash, false, false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !menuButton.contains(event.target)) {
      setMenuOpen(false);
    }
  });
  mobileQuery.addEventListener('change', () => setMenuOpen(false));

  // Reveal headings and cards only when they enter view. These effects never
  // hide content if JavaScript is disabled or reduced motion is requested.
  if ('IntersectionObserver' in window && !reducedMotionQuery.matches) {
    const revealSelector = [
      '.hero__portrait-wrap', '.hero__copy',
      '.section-heading h2', '.section-heading__intro',
      '.about__sidebar', '.about__copy-card',
      '.experience__card', '.experience__education', '.project',
      '.contact__intro', '.contact__email-card', '.contact__elsewhere'
    ].join(', ');
    const revealItems = Array.from(document.querySelectorAll(revealSelector));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.04, rootMargin: '0px 0px -7% 0px' });

    for (const element of revealItems) {
      element.setAttribute('data-reveal', '');
      // Don't flash or slide content already on screen at page load.
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight * .94 && bounds.bottom > 0) {
        element.classList.add('is-visible');
      } else {
        revealObserver.observe(element);
      }
    }
    root.classList.add('motion-ready');
    reducedMotionQuery.addEventListener('change', (event) => {
      if (event.matches) {
        root.classList.remove('motion-ready');
        revealObserver.disconnect();
        for (const element of revealItems) element.classList.add('is-visible');
        stopScrollAnimation();
      }
    });
  }
})();
