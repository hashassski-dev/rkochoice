(() => {
  const KEY = 'rko-puls-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = new Set(['system','light','dark']);
  const saved = localStorage.getItem(KEY);
  let mode = valid.has(saved) ? saved : 'system';

  const resolve = () => mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
  const apply = () => {
    document.documentElement.dataset.theme = resolve();
    document.documentElement.dataset.themeMode = mode;
    document.querySelectorAll('[data-theme-select]').forEach(el => { el.value = mode; });
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      el.textContent = mode === 'system' ? 'Система' : mode === 'dark' ? 'Темная' : 'Светлая';
    });
  };

  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-select]').forEach(el => {
      el.addEventListener('change', () => {
        mode = valid.has(el.value) ? el.value : 'system';
        localStorage.setItem(KEY, mode);
        apply();
      });
    });
  });
  media.addEventListener?.('change', () => { if (mode === 'system') apply(); });
})();
