// Conceptos del tema (5.º de Primaria). Los usan la chuleta de estudio y las lecciones.

export const MNEMONIC = {
  phrase: 'Mi Vieja Tía Marta Jamás Supo Usar Nada',
  planets: ['Mercurio', 'Venus', 'Tierra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno'],
};

export const CONCEPT_GROUPS = [
  {
    id: 'universo',
    title: 'El Universo',
    lesson: 'universo',
    items: [
      { term: 'Universo', text: 'Es todo lo que existe: galaxias, estrellas, planetas, satélites, el espacio que hay entre ellos… Es inmenso y tiene unos 13.800 millones de años.' },
      { term: 'Galaxia', text: 'Grupo enorme de estrellas, gas y polvo. Las hay en espiral, elípticas e irregulares.' },
      { term: 'Vía Láctea', text: 'Nuestra galaxia. Tiene forma de espiral y miles de millones de estrellas. El Sistema Solar está en uno de sus brazos, lejos del centro. En noches muy oscuras se ve como una franja blanquecina en el cielo.' },
      { term: 'Estrella', text: 'Astro con luz propia: una enorme bola de gases muy calientes. Su color depende de su temperatura: las azules son las más calientes y las rojas, las menos. El Sol es la estrella más cercana.' },
      { term: 'Constelación', text: 'Grupo de estrellas que, vistas desde la Tierra, parecen formar una figura: la Osa Mayor, Orión, Casiopea… La Estrella Polar, en la Osa Menor, indica el norte.' },
      { term: 'Año luz', text: 'Es una medida de DISTANCIA, no de tiempo: lo que recorre la luz en un año (unos 9,5 billones de km). Se usa porque las distancias del Universo son enormes.' },
      { term: 'Exploración del espacio', text: 'Telescopios, sondas y astronautas nos ayudan a conocer el Universo. Yuri Gagarin fue la primera persona en el espacio (1961); Neil Armstrong, la primera en pisar la Luna (1969), y Pedro Duque, el primer astronauta español (1998).' },
    ],
  },
  {
    id: 'sistema',
    title: 'El Sistema Solar',
    lesson: 'tamanos',
    items: [
      { term: 'Sistema Solar', text: 'Está formado por el Sol y todos los astros que giran a su alrededor: 8 planetas, sus satélites, planetas enanos, asteroides y cometas.' },
      { term: 'Planeta', text: 'Astro redondo, sin luz propia, que gira alrededor de una estrella siguiendo un camino llamado órbita.' },
      { term: 'Planetas interiores (rocosos)', text: 'Mercurio, Venus, Tierra y Marte. Son pequeños, de roca y con pocos satélites o ninguno.' },
      { term: 'Planetas exteriores (gaseosos)', text: 'Júpiter, Saturno, Urano y Neptuno. Son gigantes formados por gases, tienen anillos y muchos satélites.' },
      { term: 'Planeta enano', text: 'Astro redondo que gira alrededor del Sol pero no ha «limpiado» su órbita de otros objetos: Plutón, Ceres, Eris, Haumea y Makemake.' },
      { term: 'Satélite', text: 'Astro que gira alrededor de un planeta. Puede ser natural, como la Luna, o artificial (fabricado por las personas).' },
      { term: 'Asteroide', text: 'Roca de tamaño variable que gira alrededor del Sol. La mayoría están en el cinturón de asteroides, entre Marte y Júpiter.' },
      { term: 'Cometa', text: 'Bola de hielo, polvo y roca con una órbita muy alargada. Cuando se acerca al Sol se le forma una cola que apunta en dirección contraria al Sol.' },
      { term: 'Meteorito', text: 'Trozo de roca del espacio que cae en la Tierra. Cuando un trozo pequeño arde en la atmósfera vemos una «estrella fugaz».' },
      { term: 'Gravedad', text: 'Fuerza de atracción que mantiene a los planetas girando alrededor del Sol y a la Luna alrededor de la Tierra.' },
    ],
  },
  {
    id: 'tierra',
    title: 'La Tierra y sus movimientos',
    lesson: 'movimientos',
    items: [
      { term: 'Eje terrestre', text: 'Línea imaginaria que atraviesa la Tierra de polo norte a polo sur. Está inclinado (unos 23,5°).' },
      { term: 'Rotación', text: 'La Tierra gira sobre su propio eje, de oeste a este, y tarda 24 horas. Produce el día (la mitad iluminada por el Sol) y la noche (la otra mitad). Por eso el Sol «sale» por el este y se pone por el oeste.' },
      { term: 'Traslación', text: 'La Tierra gira alrededor del Sol siguiendo una órbita elíptica y tarda 365 días y 6 horas. Produce el año y, junto con la inclinación del eje, las estaciones.' },
      { term: 'Año bisiesto', text: 'Las 6 horas que sobran cada año se juntan: 6 + 6 + 6 + 6 = 24 horas = 1 día. Por eso, cada 4 años, febrero tiene 29 días y el año tiene 366 días.' },
      { term: 'Estaciones', text: 'Primavera, verano, otoño e invierno. Se producen porque, al tener el eje inclinado, los rayos del Sol llegan más directos (más calor) o más inclinados (menos calor). NO dependen de la distancia al Sol. Cuando en el hemisferio norte es verano, en el sur es invierno.' },
      { term: 'Capas de la Tierra', text: 'Atmósfera (capa de aire), hidrosfera (el agua: mares, ríos, hielo), geosfera (la parte sólida: corteza, manto y núcleo) y biosfera (los seres vivos).' },
    ],
  },
  {
    id: 'luna',
    title: 'La Luna',
    lesson: 'fases',
    items: [
      { term: 'Movimientos de la Luna', text: 'Gira sobre sí misma y alrededor de la Tierra y tarda lo mismo en las dos cosas (unos 28 días). Por eso siempre vemos la misma cara.' },
      { term: 'Fases de la Luna', text: 'Como la Luna no tiene luz propia, según su posición vemos más o menos parte iluminada: luna nueva (no se ve), cuarto creciente, luna llena (se ve entera) y cuarto menguante.' },
      { term: '«La Luna es mentirosa»', text: 'Desde España: cuando tiene forma de C está decreciendo (cuarto menguante) y cuando tiene forma de D está creciendo (cuarto creciente). ¡Dice lo contrario!' },
      { term: 'Eclipse de Sol', text: 'La Luna se pone entre el Sol y la Tierra y tapa el Sol. Orden: Sol – Luna – Tierra. Solo puede ocurrir en luna nueva.' },
      { term: 'Eclipse de Luna', text: 'La Tierra se pone entre el Sol y la Luna, y su sombra oscurece la Luna (que se ve rojiza). Orden: Sol – Tierra – Luna. Solo puede ocurrir en luna llena.' },
    ],
  },
];
