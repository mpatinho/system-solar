// Prepara un texto para leerlo en voz alta: unidades, símbolos y ordinales escritos como se dicen.
const ORD_M = ['', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];
const ORD_F = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];

export function toSpeech(text) {
  return String(text)
    // Separador de miles: 384.400 → 384400 (si no, algunas voces dicen «punto»)
    .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (n) => n.replaceAll('.', ''))
    // Ordinales: 3.º → tercero, 2.ª → segunda
    .replace(/\b(10|[1-9])\.?\s?º/g, (_, n) => ORD_M[Number(n)])
    .replace(/\b(10|[1-9])\.?\s?ª/g, (_, n) => ORD_F[Number(n)])
    // Unidades
    .replace(/\bkm\s?\/\s?h\b/g, 'kilómetros por hora')
    .replace(/\bkm\s?\/\s?s\b/g, 'kilómetros por segundo')
    .replace(/\bkm(²|2\b)/g, 'kilómetros cuadrados')
    .replace(/\bkm\b/g, 'kilómetros')
    .replace(/\s?[°º]\s?C\b/g, ' grados')
    .replace(/\s?°/g, ' grados')
    .replace(/\bUA\b/g, 'unidades astronómicas')
    .replace(/\baprox\./gi, 'aproximadamente')
    // Signos
    .replace(/(^|[\s(])[−-](?=\d)/g, '$1menos ')
    .replace(/\s?%/g, ' por ciento')
    .replace(/·/g, ',')
    .replace(/\s{2,}/g, ' ');
}
