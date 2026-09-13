(function () {
  'use strict';

  var filterBar = document.querySelector('.filter-bar');
  var catalogCards = document.querySelectorAll('[data-niche]');
  var faqItems = document.querySelectorAll('.faq-item');
  var sobekButtons = document.querySelectorAll('.btn-sobek');

  function setActiveFilter(tag) {
    var buttons = filterBar ? filterBar.querySelectorAll('.filter-tag') : [];
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.textContent.trim() === tag);
    });
  }

  function filterCards(niche) {
    catalogCards.forEach(function (card) {
      if (niche === 'All' || card.getAttribute('data-niche') === niche) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var tag = e.target.closest('.filter-tag');
      if (!tag) return;
      var niche = tag.textContent.trim();
      setActiveFilter(niche);
      filterCards(niche);
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