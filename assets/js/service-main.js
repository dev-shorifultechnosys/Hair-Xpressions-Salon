(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  // Sticky header state
  const updateHeader = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Mobile menu
  const closeMenu = () => {
    body.classList.remove('nav-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = body.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  document.querySelectorAll('.mobile-services-item details').forEach((details) => {
    details.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => details.removeAttribute('open'));
    });
  });

  // Active navigation link
  const page = body.dataset.page;
  if (page) {
    document.querySelectorAll(`[data-nav="${page}"]`).forEach((link) => {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    });
  }

  // Scroll reveal
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealItems.length) {
    const observer = new IntersectionObserver(
      (entries, revealObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }

  // Testimonial slider
  const slider = document.querySelector('[data-testimonial-slider]');
  if (slider) {
    const slides = Array.from(slider.querySelectorAll('.testimonial-slide'));
    const dots = Array.from(slider.querySelectorAll('.slider-dot'));
    const prev = slider.querySelector('[data-slider-prev]');
    const next = slider.querySelector('[data-slider-next]');
    let activeIndex = 0;
    let intervalId;

    const showSlide = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle('active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });
      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    };

    const stopAutoPlay = () => window.clearInterval(intervalId);
    const startAutoPlay = () => {
      stopAutoPlay();
      intervalId = window.setInterval(() => showSlide(activeIndex + 1), 6500);
    };

    prev?.addEventListener('click', () => {
      showSlide(activeIndex - 1);
      startAutoPlay();
    });

    next?.addEventListener('click', () => {
      showSlide(activeIndex + 1);
      startAutoPlay();
    });

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener('click', () => {
        showSlide(dotIndex);
        startAutoPlay();
      });
    });

    slider.addEventListener('mouseenter', stopAutoPlay);
    slider.addEventListener('mouseleave', startAutoPlay);
    slider.addEventListener('focusin', stopAutoPlay);
    slider.addEventListener('focusout', startAutoPlay);

    showSlide(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startAutoPlay();
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-question');
    if (!button) return;
    button.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // Gallery lightbox
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lightboxImage = lightbox.querySelector('img');
    const closeButton = lightbox.querySelector('.lightbox-close');
    let previousFocus = null;

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
      previousFocus?.focus();
    };

    document.querySelectorAll('[data-lightbox-src]').forEach((item) => {
      item.addEventListener('click', () => {
        if (!lightboxImage) return;
        previousFocus = item;
        lightboxImage.src = item.dataset.lightboxSrc || '';
        lightboxImage.alt = item.dataset.lightboxAlt || 'Salon inspiration image';
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        body.style.overflow = 'hidden';
        closeButton?.focus();
      });
    });

    closeButton?.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }

  // Static form helper: validates and opens a prefilled email.
  document.querySelectorAll('[data-email-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');

      if (!form.checkValidity()) {
        form.reportValidity();
        if (status) {
          status.textContent = 'Please complete all required fields.';
          status.className = 'form-status show error';
        }
        return;
      }

      const data = new FormData(form);
      const destination = form.dataset.recipient || 'Angietron123@gmail.com';
      const formType = form.dataset.formType || 'Website enquiry';
      const name = data.get('name') || data.get('firstName') || 'Website visitor';
      const subject = `${formType} — ${name}`;
      const lines = [];

      data.forEach((value, key) => {
        if (String(value).trim()) {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
          lines.push(`${label}: ${value}`);
        }
      });

      const mailto = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;

      if (status) {
        status.textContent = 'Your email app is opening with the request prefilled. You can also call 702-733-0229.';
        status.className = 'form-status show success';
      }
      window.location.href = mailto;
    });
  });

  // Preselect a booking service from links such as book.html?service=Hair%20Extensions.
  const serviceFromUrl = new URLSearchParams(window.location.search).get('service');
  const serviceSelect = document.querySelector('#book-service');
  if (serviceFromUrl && serviceSelect) {
    const matchingOption = Array.from(serviceSelect.options).find(
      (option) => option.value.toLowerCase() === serviceFromUrl.toLowerCase()
    );
    if (matchingOption) serviceSelect.value = matchingOption.value;
  }

  // Keep date field from accepting past dates.
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
    input.min = localDate;
  });

  // Footer year
  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();


// Homepage hero slider and counters
(() => {
  const heroSlider = document.querySelector('.hero-slider');
  if (heroSlider) {
    const slides = Array.from(heroSlider.querySelectorAll('.hero-slide'));
    const heroSection = heroSlider.closest('.hero-luxury');
    const dots = heroSection ? Array.from(heroSection.querySelectorAll('.hero-nav-dot')) : [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = 0;
    let heroTimer;

    const activateHeroSlide = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('active', slideIndex === current);
      });
      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === current;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    };

    const stopHeroAutoplay = () => {
      window.clearInterval(heroTimer);
      heroTimer = undefined;
    };

    const startHeroAutoplay = () => {
      stopHeroAutoplay();
      if (reducedMotion || document.hidden || slides.length < 2) return;
      heroTimer = window.setInterval(() => activateHeroSlide(current + 1), 5200);
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        activateHeroSlide(Number(dot.dataset.heroIndex || 0));
        startHeroAutoplay();
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopHeroAutoplay();
      else startHeroAutoplay();
    });

    activateHeroSlide(0);
    startHeroAutoplay();
  }

  const counters = document.querySelectorAll('[data-counter-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animateCounter = (counter) => {
      const target = Number(counter.dataset.counterTarget || 0);
      const suffix = counter.dataset.counterSuffix || '';
      const duration = 1400;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        counter.textContent = String(value) + (progress === 1 ? suffix : '');
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        } else {
          counter.textContent = String(target) + suffix;
        }
      };

      window.requestAnimationFrame(tick);
    };

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });

    counters.forEach((counter) => counterObserver.observe(counter));
  }
})();

/*
 * Services overview hero slider
 * --------------------------------------------------------------------------
 * Cross-fades six locally hosted salon images with continuous cinematic motion.
 * Pointer/focus hover does not pause autoplay; only reduced-motion preferences
 * and a hidden browser tab suppress automatic changes.
 */
(() => {
  const hero = document.querySelector('[data-services-hero]');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('.services-hero-slide'));
  const controls = Array.from(hero.querySelectorAll('[data-service-hero-index]'));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex = 0;
  let timerId;

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('active', slideIndex === activeIndex);
    });

    controls.forEach((control, controlIndex) => {
      const isActive = controlIndex === activeIndex;
      control.classList.toggle('active', isActive);
      control.setAttribute('aria-selected', String(isActive));
    });
  };

  const stopAutoplay = () => window.clearInterval(timerId);
  const startAutoplay = () => {
    stopAutoplay();
    if (prefersReducedMotion || slides.length < 2) return;
    timerId = window.setInterval(() => showSlide(activeIndex + 1), 5600);
  };

  controls.forEach((control) => {
    control.addEventListener('click', () => {
      showSlide(Number(control.dataset.serviceHeroIndex || 0));
      startAutoplay();
    });
  });

  // Deliberately do not pause on hover/focus: the approved Services hero is
  // designed to keep moving through all six images continuously.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  showSlide(0);
  startAutoplay();
})();
