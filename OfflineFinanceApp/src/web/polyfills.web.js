if (typeof window !== 'undefined') {
  window.global = window.global || window;
  window.process = window.process || {env: {}};
}

if (typeof globalThis !== 'undefined') {
  globalThis.global = globalThis.global || globalThis;
  globalThis.process = globalThis.process || {env: {}};
}

if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = callback => setTimeout(callback, 0);
}
