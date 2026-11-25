export function EmptyState({ art, title, text }: { art: string; title: string; text?: string }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        {art}
      </div>
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
    </div>
  );
}
