(function () {
  'use strict';

  var filterBar = document.querySelector('.filter-bar');
  var catalogCards = document.querySelectorAll('[data-niche]');
  var faqItems = document.querySelectorAll('.faq-item');
  var sobekButtons = document.querySelectorAll('.btn-sobek');
  var moreProjectsBtn = document.getElementById('more-projects-btn');
  var moreProjectsLabel = document.getElementById('more-projects-btn-label');
  var moreProjects = document.getElementById('more-projects');

  function openMoreProjects() {
    if (!moreProjects || moreProjects.classList.contains('open')) return;
    moreProjects.classList.add('open');
    moreProjects.style.maxHeight = moreProjects.scrollHeight + 'px';
    if (moreProjectsBtn) moreProjectsBtn.setAttribute('aria-expanded', 'true');
    if (moreProjectsLabel) moreProjectsLabel.textContent = 'Show fewer projects';
  }

  function closeMoreProjects() {
    if (!moreProjects || !moreProjects.classList.contains('open')) return;
    // Set an explicit max-height first so the collapse transition has a
    // starting point to animate from, then let it shrink to 0 on the next frame.
    moreProjects.style.maxHeight = moreProjects.scrollHeight + 'px';
    requestAnimationFrame(function () {
      moreProjects.style.maxHeight = '0px';
    });
    moreProjects.classList.remove('open');
    if (moreProjectsBtn) moreProjectsBtn.setAttribute('aria-expanded', 'false');
    if (moreProjectsLabel) moreProjectsLabel.textContent = 'Show 10 more projects';
  }

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
      // Filtering by a specific niche should surface matching cards that live
      // in the collapsed "more projects" tray — otherwise the filter can look
      // like it returned nothing for niches with no featured card.
      if (niche !== 'All') openMoreProjects();
    });
  }

  if (moreProjectsBtn && moreProjects) {
    moreProjectsBtn.addEventListener('click', function () {
      if (moreProjects.classList.contains('open')) {
        closeMoreProjects();
        moreProjectsBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        openMoreProjects();
      }
    });
    // If the panel's own content reflows after images/fonts settle, keep an
    // open panel's max-height in sync instead of clipping newly-tall content.
    window.addEventListener('resize', function () {
      if (moreProjects.classList.contains('open')) {
        moreProjects.style.maxHeight = moreProjects.scrollHeight + 'px';
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
