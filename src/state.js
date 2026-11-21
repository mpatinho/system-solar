// Estado global compartido y bus de eventos sencillo.
export const state = {
  mode: 'menu', // 'menu' | 'explore' | 'adventure'
  modals: 0, // nº de ventanas que bloquean el pilotaje
  simTime: 0,
  autopilot: false,
};

export const inputBlocked = () => state.modals > 0;

const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => {
  const handler = (e) => fn(e.detail);
  bus.addEventListener(name, handler);
  return () => bus.removeEventListener(name, handler);
};
