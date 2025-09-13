// helper for queryselector and queryselectorall
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

const views = qsa('[data-view]');
const navLinks = qsa('[data-nav]');
// buttons that activate / hide / toggle modals
const modalSelector = '[data-action="open-modal"], [data-action]="close-modal"]';
// for getting current position id
let currentView = null;

/* ROUTER : #hash -> show view */
const show = (hash) => {
    // default to #home
    const id = (hash && hash.startsWith('#')) ? hash.slice(1) : 'home';
    const next = qs(`#${CSS.escape(id)}`);
    if (!next) return; // safety check

    // update scenes
    views.forEach(v => {
        const active = v === next; // if v is to be displayed, active = true;
        v.classList.toggle('is-active', active);
        v.setAttribute('aria-hidden', active ? 'false':'true');
    });
    currentView = next;

    // set current page's nav link to "active"
    navLinks.forEach(a => {
        const isCurrent = a.getAttribute('href') === `#${id}`;
        a.toggleAttribute('aria-current', isCurrent);
    });

    // trigger entrance animations
    animateIn(next);

    // focus 'focusable' elements first for accessibility
    const focusable = next.querySelector('a, button, input, textarea, select, [tabindex]:not([tabindx="-1"])');
    if (focusable) focusable.focus({preventScroll:true});

}

/* listen for #hash changes */
window.addEventListener('hashchange', () => show(location.hash));
window.addEventListener('DOMContentLoaded', () => {
    if(!location.hash) location.hash = '#home';
    show(location.hash);
    setupLazyImages();
    setupDelegation();
});

/* entrance animations */
const io = new IntersectionObserver(entries => {
    for (const e of entries) {
        if (e.isIntersecting) {
            const el = e.target;
            const delay = parseInt(el.dataset.delay || '0', 10);
            setTimeout(()=> el.classList.add('in'), delay);
            io.unobserve(el);
        }
    } 
}, { threshold: 0.2 });

const animateIn = (scope=document) => {
    qsa('[data-animate]', scope).forEach(el => io.observe(el));
}

// lazy images : display images efficiently dynamically
const setupLazyImages = () => {
    const imgs = qsa('img.lazy');
    const iol = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (e.isIntersecting) {
                const img = e.target;
                const src = img.getAttribute('data-src');
                if(src) { 
                    img.src = src; 
                    img.removeAttribute('data-src'); 
                }
                img.classList.remove('lazy');
                iol.unobserve(img);
            }
        }
    }, { rootMargin: '200px' });
    imgs.forEach(img => iol.observe(img));
}

// modals
let lastFocused = null;

const openModal = (sel) => {
    const modal = qs(sel);
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.documentElement.style.overflow = 'hidden';

    // focus dialog
    const dialog = qs('.modal__dialog', modal);
    dialog?.focus();

    // focus trap - so that focus stays inside modal
    const trap = (e) => {
        if(!modal.classList.contains('is-open')) return;
        if (e.key === 'Tab') {
            const f = qsa('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])', dialog)
                        .filter(el => !el.hasAttribute('disabled'));
            if(!f.length) return;
            const first = f[0], last = f[f.length-1];
            if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
            else if(!e.shiftKey && document.activeElement === last) {first.focus(); e.preventDefault(); }
        }   
        if (e.key === 'Escape') { closeModal(modal); }
    }
    modal._trap = trap;
    window.addEventListener('keydown', trap);
}

const closeModal = target => {
    const modal = typeof target === 'string' ? qs(target) : target.closest('.modal') || target;
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    window.removeEventListener('keydown', modal._trap);
    lastFocused?.focus();
}

// event delegations
const setupDelegation = () => {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const action = btn.dataset.action;

    if(action === 'open-modal'){
      const sel = btn.dataset.target || '#modal-demo';
      openModal(sel);
    }
    if(action === 'close-modal'){
      closeModal(btn);
    }
    if(action === 'toggle'){
      const sel = btn.dataset.target;
      if(sel){
        const el = qs(sel);
        if(el) el.hidden = !el.hidden;
      }
    }
  });

  // close when clicking modal backdrop
  qsa('.modal__backdrop').forEach(b => b.addEventListener('click', () => closeModal(b)));
}

/* Keyboard navigation between section- */
window.addEventListener('keydown', (e)=>{
  if(e.target.closest('input, textarea')) return;
  if(!['ArrowLeft','ArrowRight'].includes(e.key)) return;
  const ids = views.map(v => v.id);
  const i = ids.indexOf(currentView?.id);
  if(i < 0) return;
  if(e.key === 'ArrowRight' && i < ids.length - 1) location.hash = `#${ids[i+1]}`;
  if(e.key === 'ArrowLeft'  && i > 0)             location.hash = `#${ids[i-1]}`;
});

