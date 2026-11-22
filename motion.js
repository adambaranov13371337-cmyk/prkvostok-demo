const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let wheelFrame = 0, activeSurface = null, destination = 0, previousTime = 0;
function stopWheel() {
  cancelAnimationFrame(wheelFrame);
  wheelFrame = 0;
  activeSurface = null;
}
function position(surface) {
  return surface === window ? scrollY : surface.scrollLeft;
}
function advance(time) {
  const surface = activeSurface;
  if (!surface) return;
  const current = position(surface);
  const fraction = 1 - Math.exp(-Math.min(50,time - previousTime) / 77);
  previousTime = time;
  const remaining = destination - current;
  const step = Math.abs(remaining) < 1.5 ? remaining : Math.sign(remaining) * Math.max(1, Math.abs(remaining) * fraction);
  if (surface === window) window.scrollTo({top:current + step,behavior:'instant'});
  else surface.scrollTo({left:current + step,behavior:'instant'});
  if (Math.abs(destination - position(surface)) <= 1) stopWheel();
  else wheelFrame = requestAnimationFrame(advance);
}
addEventListener('wheel', event => {
  if (reduced.matches || event.ctrlKey || event.defaultPrevented || !event.cancelable || event.target.closest('dialog,textarea,select,[data-native]')) return;
  let surface = event.target.closest('[data-rail]');
  let delta = surface && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta || (!surface && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(delta)))) return;
  delta *= event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? innerHeight : 1;
  if (surface) {
    const end = surface.scrollWidth - surface.clientWidth;
    const pos = position(surface);
    if (end < 2 || (delta < 0 && pos <= 1) || (delta > 0 && pos >= end - 1)) {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {stopWheel(); return;}
      surface = null;
    }
  }
  surface ||= window;
  if (activeSurface !== surface) {stopWheel(); activeSurface = surface; destination = position(surface);}
  const end = surface === window ? document.documentElement.scrollHeight - innerHeight : surface.scrollWidth - surface.clientWidth;
  destination = clamp(destination + delta, 0, end);
  event.preventDefault();
  if (!wheelFrame) {previousTime = performance.now(); wheelFrame = requestAnimationFrame(advance);}
},{passive:false});
for (const name of ['pointerdown','keydown','touchstart','resize','hashchange']) addEventListener(name, stopWheel, {passive:true});
const tracks = [...document.querySelectorAll('[data-rail]')];
tracks.forEach(track => track.addEventListener('keydown', e => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  e.preventDefault();
  const amount=track.children[0].getBoundingClientRect().width+16;
  const left=e.key==='Home'?0:e.key==='End'?track.scrollWidth:track.scrollLeft+(e.key==='ArrowRight'?amount:-amount);
  track.scrollTo({left,behavior:reduced.matches?'instant':'smooth'});
}));
const panels = [...document.querySelectorAll('[data-scenes]')];
function updatePanels(){
  for(const panel of panels) {
    const steps=[...panel.querySelectorAll('[data-step]')], pictures=[...panel.querySelectorAll('[data-picture]')];
    const visible=steps.filter(step=>step.getBoundingClientRect().top<=innerHeight*.53);
    const index=Math.max(0,visible.length-1);
    pictures.forEach((pic,i)=>pic.classList.toggle('current',i===index));
    steps.forEach((step,i)=>step.classList.toggle('current',i===index));
    const label=panel.querySelector('[data-picture-label]');
    if(label && steps[index])label.textContent=steps[index].dataset.step;
  }
}
let sceneQueued=false;
function queuePanels(){if(!sceneQueued){sceneQueued=true;requestAnimationFrame(()=>{sceneQueued=false;updatePanels()})}}
addEventListener('scroll',queuePanels,{passive:true});addEventListener('resize',queuePanels);updatePanels();
const menu=document.querySelector('[data-menu]');
if(menu){
  menu.addEventListener('click',e=>{if(e.target.closest('a'))menu.open=false;});
  document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false;});
  addEventListener('keydown',e=>{if(e.key==='Escape' && menu.open){menu.open=false;menu.querySelector('summary').focus();}});
}
