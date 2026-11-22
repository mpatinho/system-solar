// Fichas por proximidad: al entrar en la zona de un astro se abre su ficha; al salir, se cierra.
// Una ficha cerrada a mano (×, Esc o B) no vuelve a abrirse hasta salir de la zona de ese astro.
export function createProximityInfo(info) {
  let zoneId = null;
  return {
    reset() { zoneId = null; },
    // canShow: se puede abrir ahora (p. ej., sin ventanas delante). hidden: ocultarla (p. ej., durante preguntas).
    update(near, { canShow = true, hidden = false } = {}) {
      if (hidden) {
        if (info.currentId) info.hide();
        return;
      }
      if (near.inZone) {
        const e = near.entry;
        if (zoneId !== e.id) {
          zoneId = e.id;
          info.clearDismissed(e.id);
        }
        if (canShow && !info.isDismissed(e.id) && info.currentId !== e.id) info.show(e.body, { visited: true });
      } else if (zoneId) {
        zoneId = null;
        info.hide();
        info.clearDismissed();
      }
    },
  };
}
