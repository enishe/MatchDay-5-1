import React from 'react';

const Input = ({
  label,
  error,
  className = '',
  containerClassName = '',
  endAdornment,
  ...props
}) => {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-text mb-2" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 bg-bg/50 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-primary/40 transition-all duration-300 backdrop-blur-sm ${
            endAdornment ? 'pr-11' : ''
          } ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 items-center">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
