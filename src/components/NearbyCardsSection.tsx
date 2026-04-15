import type { LocationStatus } from '../hooks/useCurrentPosition';
import type { NearbyCardMatch } from '../utils/geo';

type Props = {
  matches: NearbyCardMatch[];
  onOpenCard: (cardId: string) => void;
  onRetry: () => void;
  status: LocationStatus;
};

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `A ${Math.round(distanceMeters)} m`;
  return `A ${(distanceMeters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function NearbyCardsSection({ matches, onOpenCard, onRetry, status }: Props) {
  const hasMatches = matches.length > 0;
  const isUnavailable = status === 'denied' || status === 'unavailable' || status === 'unsupported';
  const isChecking = status === 'idle' || status === 'checking';

  const subtitle = hasMatches
    ? matches.length === 1
      ? '1 carte disponible ici'
      : `${matches.length} cartes disponibles ici`
    : isUnavailable
      ? "Position indisponible pour l'instant."
      : isChecking
        ? 'Localisation en cours…'
        : 'Aucune carte de fidelite liee a ta position actuelle.';

  return (
    <section className={`nearby-section${hasMatches ? '' : ' nearby-section--empty'}`} aria-label="Cartes proches">
      <div className="nearby-heading">
        <h2>Autour de moi</h2>
        <p className="nearby-subtitle">{subtitle}</p>
      </div>

      {hasMatches ? (
        <div className="nearby-list">
          {matches.map((match) => (
            <button
              className="nearby-card"
              key={`${match.card.id}-${match.zone.id}`}
              type="button"
              onClick={() => onOpenCard(match.card.id)}
            >
              <span>
                <strong>{match.card.name}</strong>
                <small>{match.zone.label}</small>
              </span>
              <span className="nearby-distance">{formatDistance(match.distanceMeters)}</span>
            </button>
          ))}
        </div>
      ) : isUnavailable ? (
        <div className="nearby-empty">
          <button className="secondary-button" type="button" onClick={onRetry}>
            Reessayer la position
          </button>
        </div>
      ) : null}
    </section>
  );
}
