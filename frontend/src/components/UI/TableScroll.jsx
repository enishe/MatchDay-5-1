import React from 'react';

/**
 * Horizontal scroll wrapper for wide tables on small screens.
 * Place a `<table className="w-full">` (or similar) as children.
 */
export default function TableScroll({ children, className = '', minWidthClass = 'min-w-[640px]' }) {
  return (
    <div
      className={`w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border/80 bg-panel/30 ${className}`}
    >
      <div className={minWidthClass}>{children}</div>
    </div>
  );
}
