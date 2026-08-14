import React, { useEffect, useRef } from 'react';

const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const VANTA_SRC = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.rings.min.js';

declare global {
  interface Window {
    THREE?: unknown;
    VANTA?: {
      RINGS: (options: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      if ((existing as HTMLScriptElement).dataset.loaded === 'true') resolve();
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

/**
 * Animated VANTA.RINGS background for the auth screen. Loads three.js +
 * vanta from CDN on demand (not bundled -- this is the only page that uses
 * it) and tears the effect down on unmount. Silently does nothing if the
 * scripts fail to load (e.g. offline dev), leaving a plain background.
 */
export const VantaRingsBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let effect: { destroy: () => void } | null = null;

    loadScript(THREE_SRC)
      .then(() => loadScript(VANTA_SRC))
      .then(() => {
        if (cancelled || !containerRef.current || !window.VANTA) return;
        effect = window.VANTA.RINGS({
          el: containerRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0x0,
        });
      })
      .catch(() => {
        // No animated background -- the container's own background color
        // (set inline below) still renders fine.
      });

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: '#0b0f19',
      }}
    />
  );
};
