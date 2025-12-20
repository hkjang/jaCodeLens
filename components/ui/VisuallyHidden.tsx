import { ReactNode } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
}

/**
 * VisuallyHidden - Screen reader only text utility
 * Content is hidden visually but available to screen readers
 */
export default function VisuallyHidden({ 
  children, 
  as: Component = 'span' 
}: VisuallyHiddenProps) {
  return (
    <Component
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {children}
    </Component>
  );
}
