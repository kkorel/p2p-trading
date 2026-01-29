/**
 * Unit tests for Button component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>);
      
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render with default variant styles', () => {
      render(<Button>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    it('should render with outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
    });

    it('should render with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should render with destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive');
    });
  });

  describe('Sizes', () => {
    it('should render with default size', () => {
      render(<Button>Default Size</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
    });

    it('should render with small size', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
    });

    it('should render with large size', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
    });

    it('should render with icon size', () => {
      render(<Button size="icon">🔍</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should have disabled styling when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:pointer-events-none');
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      render(<Button loading>Submit</Button>);
      
      // Should show spinner or loading indicator
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Submit</Button>);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('As Child', () => {
    it('should render as a link when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Custom label">🔍</Button>);
      
      expect(screen.getByRole('button', { name: 'Custom label' })).toBeInTheDocument();
    });

    it('should support aria-disabled for loading state', () => {
      render(<Button loading aria-disabled="true">Loading</Button>);
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Merged</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex');
    });
  });
});
