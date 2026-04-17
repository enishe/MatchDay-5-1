import React from 'react';

/** Titled panel for forms / grouped content */
export default function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
  headerRight,
  tone = 'player',
}) {
  const iconTone = tone === 'admin' ? 'text-indigo-300' : 'text-primary/90';

  return (
    <section
      className={`rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-lg backdrop-blur-sm sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-text sm:text-lg">
          {Icon && (
            <Icon className={`h-5 w-5 shrink-0 opacity-90 ${iconTone}`} strokeWidth={2} />
          )}
          {title}
        </h2>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
