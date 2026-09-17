(function () {
  'use strict';

  var filterBar = document.querySelector('.filter-bar');
  var catalogCards = document.querySelectorAll('[data-niche]');
  var faqItems = document.querySelectorAll('.faq-item');
  var sobekButtons = document.querySelectorAll('.btn-sobek');
  var moreProjectsBtn = document.getElementById('more-projects-btn');
  var moreProjectsLabel = document.getElementById('more-projects-btn-label');

  // All cards live in a single grid so filtered results reflow together
  // (e.g. 3-across-then-1) instead of splitting across a "featured" grid
  // and a separate "more projects" grid. The "more" cards (marked
  // .more-card) stay collapsed behind a toggle only while niche is "All";
  // picking a specific niche always reveals every match.
  var currentNiche = 'All';
  var moreExpanded = false;

  function updateCardVisibility() {
    catalogCards.forEach(function (card) {
      var nicheOk = currentNiche === 'All' || card.getAttribute('data-niche') === currentNiche;
      var isMoreCard = card.classList.contains('more-card');
      var moreOk = !isMoreCard || moreExpanded || currentNiche !== 'All';
      card.classList.toggle('hidden', !(nicheOk && moreOk));
    });
  }

  function setMoreExpanded(expanded) {
    moreExpanded = expanded;
    if (moreProjectsBtn) moreProjectsBtn.setAttribute('aria-expanded', String(expanded));
    if (moreProjectsLabel) moreProjectsLabel.textContent = expanded ? 'Show fewer projects' : 'Show 11 more projects';
    updateCardVisibility();
  }

  function setActiveFilter(tag) {
    var buttons = filterBar ? filterBar.querySelectorAll('.filter-tag') : [];
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.textContent.trim() === tag);
    });
  }

  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var tag = e.target.closest('.filter-tag');
      if (!tag) return;
      currentNiche = tag.textContent.trim();
      setActiveFilter(currentNiche);
      // Filtering by a specific niche should surface matching cards that live
      // in the collapsed "more projects" tray — otherwise the filter can look
      // like it returned nothing for niches with no featured card.
      if (currentNiche !== 'All' && !moreExpanded) {
        setMoreExpanded(true);
      } else {
        updateCardVisibility();
      }
    });
  }

  if (moreProjectsBtn) {
    moreProjectsBtn.addEventListener('click', function () {
      if (moreExpanded) {
        setMoreExpanded(false);
        moreProjectsBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setMoreExpanded(true);
      }
    });
  }

  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      faqItems.forEach(function (i) { i.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });

  sobekButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.classList.add('tearing');
      setTimeout(function () {
        btn.classList.remove('tearing');
      }, 400);
    });
  });

  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
