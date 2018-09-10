/**
 * Register Service Worker
 */

(function() {
  if(!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => console.log(reg))
    .catch(err => console.log(err));
})();
