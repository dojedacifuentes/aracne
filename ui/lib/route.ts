import { NO_FILTERS, type ArchiveFilters } from '../../lib/archive/filter';
import { ENTRY_TYPES, EPISTEMIC_STATUS, type EntryType, type EpistemicStatus } from '../../lib/schema';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { isSeed } from '../../lib/oracle/rng';

/**
 * Rutas de una sola escena. Nada navega a otra pantalla: la ruta solo decide
 * qué muestra el panel, y en web viaja en la URL para poder compartirse.
 */
export type Route =
  | { name: 'home' }
  | { name: 'invocation'; seed: string; legs: string[]; room?: string }
  | { name: 'entry'; id: string }
  | { name: 'lives' }
  | { name: 'theme'; id: string }
  | { name: 'figure'; id: string }
  | { name: 'archive'; filters: ArchiveFilters }
  | { name: 'drift'; seed: string; mode: DriftMode; leg: string | null }
  // La tela tiene sitio propio: una entrada en el centro y el resto tejido a
  // su alrededor. Sin foco, el archivo entero.
  | { name: 'web'; focus: string | null; skin: WebSkin }
  // El Atlas: un país en la ficha y una causa como lente. Los dos opcionales.
  | { name: 'atlas'; country: string | null; lens: string | null }
  | { name: 'shape' };

export const HOME: Route = { name: 'home' };
export const LIVES: Route = { name: 'lives' };
export const ARCHIVE: Route = { name: 'archive', filters: NO_FILTERS };
export const SHAPE: Route = { name: 'shape' };
export const WEB: Route = { name: 'web', focus: null, skin: 'tela' };
export const ATLAS: Route = { name: 'atlas', country: null, lens: null };

const SLUG = /^[a-z0-9-]+$/;
/** El mismo formato que `EntrySchema`: aquí solo decide si la ruta existe. */
/** `/deriva/<semilla>`: se construye con RegExp para no escapar cada barra. */
const DRIFT_PATH = new RegExp('^/deriva/([^/]+)/?$');
/** `/biografias`, y `/gabinete` por compatibilidad con lo ya compartido. */
const LIVES_PATH = new RegExp('^/(?:biografias|gabinete)/?$');
const THEME_PATH = new RegExp('^/(?:biografias|gabinete)/([^/]+)/?$');
/** `/tela` y `/tela/<id>`, por el mismo motivo que la anterior. */
const WEB_PATH = new RegExp('^/tela(?:/([^/]+))?/?$');
/** `/atlas` y `/atlas/<código>`, con la causa en la query. */
const ATLAS_PATH = new RegExp('^/atlas(?:/([A-Za-z]{2,3}))?/?$');
const COUNTRY_CODE = /^[A-Z]{2,3}$/;
const ENTRY_ID = /^delyra-\d{4}$/;

/**
 * `/i/<semilla>?patas=a,b` es una invocación, `/e/<id>` una entrada,
 * `/gabinete` las salas, `/gabinete/<sala>` una y `/figura/<id>` una figura.
 * Cualquier otra cosa, la portada. Que el id exista lo comprueba la pantalla,
 * que es la que tiene el archivo delante.
 */
export function parseRoute(pathname: string, search: string): Route {
  const entry = /^\/e\/([^/]+)\/?$/.exec(pathname);
  if (entry) return ENTRY_ID.test(entry[1]) ? { name: 'entry', id: entry[1] } : HOME;

  const figure = /^\/figura\/([^/]+)\/?$/.exec(pathname);
  if (figure) return SLUG.test(figure[1]) ? { name: 'figure', id: figure[1] } : HOME;

  // Las biografías vivían en /gabinete hasta que las salas se cambiaron por
  // temas. La ruta vieja sigue entendiéndose: una URL compartida no se rompe
  // porque aquí dentro se haya cambiado de idea.
  if (LIVES_PATH.test(pathname)) return LIVES;
  const theme = THEME_PATH.exec(pathname);
  if (theme) return SLUG.test(theme[1]) ? { name: 'theme', id: theme[1] } : LIVES;

  const drift = DRIFT_PATH.exec(pathname);
  if (drift) {
    if (!isSeed(drift[1])) return HOME;
    const params = new URLSearchParams(search);
    const raw = params.get('modo') ?? '';
    const mode: DriftMode = raw === 'dos-mundos' || raw === 'distancia' ? raw : 'deriva';
    const pata = params.get('pata') ?? '';
    return { name: 'drift', seed: drift[1], mode, leg: SLUG.test(pata) ? pata : null };
  }
  // La tela: sin nada detrás es el archivo entero; con un identificador
  // detrás, se teje alrededor de esa entrada. Un foco que no tenga forma de
  // identificador se descarta y la tela se abre igual: una URL rota no debe
  // mandar a la portada, que es justo donde no se quería ir.
  const web = WEB_PATH.exec(pathname);
  if (web) {
    const skin: WebSkin = new URLSearchParams(search).get('vista') === 'flujo' ? 'flujo' : 'tela';
    const focus = web[1] ?? '';
    return { name: 'web', focus: ENTRY_ID.test(focus) ? focus : null, skin };
  }

  const atlas = ATLAS_PATH.exec(pathname);
  if (atlas) {
    const codigo = (atlas[1] ?? '').toUpperCase();
    const causa = new URLSearchParams(search).get('causa') ?? '';
    return {
      name: 'atlas',
      country: COUNTRY_CODE.test(codigo) ? codigo : null,
      lens: SLUG.test(causa) ? causa : null,
    };
  }

  if (/^\/adn\/?$/.test(pathname)) return SHAPE;

  if (/^\/archivo\/?$/.test(pathname)) return { name: 'archive', filters: parseFilters(search) };

  const match = /^\/i\/([^/]+)\/?$/.exec(pathname);
  if (!match || !isSeed(match[1])) return HOME;
  const params = new URLSearchParams(search);
  const legs = (params.get('patas') ?? '')
    .split(',')
    .map((leg) => leg.trim())
    .filter((leg) => SLUG.test(leg));
  // La sala recorta el corpus antes de que el motor lo vea; viaja en la URL
  // para que la invocación siga siendo la misma en cualquier parte.
  const sala = params.get('sala') ?? '';
  const invocation: Route = { name: 'invocation', seed: match[1], legs: [...new Set(legs)] };
  return SLUG.test(sala) ? { ...invocation, room: sala } : invocation;
}

/** Las patas se ordenan: la misma selección da siempre la misma URL. */
export function routeToUrl(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'entry':
      return `/e/${route.id}`;
    case 'lives':
      return '/biografias';
    case 'theme':
      return `/biografias/${route.id}`;
    case 'figure':
      return `/figura/${route.id}`;
    case 'drift': {
      const query = new URLSearchParams();
      if (route.mode !== 'deriva') query.set('modo', route.mode);
      if (route.leg) query.set('pata', route.leg);
      const search = query.toString();
      return search ? `/deriva/${route.seed}?${search}` : `/deriva/${route.seed}`;
    }
    case 'web': {
      const path = route.focus ? `/tela/${route.focus}` : '/tela';
      return route.skin === 'flujo' ? `${path}?vista=flujo` : path;
    }
    case 'atlas': {
      const path = route.country ? `/atlas/${route.country}` : '/atlas';
      return route.lens ? `${path}?causa=${route.lens}` : path;
    }
    case 'shape':
      return '/adn';
    case 'archive': {
      const query = filtersToQuery(route.filters);
      return query ? `/archivo?${query}` : '/archivo';
    }
    case 'invocation': {
      const query = new URLSearchParams();
      if (route.legs.length > 0) query.set('patas', [...route.legs].sort().join(','));
      if (route.room) query.set('sala', route.room);
      const search = query.toString();
      // Las comas de `patas` no necesitan escaparse y la URL se lee mejor sin ellas.
      return `/i/${route.seed}${search ? `?${search.replace(/%2C/g, ',')}` : ''}`;
    }
  }
}

/** Una lista separada por comas, limpia y sin repetir. */
function list(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key) ?? '';
  return [...new Set(raw.split(',').map((v) => v.trim()).filter((v) => SLUG.test(v)))];
}

/**
 * Los filtros viajan en la URL, como pide la fase: una selección compartida se
 * abre igual en otra máquina. Lo que no sea un valor del esquema se descarta
 * en silencio; un filtro inventado no debe vaciar el archivo.
 */
export function parseFilters(search: string): ArchiveFilters {
  const params = new URLSearchParams(search);
  const types = ENTRY_TYPES as readonly string[];
  const statuses = EPISTEMIC_STATUS as readonly string[];
  return {
    categories: list(params, 'categorias'),
    types: list(params, 'tipos').filter((v): v is EntryType => types.includes(v)),
    tags: list(params, 'tags'),
    statuses: list(params, 'estado').filter((v): v is EpistemicStatus => statuses.includes(v)),
    query: (params.get('q') ?? '').slice(0, 120),
  };
}

/** El orden es fijo para que los mismos filtros den siempre la misma URL. */
export function filtersToQuery(filters: ArchiveFilters): string {
  const params = new URLSearchParams();
  const add = (key: string, values: readonly string[]) => {
    if (values.length > 0) params.set(key, [...values].sort().join(','));
  };
  add('categorias', filters.categories);
  add('tipos', filters.types);
  add('tags', filters.tags);
  add('estado', filters.statuses);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  return params.toString().replace(/%2C/g, ',');
}
