import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react';

/** A4 portrait width in CSS px at 96dpi (210mm). */
const A4_WIDTH = 794;
/** A4 portrait height in CSS px at 96dpi (297mm). */
const A4_HEIGHT = 1123;

/**
 * Renders children on a fixed A4 portrait canvas and scales it down to fit the
 * available width (spec §10.3: preview keeps A4 aspect, scales to fit, never
 * forces horizontal scroll). The exported PDF is always A4 regardless.
 */
export function A4Frame({ children }: { children: ReactNode }): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = (): void => {
      const available = el.clientWidth;
      setScale(Math.min(1, available / A4_WIDTH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: A4_WIDTH * scale, height: A4_HEIGHT * scale, flex: '0 0 auto' }}>
        <div
          style={{
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: '#ffffff',
            boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
