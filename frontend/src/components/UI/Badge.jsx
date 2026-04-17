import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'bg-panel border-border text-text',
    primary: 'bg-primary/20 text-primary border-primary/50',
    secondary: 'bg-secondary/20 text-secondary border-secondary/50',
    accent: 'bg-accent/20 text-accent border-accent/50',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    confirmed: 'bg-green-500/20 text-green-400 border-green-500/50',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/50',
    paid: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'no-show': 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };
  
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border transition-all duration-200 ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
