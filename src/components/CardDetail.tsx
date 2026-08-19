import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LoyaltyCard } from '../types';
import type { Coordinates } from '../utils/geo';
import { getCardInitial } from '../utils/cardFormatting';
import { optimizeCheckoutBrightness } from '../utils/screenBrightness';
import { ActivationZonesPanel } from './ActivationZonesPanel';
import { BarcodeDisplay } from './BarcodeDisplay';

type Props = {
  card: LoyaltyCard;
  currentPosition?: Coordinates;
  onAddActivationZone: (cardId: string, position: Coordinates) => void;
  onBack: () => void;
  onDelete: () => void;
  onDeleteActivationZone: (cardId: string, zoneId: string) => void;
  onEdit: () => void;
  onUpdateActivationZoneRadius: (cardId: string, zoneId: string, radiusMeters: number) => void;
};

export function CardDetail({
  card,
  currentPosition,
  onAddActivationZone,
  onBack,
  onDelete,
  onDeleteActivationZone,
  onEdit,
  onUpdateActivationZoneRadius
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const brightnessAttemptedRef = useRef(false);
  const accent = card.accentColor || '#0032b4';

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [card.id]);

  useEffect(() => {
    if (brightnessAttemptedRef.current) return;
    brightnessAttemptedRef.current = true;
    void optimizeCheckoutBrightness();
  }, [card.id]);

  return (
    <main className="page detail-page">
      <button className="tertiary-button back-button" type="button" onClick={onBack}>
        Retour
      </button>
      <section className="detail-card">
        <div className="detail-logo" style={{ color: accent }}>
          {card.logoDataUrl ? <img src={card.logoDataUrl} alt="" /> : getCardInitial(card.name)}
        </div>
        <p className="eyebrow">Carte de fidelite</p>
        <h1>{card.name}</h1>
        <BarcodeDisplay value={card.loyaltyNumber} />
        {card.note ? <p className="detail-note">{card.note}</p> : null}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Modifier
          </button>
          <button className="danger-button" type="button" onClick={() => setConfirming(true)}>
            Supprimer
          </button>
        </div>
        {confirming ? (
          <div className="confirm-box" role="alert">
            <p>Supprimer cette carte de cet appareil ?</p>
            <button className="danger-button" type="button" onClick={onDelete}>
              Confirmer la suppression
            </button>
            <button className="tertiary-button" type="button" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </div>
        ) : null}
        <ActivationZonesPanel
          currentPosition={currentPosition}
          onAddCurrentPosition={(position) => onAddActivationZone(card.id, position)}
          onDeleteZone={(zoneId) => onDeleteActivationZone(card.id, zoneId)}
          onUpdateRadius={(zoneId, radiusMeters) => onUpdateActivationZoneRadius(card.id, zoneId, radiusMeters)}
          zones={card.activationZones ?? []}
        />
      </section>
    </main>
  );
}
