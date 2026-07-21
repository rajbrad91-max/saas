// 🧭 Lightweight URL sync for the vendor panel — no router dependency.
// The URL is the source of truth for the current view. Navigating pushes a
// history entry; Back/Forward fire popstate, we re-read the URL, and the view
// follows. This keeps the address bar and the rendered page in sync, so the
// browser Back button moves within the app instead of doing nothing.
//
// URL shape (all under /panel):
//   /panel                      -> { tab: 'dashboard', album: null }
//   /panel/leads                -> { tab: 'leads',     album: null }
//   /panel/galleries            -> { tab: 'galleries', album: null }
//   /panel/galleries/42         -> { tab: 'galleries', album: '42' }
import { useState, useEffect, useCallback, useRef } from 'react';

const BASE = 'panel';

function segs() {
  return window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

// URL -> { tab, album }
export function readRoute(defaultTab = 'dashboard') {
  const s = segs();
  if (s[0] !== BASE) return { tab: defaultTab, album: null };
  const tab = s[1] || defaultTab;
  const album = tab === 'galleries' && s[2] ? s[2] : null;
  return { tab, album };
}

// { tab, album } -> "/panel/…" path
function toPath({ tab, album }) {
  let p = '/' + BASE;
  if (tab && tab !== 'dashboard') p += '/' + tab;
  if (tab === 'galleries' && album) p += '/' + album;
  return p;
}

/**
 * useAppRoute(defaultTab)
 * returns { route, navigate, replace }
 *  - route: { tab, album } derived from the URL
 *  - navigate(next): push a new history entry + update the view
 *  - replace(next): replace current entry (no new Back step)
 * Back/Forward re-read the URL and update `route` automatically.
 */
export function useAppRoute(defaultTab = 'dashboard') {
  const [route, setRoute] = useState(() => readRoute(defaultTab));
  const routeRef = useRef(route);
  routeRef.current = route;

  // on first mount, ensure the history entry carries our path (so Back has a target)
  useEffect(() => {
    if (segs()[0] !== BASE) {
      window.history.replaceState({ app: true }, '', toPath(routeRef.current));
    }
  }, []);

  // Back/Forward: re-read URL -> update view
  useEffect(() => {
    const onPop = () => setRoute(readRoute(defaultTab));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [defaultTab]);

  const navigate = useCallback((next) => {
    const merged = { ...routeRef.current, ...next };
    if (next.tab && !('album' in next)) merged.album = null;
    window.history.pushState({ app: true }, '', toPath(merged));
    setRoute(merged);
  }, []);

  const replace = useCallback((next) => {
    const merged = { ...routeRef.current, ...next };
    if (next.tab && !('album' in next)) merged.album = null;
    window.history.replaceState({ app: true }, '', toPath(merged));
    setRoute(merged);
  }, []);

  return { route, navigate, replace };
}
