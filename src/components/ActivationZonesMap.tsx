import 'leaflet/dist/leaflet.css';
import { Circle, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { ActivationZone } from '../types';

type Props = {
  zones: ActivationZone[];
};

const OPENSTREETMAP_TILES_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OPENSTREETMAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function ActivationZonesMap({ zones }: Props) {
  if (zones.length === 0) return null;

  const firstZone = zones[0];
  const center: LatLngExpression = [firstZone.latitude, firstZone.longitude];
  const bounds: LatLngBoundsExpression = zones.map((zone) => [zone.latitude, zone.longitude]);

  return (
    <div className="activation-map" aria-label="Carte des lieux d'activation">
      <MapContainer bounds={bounds} center={center} className="activation-map-canvas" scrollWheelZoom={false} zoom={16}>
        <TileLayer attribution={OPENSTREETMAP_ATTRIBUTION} url={OPENSTREETMAP_TILES_URL} />
        {zones.map((zone) => (
          <Circle
            center={[zone.latitude, zone.longitude]}
            key={zone.id}
            pathOptions={{ color: '#165b3e', fillColor: '#165b3e', fillOpacity: 0.18 }}
            radius={zone.radiusMeters}
          >
            <Tooltip className="activation-zone-tooltip" direction="center" permanent>
              {zone.label}
            </Tooltip>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
