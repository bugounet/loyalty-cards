import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActivationZonesMap } from './ActivationZonesMap';
import type { ActivationZone } from '../types';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Circle: ({ children, center }: { children?: ReactNode; center: [number, number] }) => (
    <div data-testid="circle" data-center={center.join(',')}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span data-testid="tooltip">{children}</span>
}));

const zones: ActivationZone[] = [
  {
    id: 'z1',
    label: 'Lieu 1',
    latitude: 48.8566,
    longitude: 2.3522,
    radiusMeters: 250,
    createdAt: '2026-04-16T10:00:00.000Z',
    updatedAt: '2026-04-16T10:00:00.000Z'
  },
  {
    id: 'z2',
    label: 'Lieu 2',
    latitude: 48.86,
    longitude: 2.36,
    radiusMeters: 100,
    createdAt: '2026-04-16T10:00:00.000Z',
    updatedAt: '2026-04-16T10:00:00.000Z'
  }
];

describe('ActivationZonesMap', () => {
  it('affiche un label permanent pour chaque zone', () => {
    render(<ActivationZonesMap zones={zones} />);

    const circles = screen.getAllByTestId('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0].getAttribute('data-center')).toBe('48.8566,2.3522');
    expect(circles[0].textContent).toContain('Lieu 1');
    expect(circles[1].getAttribute('data-center')).toBe('48.86,2.36');
    expect(circles[1].textContent).toContain('Lieu 2');

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(2);
    expect(tooltips.map((t) => t.textContent)).toEqual(['Lieu 1', 'Lieu 2']);
  });

  it('ne rend rien sans zones', () => {
    const { container } = render(<ActivationZonesMap zones={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
