import { WalletCards } from 'lucide-react';

type Props = {
  onHome: () => void;
};

export function AppHeader({ onHome }: Props) {
  return (
    <header className="app-header">
      <button className="brand-button" type="button" onClick={onHome} aria-label="Retour aux cartes">
        <span className="brand-mark" aria-hidden="true">
          <WalletCards size={22} strokeWidth={2} />
        </span>
        <span>Loyalty Cards</span>
      </button>
    </header>
  );
}
