import { isSeed } from '../../lib/oracle/rng';

/**
 * Rutas de una sola escena. Nada navega a otra pantalla: la ruta solo decide
 * qué muestra el panel, y en web viaja en la URL para poder compartirse.
 */
export type Route = { name: 'home' } | { name: 'invocation'; seed: string; legs: string[] };

export const HOME: Route = { name: 'home' };

const LEG_ID = /^[a-z0-9-]+$/;

/** `/i/<semilla>?patas=a,b` es una invocación; cualquier otra cosa, la portada. */
export function parseRoute(pathname: string, search: string): Route {
  const match = /^\/i\/([^/]+)\/?$/.exec(pathname);
  if (!match || !isSeed(match[1])) return HOME;
  const patas = new URLSearchParams(search).get('patas') ?? '';
  const legs = patas
    .split(',')
    .map((leg) => leg.trim())
    .filter((leg) => LEG_ID.test(leg));
  return { name: 'invocation', seed: match[1], legs: [...new Set(legs)] };
}

/** Las patas se ordenan: la misma selección da siempre la misma URL. */
export function routeToUrl(route: Route): string {
  if (route.name === 'home') return '/';
  const query = route.legs.length > 0 ? `?patas=${[...route.legs].sort().join(',')}` : '';
  return `/i/${route.seed}${query}`;
}
