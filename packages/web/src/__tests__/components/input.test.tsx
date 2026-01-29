/**
 * Unit tests for Input component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with default type text', () => {
      render(<Input />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should render with email type', () => {
      render(<Input type="email" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('should render with number type', () => {
      render(<Input type="number" />);
      
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('should render with password type', () => {
      render(<Input type="password" />);
      
      // Password inputs don't have a role, query by element
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Value Management', () => {
    it('should display initial value', () => {
      render(<Input defaultValue="Initial" />);
      
      expect(screen.getByRole('textbox')).toHaveValue('Initial');
    });

    it('should update value when typing', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');
      
      expect(input).toHaveValue('Hello');
    });

    it('should call onChange when value changes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      render(<Input onChange={handleChange} />);
      
      await user.type(screen.getByRole('textbox'), 'a');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should support controlled value', () => {
      const { rerender } = render(<Input value="Controlled" onChange={() => {}} />);
      
      expect(screen.getByRole('textbox')).toHaveValue('Controlled');
      
      rerender(<Input value="Updated" onChange={() => {}} />);
      
      expect(screen.getByRole('textbox')).toHaveValue('Updated');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should not allow typing when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="Original" />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'New text').catch(() => {});
      
      expect(input).toHaveValue('Original');
    });

    it('should have disabled styling', () => {
      render(<Input disabled />);
      
      expect(screen.getByRole('textbox')).toHaveClass('disabled:cursor-not-allowed');
      expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Read Only State', () => {
    it('should be read-only when readOnly prop is true', () => {
      render(<Input readOnly defaultValue="Read Only" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should display value but not allow changes when readOnly', async () => {
      const user = userEvent.setup();
      render(<Input readOnly defaultValue="Read Only" />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'New').catch(() => {});
      
      expect(input).toHaveValue('Read Only');
    });
  });

  describe('Validation', () => {
    it('should support required attribute', () => {
      render(<Input required />);
      
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should support minLength', () => {
      render(<Input minLength={5} />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '5');
    });

    it('should support maxLength', () => {
      render(<Input maxLength={10} />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
    });

    it('should support pattern attribute', () => {
      render(<Input pattern="[0-9]*" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[0-9]*');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Email address" />);
      
      expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="helper" />
          <span id="helper">Helper text</span>
        </>
      );
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'helper');
    });

    it('should support aria-invalid for error states', () => {
      render(<Input aria-invalid="true" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have proper focus styles', () => {
      render(<Input />);
      
      expect(screen.getByRole('textbox')).toHaveClass('focus-visible:outline-none');
      expect(screen.getByRole('textbox')).toHaveClass('focus-visible:ring-2');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      await user.tab();
      
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Input className="custom-input" />);
      
      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });

    it('should merge custom className with default styles', () => {
      render(<Input className="custom-input" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input');
      expect(input).toHaveClass('flex');
    });
  });

  describe('Events', () => {
    it('should call onFocus when focused', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      
      fireEvent.focus(screen.getByRole('textbox'));
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when blurred', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      
      fireEvent.blur(screen.getByRole('textbox'));
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should call onKeyDown on key press', () => {
      const handleKeyDown = jest.fn();
      render(<Input onKeyDown={handleKeyDown} />);
      
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });
});
