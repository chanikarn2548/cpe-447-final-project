(() => {
  const welcome = document.querySelector('#welcomeDialog');
  const key = 'tamnong-welcome-v1';
  function remember() { try { localStorage.setItem(key, 'seen'); } catch {} }
  function showWelcome() {
    if (!welcome.open && !dialog.open) welcome.showModal();
  }
  welcome.addEventListener('close', remember);
  welcome.addEventListener('click', event => {
    const button = event.target.closest('[data-welcome]');
    if (!button) { if (event.target === welcome) welcome.close(); return; }
    const action = button.dataset.welcome;
    welcome.close();
    remember();
    if (action === 'lost') lostForm();
    if (action === 'found') foundForm();
  });
  document.querySelectorAll('[data-show-welcome]').forEach(button => button.addEventListener('click', showWelcome));
  let seen = false;
  try { seen = localStorage.getItem(key) === 'seen'; } catch {}
  if (!seen) showWelcome();
})();
