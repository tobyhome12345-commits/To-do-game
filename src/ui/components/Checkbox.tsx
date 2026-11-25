import type { Priority } from '../../model/types';

interface Props {
  checked: boolean;
  animating?: boolean;
  priority?: Priority;
  size?: 'm' | 's';
  onToggle: () => void;
  label: string;
}

/** Round checkbox. On tick: fill pops in, check draws itself, confetti bursts out. */
export function Checkbox({ checked, animating, priority = 0, size = 'm', onToggle, label }: Props) {
  const on = checked !== !!animating; // while animating, show the state it's going to
  return (
    <button
      type="button"
      className={`check check--p${priority} check--${size} ${on ? 'is-on' : ''} ${animating && on ? 'is-popping' : ''}`}
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle className="check__ring" cx="12" cy="12" r="10.25" />
        <circle className="check__fill" cx="12" cy="12" r="11" />
        <path className="check__tick" d="M7.2 12.4l3.2 3.2 6.4-6.8" />
      </svg>
      {animating && on && (
        <span className="check__burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${i * 36}deg`, ['--d' as string]: `${i % 2 ? 22 : 30}px` }} />
          ))}
        </span>
      )}
    </button>
  );
}
