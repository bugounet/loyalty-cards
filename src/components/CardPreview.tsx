import type { LoyaltyCard } from '../types';
import { getCardInitial, maskLoyaltyNumber } from '../utils/cardFormatting';

type Props = {
  card: LoyaltyCard;
  onOpen: () => void;
};

export function CardPreview({ card, onOpen }: Props) {
  const accent = card.accentColor || '#0032b4';

  return (
    <button className="card-preview" type="button" onClick={onOpen} aria-label={`Ouvrir ${card.name}`}>
      <span className="card-orb" style={{ backgroundColor: accent }} aria-hidden="true" />
      <span className="card-preview-top">
        <span className="logo-tile" style={{ color: accent }}>
          {card.logoDataUrl ? <img src={card.logoDataUrl} alt="" /> : getCardInitial(card.name)}
        </span>
        <span className="masked-number">{maskLoyaltyNumber(card.loyaltyNumber)}</span>
      </span>
      <span className="card-preview-bottom">
        <strong>{card.name}</strong>
        <span>{card.note || 'Carte de fidelite'}</span>
      </span>
    </button>
  );
}
