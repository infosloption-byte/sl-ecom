import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** React Router doesn't reset browser scroll when navigating between SPA routes. */
export function ScrollManager() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const restore = () => {
      if (hash) {
        const id = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: 'start', behavior: 'instant' });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    // Reset immediately and after the browser's first navigation frame.
    restore();
    const frame = window.requestAnimationFrame(restore);
    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previous;
    };
  }, [pathname, search, hash]);

  return null;
}
