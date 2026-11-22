const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wheelSurface = { element: null, target: 0, frame: 0, lastTime: 0 };

function stopWheel() {
  cancelAnimationFrame(wheelSurface.frame);
  wheelSurface.element = null;
  wheelSurface.frame = 0;
}
function currentPosition(surface) {
  return surface === window ? window.scrollY : surface.scrollLeft;
}
function limit(surface) {
  return surface === window
    ? document.documentElement.scrollHeight - window.innerHeight
    : surface.scrollWidth - surface.clientWidth;
}
function stepWheel(time) {
  const state = wheelSurface;
  if (!state.element) return;
  const position = currentPosition(state.element);
  state.target = Math.max(0, Math.min(state.target, limit(state.element)));
  const remaining = state.target - position;
  const fraction = 1 - Math.exp(-Math.min(50, time - state.lastTime) / 78);
  state.lastTime = time;
  const step = Math.abs(remaining) < 1.5 ? remaining : Math.sign(remaining) * Math.max(1, Math.abs(remaining) * fraction);
  if (state.element === window) window.scrollTo({top: position + step, behavior: 'instant'});
  else state.element.scrollTo({left: position + step, behavior: 'instant'});
  if (Math.abs(state.target - currentPosition(state.element)) <= 1) stopWheel();
  else state.frame = requestAnimationFrame(stepWheel);
}
window.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey || !event.cancelable || event.defaultPrevented) return;
  if (event.target.closest('dialog,textarea,select,.table-wrap,.head details[open]')) return;
  const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  let rail = event.target.closest('[data-rail]');
  let delta = sideways ? event.deltaX : event.deltaY;
  if (!delta || (!rail && (sideways || event.shiftKey))) return;
  delta *= event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? (rail ? rail.clientWidth : innerHeight) : 1;
  if (rail) {
    const edge = limit(rail);
    if (edge < 2 || (delta < 0 && rail.scrollLeft <= 1) || (delta > 0 && rail.scrollLeft >= edge - 1)) {
      if (sideways || event.shiftKey) { stopWheel(); return; }
      rail = null;
    }
  }
  if (reducedMotion.matches) {
    if (rail && !sideways) {
      event.preventDefault();
      rail.scrollBy({left: delta, behavior: 'instant'});
    }
    return;
  }
  // Precision trackpads already provide smooth vertical scrolling and horizontal momentum.
  if ((!rail || sideways) && event.deltaMode === 0 && (sideways || Math.abs(delta) < 35)) {
    stopWheel();
    return;
  }
  const surface = rail || window;
  if (wheelSurface.element !== surface) {
    stopWheel();
    wheelSurface.element = surface;
    wheelSurface.target = currentPosition(surface);
  }
  event.preventDefault();
  wheelSurface.target = Math.max(0, Math.min(limit(surface), wheelSurface.target + delta));
  if (!wheelSurface.frame) {
    wheelSurface.lastTime = performance.now();
    wheelSurface.frame = requestAnimationFrame(stepWheel);
  }
}, {passive: false});

for (const name of ['pointerdown', 'keydown', 'touchstart', 'resize', 'hashchange']) {
  window.addEventListener(name, stopWheel, {passive: true});
}
reducedMotion.addEventListener('change', stopWheel);

for (const rail of document.querySelectorAll('[data-rail]')) {
  rail.addEventListener('keydown', event => {
    if (event.target !== rail || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const card = rail.firstElementChild;
    if (!card) return;
    const distance = card.offsetWidth + parseFloat(getComputedStyle(rail).columnGap);
    let next = rail.scrollLeft + (event.key === 'ArrowRight' ? distance : -distance);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = rail.scrollWidth;
    event.preventDefault();
    rail.scrollTo({left: next, behavior: 'instant'});
  });
}

const hero = document.querySelector('[data-hero]');
if (hero) {
  const switches = [...hero.querySelectorAll('.hero-choices button')];
  const photos = [...hero.querySelectorAll('.hero-shots img')];
  const caption = hero.querySelector('[data-caption-live]');
  function select(index) {
    photos.forEach((photo, i) => {
      photo.classList.toggle('active', i === index);
      photo.setAttribute('aria-hidden', String(i !== index));
    });
    switches.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    caption.textContent = switches[index].dataset.caption;
  }
  switches.forEach((switcher, i) => switcher.addEventListener('click', () => select(i)));
  let start = null;
  const stage = hero.querySelector('.hero-plate');
  stage.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? [event.touches[0].clientX, event.touches[0].clientY] : null;
  }, {passive:true});
  stage.addEventListener('touchcancel', () => {start = null;});
  stage.addEventListener('touchend', event => {
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start[0];
    const dy = event.changedTouches[0].clientY - start[1];
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const current = switches.findIndex(button => button.getAttribute('aria-pressed') === 'true');
      select((current + (dx > 0 ? -1 : 1) + switches.length) % switches.length);
    }
    start = null;
  }, {passive:true});
}

const scene = document.querySelector('[data-scenes]');
if (scene) {
  const steps = [...scene.querySelectorAll('[data-step]')];
  const images = [...scene.querySelectorAll('[data-picture]')];
  const label = scene.querySelector('[data-picture-label]');
  let current = -1;
  let frame = 0;
  let visible = true;
  function refreshScene() {
    frame = 0;
    if (!visible) return;
    const guide = window.innerHeight * (window.innerWidth <= 670 ? .61 : .50);
    let next = 0;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].getBoundingClientRect().top <= guide) next = i;
    }
    if (current === next) return;
    current = next;
    steps.forEach((step, i) => step.classList.toggle('current', i === next));
    images.forEach((image, i) => {
      image.classList.toggle('current', i === next);
      image.setAttribute('aria-hidden', String(i !== next));
    });
    label.textContent = steps[next].dataset.step;
  }
  function queueScene() {
    if (visible && !frame) frame = requestAnimationFrame(refreshScene);
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; queueScene(); }).observe(scene);
  window.addEventListener('scroll', queueScene, {passive:true});
  window.addEventListener('resize', queueScene);
  refreshScene();
}

const menu = document.querySelector('[data-menu]');
if (menu) {
  menu.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  document.addEventListener('focusin', event => { if (!menu.contains(event.target)) menu.open = false; });
}


const photoTrigger = document.querySelector('[data-photo]');
const photoDialog = document.querySelector('.photo-dialog');
if (photoTrigger && photoDialog) {
  const closeButton = photoDialog.querySelector('.dialog-close');
  photoTrigger.addEventListener('click', () => {
    const source = photoTrigger.querySelector('img');
    const enlarged = photoDialog.querySelector('[data-enlarged]');
    enlarged.src = source.currentSrc || source.src;
    enlarged.alt = source.alt;
    stopWheel();
    photoDialog.showModal();
  });
  closeButton.addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('click', event => {
    if (event.target !== photoDialog) return;
    const rect = photoDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      photoDialog.close();
    }
  });
  photoDialog.addEventListener('close', () => photoTrigger.focus({preventScroll:true}));
}
