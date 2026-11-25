import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const CloseCtx = createContext<() => void>(() => {});
/** Animate the surrounding sheet closed (use from buttons inside a sheet). */
export const useCloseSheet = () => useContext(CloseCtx);

interface Props {
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  title?: ReactNode;
  label: string;
  /** 'auto' hugs content, 'tall' is for big editors */
  size?: 'auto' | 'tall';
}

/** Bottom sheet: slides up, closes on scrim tap or a swipe down on the handle. */
export function Sheet({ onClose, children, footer, title, label, size = 'auto' }: Props) {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const start = useRef<number | null>(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onTouchStart = (e: React.TouchEvent) => (start.current = e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => {
    if (start.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - start.current));
  };
  const onTouchEnd = () => {
    if (dragY > 90) close();
    else setDragY(0);
    start.current = null;
  };

  return (
    <div className={`sheet-layer ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="sheet-scrim" onClick={close} />
      <div
        className={`sheet sheet--${size}`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div className="sheet__grab" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <span className="sheet__handle" />
          {title && <div className="sheet__title">{title}</div>}
        </div>
        <CloseCtx.Provider value={close}>
          <div className="sheet__body">{children}</div>
          {footer && <div className="sheet__footer">{footer}</div>}
        </CloseCtx.Provider>
      </div>
    </div>
  );
}

