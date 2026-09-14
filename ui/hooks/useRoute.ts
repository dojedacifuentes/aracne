import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { HOME, parseRoute, routeToUrl, type Route } from '../lib/route';

const web = Platform.OS === 'web' && typeof window !== 'undefined';

function currentRoute(): Route {
  return web ? parseRoute(window.location.pathname, window.location.search) : HOME;
}

/**
 * La ruta de la escena. En web se lee de la URL, se escribe con
 * `history.pushState` y responde a atrás y adelante; en nativo vive solo en
 * memoria. Sin dependencias: vercel.json ya reescribe cualquier ruta a `/`.
 */
export function useRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    if (!web) return;
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (web) {
      const url = routeToUrl(next);
      if (url !== window.location.pathname + window.location.search) window.history.pushState(null, '', url);
    }
    setRoute(next);
  }, []);

  return [route, navigate];
}
