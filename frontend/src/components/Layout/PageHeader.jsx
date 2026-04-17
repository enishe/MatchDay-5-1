import React from 'react';

/**
 * Unified page title area — player (emerald) vs admin (indigo) visual accent.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  variant = 'player',
  children,
  className = '',
}) {
  const isAdmin = variant === 'admin';

  return (
    <header className={`mb-8 md:mb-10 ${className}`}>
      <div
        className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${
          isAdmin
            ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200'
            : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-indigo-400' : 'bg-emerald-400'}`}
          aria-hidden
        />
        {eyebrow || (isAdmin ? 'Zona admin' : 'Zona lojtari')}
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          {description}
        </p>
      )}
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}
