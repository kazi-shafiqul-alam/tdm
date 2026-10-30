(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const topbar = $('.topbar');
  addEventListener('scroll', () => topbar?.classList.toggle('scrolled', scrollY > 24), {passive:true});
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), {threshold:.12, rootMargin:'0px 0px -30px'});
  $$('.reveal').forEach(el => io.observe(el));
})();
