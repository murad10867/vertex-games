(() => {
  'use strict';
  if (location.hostname.endsWith('github.io') && location.protocol !== 'https:') {
    location.replace('https://' + location.host + location.pathname + location.search + location.hash);
    return;
  }
  try { if (window.opener) window.opener = null; } catch {}
})();