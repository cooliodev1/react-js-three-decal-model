import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mocking for react-colorful to prevent issues in JSDOM
jest.mock('react-colorful', () => ({
  HexColorPicker: (props) => <input data-testid="hex-color-picker" type="color" value={props.color} onChange={e => props.onChange(e.target.value)} />
}));

// Mocking for @react-three/drei and @react-three/fiber components that might cause issues in JSDOM
jest.mock('@react-three/drei', () => ({
  ...jest.requireActual('@react-three/drei'), // Keep other exports
  useGLTF: jest.fn(() => ({ scene: { clone: () => ({}) }, nodes: {}, materials: {} })),
  useTexture: jest.fn(() => ({ /* mock texture object if needed */ })),
  OrbitControls: (props) => <div data-testid="orbit-controls" {...props} />,
  ContactShadows: (props) => <div data-testid="contact-shadows" {...props} />,
  Decal: (props) => <div data-testid="decal" {...props} />,
  Effects: (props) => <div data-testid="effects" {...props} />,
}));

jest.mock('@react-three/fiber', () => ({
  ...jest.requireActual('@react-three/fiber'),
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ camera: {}, scene: { traverse: jest.fn() }, gl: {} })),
  extend: jest.fn(),
}));

// Mocking for three/examples/jsm/loaders/DRACOLoader
jest.mock('three/examples/jsm/loaders/DRACOLoader', () => ({
  DRACOLoader: jest.fn().mockImplementation(() => ({
    setDecoderPath: jest.fn(),
    preload: jest.fn(),
  })),
}));

// Mock for OutlinePass (if it's directly imported and used outside Effects)
jest.mock('three/examples/jsm/postprocessing/OutlinePass', () => ({
  OutlinePass: jest.fn(),
}));

// Mock for window.matchMedia used by Radix UI components in some environments
global.matchMedia = global.matchMedia || function (query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};


describe('App Component', () => {
  test('sidebar toggle functionality', () => {
    render(<App />);

    // Find the toggle button
    // Using a more resilient selector like role or testId is preferred,
    // but text content can work for simple cases.
    const toggleButton = screen.getByText('☰');
    expect(toggleButton).toBeInTheDocument();

    // Find the sidebar element
    // We target a parent/ancestor of a known sidebar panel to find the sidebar itself.
    // This is because the sidebar div itself doesn't have a unique role or text.
    // Let's assume MeshListPanel is always in the sidebar.
    // First, ensure MeshListPanel title is rendered, then get its parent sidebar.
    const meshListPanelTitle = screen.getByText('Available Meshes'); // This is an AccordionTrigger
    const sidebar = meshListPanelTitle.closest('.ui-sidebar');
    expect(sidebar).toBeInTheDocument();

    // Initial state: sidebar should not have the 'open' class (or be effectively hidden)
    // The 'open' class controls visibility via CSS transform
    expect(sidebar).not.toHaveClass('open');

    // Simulate first click to open the sidebar
    fireEvent.click(toggleButton);
    expect(sidebar).toHaveClass('open');

    // Simulate second click to close the sidebar
    fireEvent.click(toggleButton);
    expect(sidebar).not.toHaveClass('open');
  });
});
