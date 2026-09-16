import React from 'react';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'h-10 w-auto',
  alt = 'White Ink',
}) => <img src="/white-ink-logo.png" alt={alt} className={className} />;