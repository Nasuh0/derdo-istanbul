(() => {
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  const clock = q('#clock');
  const date = q('#local-date');
  const tick = () => {
    const now = new Date();
    if (clock) clock.textContent = now.toLocaleTimeString('tr-TR', {hour12:false});
    if (date) date.textContent = now.toLocaleDateString('tr-TR');
  };
  tick();
  setInterval(tick, 1000);

  const typed = q('#typed');
  const words = ['connect --network derdo', 'status --node istanbul', 'join --anonymous'];
  let wi = 0, ci = 0, deleting = false;
  const typeLoop = () => {
    const word = words[wi];
    if (!deleting) {
      ci++;
      if (typed) typed.textContent = word.slice(0, ci);
      if (ci === word.length) {
        deleting = true;
        return setTimeout(typeLoop, 1400);
      }
      return setTimeout(typeLoop, 48);
    }
    ci--;
    if (typed) typed.textContent = word.slice(0, ci);
    if (ci === 0) {
      deleting = false;
      wi = (wi + 1) % words.length;
      return setTimeout(typeLoop, 350);
    }
    setTimeout(typeLoop, 24);
  };
  typeLoop();

  const modal = q('.search-modal');
  const input = q('#searchInput');
  const openSearch = () => {
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    setTimeout(() => input?.focus(), 10);
  };
  const closeSearch = () => {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    input?.blur();
  };

  q('.search-trigger')?.addEventListener('click', openSearch);
  modal?.addEventListener('click', e => { if (e.target === modal) closeSearch(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault(); openSearch();
    }
    if (e.key === 'Escape') closeSearch();
  });

  const toast = q('.toast');
  let toastTimer;
  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  qa('.js-toast').forEach(el => el.addEventListener('click', () => showToast(el.dataset.message || 'Yakında.')));

  const menu = q('.menu-btn');
  const nav = q('#nav');
  menu?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(Boolean(open)));
  });
  qa('#nav a').forEach(a => a.addEventListener('click', () => {
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }));

  const rows = qa('.forum-row');
  rows.forEach(row => row.addEventListener('click', () => showToast('Bu kanal için konu sayfası sonraki aşamada bağlanacak.')));
})();