import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-panel/40 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-light/80 text-text-muted">
          <Icon className="h-8 w-8 opacity-80" strokeWidth={1.25} />
        </div>
      )}
      <h3 className="font-heading text-lg font-bold text-text sm:text-xl">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-text-muted sm:text-base">{description}</p>
      )}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
