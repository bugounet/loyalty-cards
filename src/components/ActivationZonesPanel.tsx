import { useMemo, useState } from 'react';
import type { ActivationZone } from '../types';
import { distanceMeters, isInsideZone, type Coordinates } from '../utils/geo';
import { ActivationZonesMap } from './ActivationZonesMap';

type Props = {
  currentPosition?: Coordinates;
  onAddCurrentPosition: (position: Coordinates) => void;
  onDeleteZone: (zoneId: string) => void;
  onUpdateRadius: (zoneId: string, radiusMeters: number) => void;
  zones: ActivationZone[];
};

const RADIUS_PRESETS = [50, 100, 250, 500];

export function ActivationZonesPanel({ currentPosition, onAddCurrentPosition, onDeleteZone, onUpdateRadius, zones }: Props) {
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'status' | 'error'>('status');

  const orderedZones = useMemo(() => {
    if (!currentPosition) {
      return zones.map((zone) => ({ zone, isNearby: false }));
    }
    const annotated = zones.map((zone, index) => ({
      zone,
      index,
      isNearby: isInsideZone(currentPosition, zone),
      distance: distanceMeters(currentPosition, zone)
    }));
    annotated.sort((a, b) => {
      if (a.isNearby !== b.isNearby) return a.isNearby ? -1 : 1;
      if (a.isNearby && b.isNearby) return a.distance - b.distance;
      return a.index - b.index;
    });
    return annotated.map(({ zone, isNearby }) => ({ zone, isNearby }));
  }, [zones, currentPosition]);

  function addCurrentPosition() {
    setMessage('');
    setMessageKind('status');

    if (!('geolocation' in navigator)) {
      setMessageKind('error');
      setMessage("Impossible d'utiliser la position actuelle.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onAddCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setMessageKind('status');
        setMessage('Lieu ajoute.');
      },
      () => {
        setMessageKind('error');
        setMessage("Impossible d'utiliser la position actuelle.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 10000
      }
    );
  }

  return (
    <section className="activation-panel" aria-label="Activation autour de moi">
      <div className="activation-panel-heading">
        <p className="eyebrow">Activation autour de moi</p>
        <h2>Lieux d'activation</h2>
        <p>Ajoute ta position actuelle pour faire remonter cette carte quand tu es dans la zone.</p>
      </div>

      <button className="primary-button" type="button" onClick={addCurrentPosition}>
        Ajouter ma position actuelle comme lieu d'activation
      </button>

      {message ? (
        <p className="helper" role={messageKind === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      {zones.length === 0 ? (
        <p className="helper">Aucun lieu enregistre pour cette carte.</p>
      ) : (
        <div className="activation-zone-list">
          {orderedZones.map(({ zone, isNearby }) => (
            <article
              className={isNearby ? 'activation-zone activation-zone--nearby' : 'activation-zone'}
              key={zone.id}
            >
              <div>
                <h3>{zone.label}</h3>
                <p>Rayon {zone.radiusMeters} m</p>
                <p className="activation-zone-coords">
                  {zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)}
                </p>
              </div>
              <ActivationZonesMap zones={[zone]} />
              <label className="field compact-field">
                <span>Rayon pour {zone.label}</span>
                <select
                  value={zone.radiusMeters}
                  onChange={(event) => onUpdateRadius(zone.id, Number(event.target.value))}
                >
                  {RADIUS_PRESETS.map((radius) => (
                    <option key={radius} value={radius}>
                      {radius} m
                    </option>
                  ))}
                </select>
              </label>
              <button className="danger-button" type="button" onClick={() => onDeleteZone(zone.id)}>
                Supprimer {zone.label}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
