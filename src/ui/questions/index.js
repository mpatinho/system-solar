import { renderChoice } from './choice.js';
import { renderTrueFalse } from './trueFalse.js';
import { renderOrder } from './order.js';
import { renderMatch } from './match.js';
import { renderBlanks } from './blanks.js';
import { renderClassify } from './classify.js';
import { renderIdentify } from './identify.js';

export { questionTitle } from './choice.js';

export const RENDERERS = {
  test: renderChoice,
  definicion: renderChoice,
  vf: renderTrueFalse,
  ordenar: renderOrder,
  unir: renderMatch,
  huecos: renderBlanks,
  clasificar: renderClassify,
  identificar: renderIdentify,
};
