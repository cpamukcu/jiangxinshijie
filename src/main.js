import './styles/tokens.css';
import './styles/base.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/lightbox.css';
import './styles/pages.css';
import './styles/responsive.css';

import { initAssetFallbacks } from './js/assetFallback.js';
import { initNav } from './js/nav.js';
import { initHeroVideo } from './js/heroVideo.js';
import { initReveal } from './js/reveal.js';
import { initLightbox } from './js/lightbox.js';
import { initContactForm } from './js/contactForm.js';
import { initParallax } from './js/parallax.js';
import { initFilters } from './js/filters.js';

function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  initAssetFallbacks();
  initNav();
  initHeroVideo();
  initReveal();
  initLightbox();
  initContactForm();
  initParallax();
  initFilters();
  initYear();
});
