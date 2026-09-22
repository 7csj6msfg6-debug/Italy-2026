(() => {
  // The Rome swap changes TRIP_DATA after app.js has already rendered the views.
  // Refresh the existing UI so the September 21/23 stops show on first load.
  if (typeof window.renderTrip === 'function') window.renderTrip();
  if (typeof window.renderHome === 'function') window.renderHome();
  if (typeof window.renderWallet === 'function') {
    Promise.resolve(window.renderWallet()).catch(error => console.error('Rome swap Wallet refresh failed', error));
  }
})();
