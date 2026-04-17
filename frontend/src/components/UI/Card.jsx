import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  hover = false,
  ...props 
}) => {
  const baseStyles = 'bg-panel/80 border border-border rounded-xl p-6 backdrop-blur-sm shadow-xl';
  const hoverStyles = hover ? 'hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300 transform hover:-translate-y-1' : '';
  
  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
