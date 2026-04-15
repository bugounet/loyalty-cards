import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import JsBarcode from 'jsbarcode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { CARDS_STORAGE_KEY } from './storage/cardsStorage';
import type { LoyaltyCard } from './types';

const scannerMock = vi.hoisted(() => ({
  onCapture: undefined as undefined | ((barcodes: Array<{ format?: string; rawValue?: string }>) => void),
  onError: undefined as undefined | (() => void),
  options: undefined as undefined | { delay?: number; formats?: string[] }
}));

const leafletMock = vi.hoisted(() => ({
  circles: [] as Array<{ center: [number, number]; radius: number }>
}));

const brightnessMock = vi.hoisted(() => ({
  optimizeCheckoutBrightness: vi.fn()
}));

vi.mock('react-barcode-scanner', () => ({
  BarcodeScanner: (props: {
    onCapture: (barcodes: Array<{ format?: string; rawValue?: string }>) => void;
    onError: () => void;
    options?: { delay?: number; formats?: string[] };
  }) => {
    scannerMock.onCapture = props.onCapture;
    scannerMock.onError = props.onError;
    scannerMock.options = props.options;
    return <div data-testid="mock-barcode-scanner">Scanner camera</div>;
  }
}));

vi.mock('react-leaflet', () => ({
  Circle: (props: { center: [number, number]; radius: number; children?: React.ReactNode }) => {
    leafletMock.circles.push({ center: props.center, radius: props.radius });
    return (
      <div data-testid="mock-map-circle">
        {props.radius}
        {props.children}
      </div>
    );
  },
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="activation-zones-map">{children}</div>,
  TileLayer: () => <div data-testid="mock-map-tiles" />,
  Tooltip: ({ children }: { children: React.ReactNode }) => <span data-testid="mock-map-tooltip">{children}</span>
}));

function storeCards(cards: LoyaltyCard[]) {
  localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
}

function mockGeolocationSuccess(latitude: number, longitude: number) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude,
        longitude,
        accuracy: 12,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    } as GeolocationPosition);
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition }
  });
  return getCurrentPosition;
}

function mockGeolocationError(code: number) {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback | null) => {
    error?.({
      code,
      message: 'Location blocked',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    } as GeolocationPositionError);
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition }
  });
  return getCurrentPosition;
}

vi.mock('./utils/screenBrightness', () => ({
  optimizeCheckoutBrightness: brightnessMock.optimizeCheckoutBrightness
}));

vi.mock('jsbarcode', () => ({
  default: vi.fn()
}));

const jsBarcodeMock = vi.mocked(JsBarcode);

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    jsBarcodeMock.mockReset();
    brightnessMock.optimizeCheckoutBrightness.mockReset();
    brightnessMock.optimizeCheckoutBrightness.mockResolvedValue({ status: 'unsupported' });
    scannerMock.onCapture = undefined;
    scannerMock.onError = undefined;
    scannerMock.options = undefined;
    leafletMock.circles = [];
  });

  it('shows an empty state and creates a card manually', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Aucune carte enregistree')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(screen.getByText('Carrefour')).toBeTruthy();
    expect(screen.getByText('**** 6789')).toBeTruthy();
  });

  it('filters cards by name', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByLabelText(/nom/i), 'IKEA Family');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '60071234');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Sephora');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '9001');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await user.type(screen.getByLabelText(/rechercher/i), 'ikea');

    expect(screen.getByText('IKEA Family')).toBeTruthy();
    expect(screen.queryByText('Sephora')).toBeNull();
  });

  it('sorts wallet cards alphabetically by name', async () => {
    storeCards([
      {
        id: 'c-zaza',
        name: 'Zaza Market',
        loyaltyNumber: '333',
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      },
      {
        id: 'c-carrefour',
        name: 'carrefour',
        loyaltyNumber: '222',
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      },
      {
        id: 'c-ikea',
        name: 'IKEA',
        loyaltyNumber: '111',
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);

    render(<App />);

    const previews = screen.getAllByRole('button', { name: /^ouvrir /i });
    expect(previews.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Ouvrir carrefour',
      'Ouvrir IKEA',
      'Ouvrir Zaza Market'
    ]);
  });

  it('refreshes GPS position when the refresh button is clicked', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-1',
            label: 'Lieu 1',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    const getCurrentPosition = mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('1 carte disponible ici');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /rafraichir ma position gps/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('logs the obtained GPS coordinates', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-1',
            label: 'Lieu 1',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    render(<App />);

    await screen.findByText('1 carte disponible ici');
    expect(debug).toHaveBeenCalledWith(
      '[useCurrentPosition] position obtained',
      expect.objectContaining({ latitude: 48.8566, longitude: 2.3522 })
    );
  });

  it('shows nearby cards at the top of the wallet when the current position matches saved zones', async () => {
    storeCards([
      {
        id: 'near-card',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'near-zone',
            label: 'Lieu 1',
            latitude: 48.8567,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      },
      {
        id: 'outside-card',
        name: 'Fnac',
        loyaltyNumber: '987654321',
        activationZones: [
          {
            id: 'outside-zone',
            label: 'Lieu 1',
            latitude: 48.9,
            longitude: 2.4,
            radiusMeters: 50,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    const getCurrentPosition = mockGeolocationSuccess(48.8566, 2.3522);

    render(<App />);

    expect(await screen.findByText('1 carte disponible ici')).toBeTruthy();
    expect(screen.getByRole('region', { name: /cartes proches/i }).textContent).toContain('Carrefour Market');
    expect(screen.getByRole('region', { name: /cartes proches/i }).textContent).not.toContain('Fnac');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('does not recommend nearby cards when location permission is denied', async () => {
    storeCards([
      {
        id: 'near-card',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'near-zone',
            label: 'Lieu 1',
            latitude: 48.8567,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationError(1);

    render(<App />);

    expect(await screen.findByText("Position indisponible pour l'instant.")).toBeTruthy();
    expect(screen.getByRole('region', { name: /cartes proches/i }).textContent).not.toContain('Carrefour Market');
    expect(screen.getByRole('button', { name: /reessayer la position/i })).toBeTruthy();
  });

  it('shows a GPS unavailable notice when the geolocation request times out', async () => {
    storeCards([
      {
        id: 'near-card',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'near-zone',
            label: 'Lieu 1',
            latitude: 48.8567,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationError(3);

    render(<App />);

    expect(await screen.findByText("Position indisponible pour l'instant.")).toBeTruthy();
    expect(screen.getByRole('button', { name: /reessayer la position/i })).toBeTruthy();
  });

  it('always shows the nearby section with an empty state when no zone matches', async () => {
    storeCards([
      {
        id: 'far-card',
        name: 'Fnac',
        loyaltyNumber: '987654321',
        activationZones: [
          {
            id: 'far-zone',
            label: 'Lieu 1',
            latitude: 48.9,
            longitude: 2.4,
            radiusMeters: 50,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);

    render(<App />);

    expect(await screen.findByText('Autour de moi')).toBeTruthy();
    expect(screen.getByText('Aucune carte de fidelite liee a ta position actuelle.')).toBeTruthy();
  });

  it('retries location from the bottom nearby block', async () => {
    storeCards([
      {
        id: 'near-card',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'near-zone',
            label: 'Lieu 1',
            latitude: 48.8567,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_success: PositionCallback, error: PositionErrorCallback | null) => {
        error?.({
          code: 1,
          message: 'Location blocked',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError);
      })
      .mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: 48.8566,
            longitude: 2.3522,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        } as GeolocationPosition);
      });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("Position indisponible pour l'instant.");
    await user.click(screen.getByRole('button', { name: /reessayer la position/i }));

    expect(await screen.findByText('1 carte disponible ici')).toBeTruthy();
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('opens details and deletes with confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Monoprix');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '424242');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /ouvrir monoprix/i }));
    await user.click(screen.getByRole('button', { name: /supprimer/i }));
    await user.click(screen.getByRole('button', { name: /confirmer la suppression/i }));

    expect(screen.getByText('Aucune carte enregistree')).toBeTruthy();
  });

  it('adds the current position as an activation zone from card details', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));
    await user.click(screen.getByRole('button', { name: /ajouter ma position actuelle comme lieu d'activation/i }));

    expect(await screen.findByRole('heading', { name: 'Lieu 1' })).toBeTruthy();
    expect(screen.getByText('Rayon 250 m')).toBeTruthy();
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).toContain('"radiusMeters":250');
  });

  it('updates and deletes an activation zone from card details', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-1',
            label: 'Lieu 1',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));
    await user.selectOptions(screen.getByLabelText(/rayon pour lieu 1/i), '500');

    expect(screen.getByText('Rayon 500 m')).toBeTruthy();
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).toContain('"radiusMeters":500');

    await user.click(screen.getByRole('button', { name: /supprimer lieu 1/i }));

    expect(screen.queryByText('Lieu 1')).toBeNull();
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).not.toContain('zone-1');
  });

  it('renames activation zones to keep the numbering continuous after a delete', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-a',
            label: 'Lieu 1',
            latitude: 48.8,
            longitude: 2.3,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          },
          {
            id: 'zone-b',
            label: 'Lieu 2',
            latitude: 48.81,
            longitude: 2.31,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          },
          {
            id: 'zone-c',
            label: 'Lieu 3',
            latitude: 48.82,
            longitude: 2.32,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationError(1);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));
    await user.click(screen.getByRole('button', { name: /supprimer lieu 2/i }));

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Lieu 1', 'Lieu 2']);

    const stored = JSON.parse(localStorage.getItem(CARDS_STORAGE_KEY) ?? '[]');
    const zones = stored[0].activationZones;
    expect(zones.map((zone: { id: string; label: string }) => ({ id: zone.id, label: zone.label }))).toEqual([
      { id: 'zone-a', label: 'Lieu 1' },
      { id: 'zone-c', label: 'Lieu 2' }
    ]);
  });

  it('renders saved activation zones on the detail map', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-1',
            label: 'Lieu 1',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));

    expect(screen.getAllByTestId('activation-zones-map')).toHaveLength(1);
    expect(leafletMock.circles).toEqual([{ center: [48.8566, 2.3522], radius: 250 }]);
  });

  it('labels each activation zone circle on the detail map', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-1',
            label: 'Lieu 1',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          },
          {
            id: 'zone-2',
            label: 'Lieu 2',
            latitude: 48.86,
            longitude: 2.36,
            radiusMeters: 100,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));

    const maps = screen.getAllByTestId('activation-zones-map');
    expect(maps).toHaveLength(2);

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(articles[0].textContent).toContain('Lieu 1');
    expect(articles[0].textContent).toContain('48.85660, 2.35220');
    expect(articles[1].textContent).toContain('Lieu 2');
    expect(articles[1].textContent).toContain('48.86000, 2.36000');

    const firstItemTooltip = articles[0].querySelector('[data-testid="mock-map-tooltip"]');
    expect(firstItemTooltip?.textContent).toBe('Lieu 1');
    const secondItemTooltip = articles[1].querySelector('[data-testid="mock-map-tooltip"]');
    expect(secondItemTooltip?.textContent).toBe('Lieu 2');
  });

  it('hoists and highlights the activation zone the user is currently inside', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        activationZones: [
          {
            id: 'zone-far',
            label: 'Lieu 1',
            latitude: 48.9,
            longitude: 2.4,
            radiusMeters: 100,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          },
          {
            id: 'zone-near',
            label: 'Lieu 2',
            latitude: 48.8566,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ],
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationSuccess(48.8566, 2.3522);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));

    const articles = await screen.findAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(articles[0].textContent).toContain('Lieu 2');
    expect(articles[0].className).toContain('activation-zone--nearby');
    expect(articles[1].textContent).toContain('Lieu 1');
    expect(articles[1].className).not.toContain('activation-zone--nearby');
  });

  it('does not add an activation zone when current position fails', async () => {
    storeCards([
      {
        id: 'card-1',
        name: 'Carrefour Market',
        loyaltyNumber: '123456789',
        createdAt: '2026-04-16T10:00:00.000Z',
        updatedAt: '2026-04-16T10:00:00.000Z'
      }
    ]);
    mockGeolocationError(2);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ouvrir carrefour market/i }));
    await user.click(screen.getByRole('button', { name: /ajouter ma position actuelle comme lieu d'activation/i }));

    expect((await screen.findByRole('alert')).textContent).toBe("Impossible d'utiliser la position actuelle.");
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).not.toContain('activationZones');
  });

  it('shows a barcode and optimizes brightness when a card detail opens', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'IKEA Family');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '4006381333931');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /ouvrir ikea family/i }));

    expect(screen.getByLabelText('Code-barres de la carte')).toBeTruthy();
    expect(screen.getByText('4006 3813 3393 1')).toBeTruthy();
    expect(brightnessMock.optimizeCheckoutBrightness).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses the storage notification after 5 seconds', async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => 'blob:fidelity-backup');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /parametres/i }));
    await user.click(screen.getByRole('button', { name: /telecharger le backup/i }));

    expect(screen.getByText('Backup telecharge.')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.queryByText('Backup telecharge.')).toBeNull();
      },
      { timeout: 6000 }
    );
  }, 10000);

  it('opens settings from the bottom navigation and downloads a JSON backup', async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:fidelity-backup';
    });
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await user.click(screen.getByRole('button', { name: /parametres/i }));
    await user.click(screen.getByRole('button', { name: /telecharger le backup/i }));

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    const backupBlob = createObjectUrl.mock.calls[0][0] as Blob;
    expect(backupBlob.type).toBe('application/json');
    await expect(backupBlob.text()).resolves.toContain('"version": 1');
    await expect(backupBlob.text()).resolves.toContain('Carrefour');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:fidelity-backup');
  });

  it('imports a valid backup after confirmation and replaces existing cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /parametres/i }));

    const backup = new File(
      [
        JSON.stringify({
          version: 1,
          exportedAt: '2026-04-16T12:00:00.000Z',
          cards: [
            {
              id: 'backup-card',
              name: 'IKEA Family',
              loyaltyNumber: '60071234',
              createdAt: '2026-04-16T12:00:00.000Z',
              updatedAt: '2026-04-16T12:00:00.000Z'
            }
          ]
        })
      ],
      'loyalty-cards-backup.json',
      { type: 'application/json' }
    );

    await user.upload(screen.getByLabelText(/importer un backup json/i), backup);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain(
      'Importer ce backup remplacera toutes les cartes enregistrees sur cet appareil. Continuer ?'
    );
    await user.click(screen.getByRole('button', { name: /confirmer l'import/i }));

    expect(screen.getByText('Backup importe.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /accueil/i }));

    expect(screen.getByText('IKEA Family')).toBeTruthy();
    expect(screen.queryByText('Carrefour')).toBeNull();
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).toContain('IKEA Family');
    expect(localStorage.getItem(CARDS_STORAGE_KEY)).not.toContain('Carrefour');
  });

  it('rejects invalid backup files without replacing cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /parametres/i }));

    const backup = new File(['{broken'], 'broken.json', { type: 'application/json' });

    await user.upload(screen.getByLabelText(/importer un backup json/i), backup);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText("Le fichier de backup n'est pas un JSON valide.")).toBeTruthy();
  });

  it('cancels a pending backup import without replacing cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.type(screen.getByLabelText(/nom/i), 'Carrefour');
    await user.type(screen.getByLabelText(/numero de fidelite/i), '123456789');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /parametres/i }));

    const backup = new File(
      [
        JSON.stringify({
          version: 1,
          exportedAt: '2026-04-16T12:00:00.000Z',
          cards: [
            {
              id: 'backup-card',
              name: 'IKEA Family',
              loyaltyNumber: '60071234',
              createdAt: '2026-04-16T12:00:00.000Z',
              updatedAt: '2026-04-16T12:00:00.000Z'
            }
          ]
        })
      ],
      'loyalty-cards-backup.json',
      { type: 'application/json' }
    );

    await user.upload(screen.getByLabelText(/importer un backup json/i), backup);
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: /annuler/i }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Import annule.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /accueil/i }));

    expect(screen.getByText('Carrefour')).toBeTruthy();
    expect(screen.queryByText('IKEA Family')).toBeNull();

    await user.click(screen.getByRole('button', { name: /accueil/i }));

    expect(screen.getByText('Carrefour')).toBeTruthy();
  });

  it('opens the barcode scanner from the card form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.click(screen.getByRole('button', { name: /scanner/i }));

    expect(screen.getByRole('heading', { name: /scanner le code-barres/i })).toBeTruthy();
    expect(screen.getByTestId('mock-barcode-scanner')).toBeTruthy();
    expect(scannerMock.options?.formats).toEqual(
      expect.arrayContaining(['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar'])
    );
  });

  it('fills the loyalty number when the scanner captures a barcode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.click(screen.getByRole('button', { name: /scanner/i }));

    act(() => {
      scannerMock.onCapture?.([{ rawValue: '978020137962' }]);
    });

    expect((screen.getByLabelText(/numero de fidelite/i) as HTMLInputElement).value).toBe('978020137962');
    expect(screen.queryByTestId('mock-barcode-scanner')).toBeNull();
    expect(screen.getByText('Code detecte.')).toBeTruthy();
  });

  it('logs scanner events for debugging', async () => {
    const user = userEvent.setup();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.click(screen.getByRole('button', { name: /scanner/i }));

    act(() => {
      scannerMock.onCapture?.([
        { rawValue: undefined, format: 'ean_13' },
        { rawValue: '978020137962', format: 'code_128' }
      ]);
    });

    await user.click(screen.getByRole('button', { name: /scanner/i }));

    act(() => {
      scannerMock.onError?.();
    });

    await user.click(screen.getByRole('button', { name: /fermer le scanner/i }));
    await user.click(screen.getByRole('button', { name: /^scanner$/i }));
    await user.click(screen.getByRole('button', { name: /fermer le scanner/i }));

    expect(debug).toHaveBeenCalledWith(
      '[BarcodeScanner] scanner opened',
      expect.objectContaining({
        hasGetUserMedia: false,
        isSecureContext: undefined
      })
    );
    expect(debug).toHaveBeenCalledWith('[BarcodeScanner] capture event', {
      count: 2,
      candidates: [
        {
          boundingBox: undefined,
          cornerPoints: undefined,
          format: 'ean_13',
          index: 0,
          rawValue: undefined,
          rawValueLength: 0
        },
        {
          boundingBox: undefined,
          cornerPoints: undefined,
          format: 'code_128',
          index: 1,
          rawValue: '978020137962',
          rawValueLength: 12
        }
      ],
      configuredFormats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar'],
      delay: 250
    });
    expect(debug).toHaveBeenCalledWith('[BarcodeScanner] barcode selected', {
      rawValue: '978020137962'
    });
    expect(warn).toHaveBeenCalledWith('[BarcodeScanner] scanner error event');
    expect(debug).toHaveBeenCalledWith('[BarcodeScanner] scanner closed by user');
  });

  it('keeps manual entry available when scanner reports an error', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /ajouter une carte/i }));
    await user.click(screen.getByRole('button', { name: /scanner/i }));

    act(() => {
      scannerMock.onError?.();
    });

    expect(screen.getByRole('alert').textContent).toBe(
      "Impossible d'utiliser la camera. Saisissez le numero manuellement."
    );
    await user.type(screen.getByLabelText(/numero de fidelite/i), '12345');
    expect((screen.getByLabelText(/numero de fidelite/i) as HTMLInputElement).value).toBe('12345');
  });
});
