import React from 'react';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Title: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'h1',
  ...props
}) => (
  <Component className={`title ${className}`} {...props}>
    {children}
  </Component>
);

export const SectionHeading: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'h2',
  ...props
}) => (
  <Component className={`section-heading ${className}`} {...props}>
    {children}
  </Component>
);

export const Body: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
  ...props
}) => (
  <Component className={`body ${className}`} {...props}>
    {children}
  </Component>
);

export const Muted: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
  ...props
}) => (
  <Component className={`muted ${className}`} {...props}>
    {children}
  </Component>
);

export const TableHeader: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'th',
  ...props
}) => (
  <Component className={`table-header ${className}`} {...props}>
    {children}
  </Component>
);

export const FormLabel: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'label',
  ...props
}) => (
  <Component className={`form-label ${className}`} {...props}>
    {children}
  </Component>
);

export const BrandScript: React.FC<TypographyProps> = ({
  children,
  className = '',
  as: Component = 'span',
  ...props
}) => (
  <Component className={`font-brand-script text-primary text-xl ${className}`} {...props}>
    {children}
  </Component>
);
