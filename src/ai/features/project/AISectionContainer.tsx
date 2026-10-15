import React from 'react';

interface AISectionContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const AISectionContainer: React.FC<AISectionContainerProps> = ({ children, className = '' }) => (
  <section className={`ai-section-container w-full max-w-full min-w-0 space-y-6 ${className}`}>
    {children}
  </section>
);
