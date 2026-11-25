import type { ReactNode } from 'react';

export function Chip({
  active,
  onClick,
  children,
  color,
  className = '',
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  color?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--on' : ''} ${className}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={color ? ({ ['--chip' as string]: color } as React.CSSProperties) : undefined}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; color?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={`seg__opt ${o.value === value ? 'seg__opt--on' : ''}`}
          style={o.color ? ({ ['--seg' as string]: o.color } as React.CSSProperties) : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'toggle--on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle__knob" />
    </button>
  );
}

export function Row({ icon, label, children, onClick, sub }: { icon?: ReactNode; label: ReactNode; children?: ReactNode; onClick?: () => void; sub?: ReactNode }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`row ${onClick ? 'row--btn' : ''}`} onClick={onClick}>
      {icon && <span className="row__icon">{icon}</span>}
      <span className="row__label">
        {label}
        {sub && <span className="row__sub">{sub}</span>}
      </span>
      {children != null && <span className="row__end">{children}</span>}
    </Tag>
  );
}
