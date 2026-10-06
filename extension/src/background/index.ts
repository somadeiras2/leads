// GRUPOLEADS — Background Service Worker Manifest V3
console.log('[GRUPOLEADS] Service Worker ativo.');

if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[GRUPOLEADS] Extensão instalada com sucesso.');
  });
}
