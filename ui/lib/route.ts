import { isSeed } from '../../lib/oracle/rng';

/**
 * Rutas de una sola escena. Nada navega a otra pantalla: la ruta solo decide
 * qué muestra el panel, y en web viaja en la URL para poder compartirse.
 */
export type Route =
  | { name: 'home' }
  | { name: 'invocation'; seed: string; legs: string[]; room?: string }
  | { name: 'entry'; id: string }
  | { name: 'cabinet' }
  | { name: 'room'; id: string }
  | { name: 'figure'; id: string };

export const HOME: Route = { name: 'home' };
export const CABINET: Route = { name: 'cabinet' };

const SLUG = /^[a-z0-9-]+$/;
/** El mismo formato que `EntrySchema`: aquí solo decide si la ruta existe. */
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

  if (/^\/gabinete\/?$/.test(pathname)) return CABINET;
  const room = /^\/gabinete\/([^/]+)\/?$/.exec(pathname);
  if (room) return SLUG.test(room[1]) ? { name: 'room', id: room[1] } : CABINET;

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
    case 'cabinet':
      return '/gabinete';
    case 'room':
      return `/gabinete/${route.id}`;
    case 'figure':
      return `/figura/${route.id}`;
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
