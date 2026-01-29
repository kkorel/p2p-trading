/**
 * Unit tests for Card component
 */

import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card Component', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>
      );
      
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have base card styles', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-card');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-card" data-testid="card">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('custom-card');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('should render children', () => {
      render(
        <Card>
          <CardHeader>
            <span>Header content</span>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should have proper spacing', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header</CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
      expect(header).toHaveClass('space-y-1.5');
      expect(header).toHaveClass('p-6');
    });

    it('should apply custom className', () => {
      render(
        <Card>
          <CardHeader className="custom-header" data-testid="header">Header</CardHeader>
        </Card>
      );
      
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('should render title text', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>My Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('should have heading styles', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('font-semibold');
    });

    it('should render as h3 by default', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Card description here</CardDescription>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByText('Card description here')).toBeInTheDocument();
    });

    it('should have muted styling', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="desc">Description</CardDescription>
          </CardHeader>
        </Card>
      );
      
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('should render content', () => {
      render(
        <Card>
          <CardContent>
            <p>Main card content</p>
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Main card content')).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });

    it('should apply custom className', () => {
      render(
        <Card>
          <CardContent className="custom-content" data-testid="content">Content</CardContent>
        </Card>
      );
      
      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('should render footer content', () => {
      render(
        <Card>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );
      
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should have flex layout for actions', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('p-6');
      expect(footer).toHaveClass('pt-0');
    });
  });

  describe('Full Card Composition', () => {
    it('should render complete card with all parts', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Product Card</CardTitle>
            <CardDescription>A great product</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Price: $99</p>
          </CardContent>
          <CardFooter>
            <button>Buy Now</button>
          </CardFooter>
        </Card>
      );
      
      expect(screen.getByRole('heading', { name: 'Product Card' })).toBeInTheDocument();
      expect(screen.getByText('A great product')).toBeInTheDocument();
      expect(screen.getByText('Price: $99')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Buy Now' })).toBeInTheDocument();
    });

    it('should allow nesting multiple content sections', () => {
      render(
        <Card>
          <CardContent>Section 1</CardContent>
          <CardContent>Section 2</CardContent>
        </Card>
      );
      
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should allow adding role to card', () => {
      render(<Card role="article">Content</Card>);
      
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should support aria-labelledby for card', () => {
      render(
        <Card aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const card = screen.getByText('Accessible Card').closest('div[class*="rounded"]');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    });
  });
});
