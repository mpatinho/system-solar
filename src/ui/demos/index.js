// Catálogo de lecciones interactivas.
import { open as openMotions } from './earthMotions.js';
import { open as openLayers } from './earthLayers.js';
import { open as openPhases } from './moonPhases.js';
import { open as openEclipses } from './eclipses.js';
import { open as openSizes } from './sizeCompare.js';
import { open as openUniverse } from './universe.js';

export const LESSONS = {
  movimientos: { title: 'Movimientos de la Tierra', icon: '🌍', where: 'tierra', open: openMotions, desc: 'Rotación (día y noche), traslación, estaciones y años bisiestos.' },
  capas: { title: 'Capas de la Tierra', icon: '🧅', where: 'tierra', open: openLayers, desc: 'Atmósfera, hidrosfera, geosfera y biosfera.' },
  fases: { title: 'Fases de la Luna', icon: '🌓', where: 'luna', open: openPhases, desc: 'Mueve la Luna y mira cómo se ve desde la Tierra.' },
  eclipses: { title: 'Eclipses', icon: '🌑', where: 'luna', open: openEclipses, desc: 'Eclipse de Sol y eclipse de Luna.' },
  tamanos: { title: 'Tamaños y distancias', icon: '📏', where: 'sol', open: openSizes, desc: 'Los tamaños y las distancias reales del Sistema Solar.' },
  universo: { title: 'El Universo', icon: '🌌', where: 'voyager', open: openUniverse, desc: 'Galaxias, Vía Láctea, estrellas, constelaciones y año luz.' },
};

export function openLesson(id) {
  return LESSONS[id]?.open();
}
