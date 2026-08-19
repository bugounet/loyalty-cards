import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Home, Plus, Settings } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { CardDetail } from './components/CardDetail';
import { CardForm } from './components/CardForm';
import { CardPreview } from './components/CardPreview';
import { EmptyState } from './components/EmptyState';
import { NearbyCardsSection } from './components/NearbyCardsSection';
import { useCurrentPosition } from './hooks/useCurrentPosition';
import { createCardsBackup, loadCards, parseCardsBackup, saveCards } from './storage/cardsStorage';
import type { LoyaltyCard, LoyaltyCardInput } from './types';
import { normalizeCardInput } from './utils/cardFormatting';
import { createId } from './utils/createId';
import { findNearbyCards, type Coordinates } from './utils/geo';

type View =
  | { name: 'wallet' }
  | { name: 'add' }
  | { name: 'edit'; card: LoyaltyCard }
  | { name: 'detail'; cardId: string }
  | { name: 'settings' };

function optionalCardFields(input: LoyaltyCardInput): Pick<LoyaltyCard, 'accentColor' | 'logoDataUrl' | 'note'> {
  const fields: Pick<LoyaltyCard, 'accentColor' | 'logoDataUrl' | 'note'> = {};
  if (input.accentColor) fields.accentColor = input.accentColor;
  if (input.logoDataUrl) fields.logoDataUrl = input.logoDataUrl;
  if (input.note) fields.note = input.note;
  return fields;
}

export function App() {
  const [cards, setCards] = useState<LoyaltyCard[]>(() => loadCards());
  const [query, setQuery] = useState('');
  const [storageMessage, setStorageMessage] = useState('');
  const [view, setView] = useState<View>({ name: 'wallet' });
  const [pendingBackup, setPendingBackup] = useState<LoyaltyCard[] | null>(null);
  const currentPosition = useCurrentPosition();

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
    const matches = normalizedQuery
      ? cards.filter((card) => card.name.toLocaleLowerCase('fr-FR').includes(normalizedQuery))
      : cards;
    return [...matches].sort((a, b) =>
      a.name.localeCompare(b.name, 'fr-FR', { sensitivity: 'base' })
    );
  }, [cards, query]);

  const hasActivationZones = useMemo(
    () => cards.some((card) => (card.activationZones ?? []).length > 0),
    [cards]
  );
  const nearbyCards = useMemo(() => {
    if (!currentPosition.position) return [];
    return findNearbyCards(cards, currentPosition.position);
  }, [cards, currentPosition.position]);
  const selectedCard = view.name === 'detail' ? cards.find((card) => card.id === view.cardId) : undefined;

  useEffect(() => {
    const needsPosition =
      hasActivationZones && (view.name === 'wallet' || view.name === 'detail');
    if (needsPosition && currentPosition.status === 'idle') {
      currentPosition.requestPosition();
    }
  }, [currentPosition, hasActivationZones, view.name]);

  useEffect(() => {
    if (!storageMessage) return;
    const timeout = setTimeout(() => setStorageMessage(''), 5000);
    return () => clearTimeout(timeout);
  }, [storageMessage]);

  function persist(nextCards: LoyaltyCard[]) {
    setCards(nextCards);
    const result = saveCards(nextCards);
    setStorageMessage(result.ok ? '' : result.message);
  }

  function openCard(cardId: string) {
    setView({ name: 'detail', cardId });
  }

  function createCard(input: LoyaltyCardInput) {
    const now = new Date().toISOString();
    const normalized = normalizeCardInput(input);
    persist([
      ...cards,
      {
        id: createId(),
        name: normalized.name,
        loyaltyNumber: normalized.loyaltyNumber,
        ...optionalCardFields(normalized),
        createdAt: now,
        updatedAt: now
      }
    ]);
    setView({ name: 'wallet' });
  }

  function updateCard(cardId: string, input: LoyaltyCardInput) {
    const normalized = normalizeCardInput(input);
    persist(
      cards.map((card) =>
        card.id === cardId
          ? {
              id: card.id,
              name: normalized.name,
              loyaltyNumber: normalized.loyaltyNumber,
              ...optionalCardFields(normalized),
              activationZones: card.activationZones,
              createdAt: card.createdAt,
              updatedAt: new Date().toISOString()
            }
          : card
      )
    );
    setView({ name: 'detail', cardId });
  }

  function addActivationZone(cardId: string, position: Coordinates) {
    const now = new Date().toISOString();
    persist(
      cards.map((card) => {
        if (card.id !== cardId) return card;
        const activationZones = card.activationZones ?? [];
        return {
          ...card,
          activationZones: [
            ...activationZones,
            {
              id: createId(),
              label: `Lieu ${activationZones.length + 1}`,
              latitude: position.latitude,
              longitude: position.longitude,
              radiusMeters: 250,
              createdAt: now,
              updatedAt: now
            }
          ],
          updatedAt: now
        };
      })
    );
  }

  function updateActivationZoneRadius(cardId: string, zoneId: string, radiusMeters: number) {
    const now = new Date().toISOString();
    persist(
      cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              activationZones: (card.activationZones ?? []).map((zone) =>
                zone.id === zoneId ? { ...zone, radiusMeters, updatedAt: now } : zone
              ),
              updatedAt: now
            }
          : card
      )
    );
  }

  function deleteActivationZone(cardId: string, zoneId: string) {
    const now = new Date().toISOString();
    persist(
      cards.map((card) => {
        if (card.id !== cardId) return card;
        const remaining = (card.activationZones ?? [])
          .filter((zone) => zone.id !== zoneId)
          .map((zone, index) => {
            const nextLabel = `Lieu ${index + 1}`;
            if (zone.label === nextLabel) return zone;
            return { ...zone, label: nextLabel, updatedAt: now };
          });
        return { ...card, activationZones: remaining, updatedAt: now };
      })
    );
  }

  function deleteCard(cardId: string) {
    persist(cards.filter((card) => card.id !== cardId));
    setView({ name: 'wallet' });
  }

  function downloadBackup() {
    const blob = new Blob([createCardsBackup(cards)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loyalty-cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStorageMessage('Backup telecharge.');
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const parsed = parseCardsBackup(await file.text());
    if (!parsed.ok) {
      setStorageMessage(parsed.message);
      return;
    }

    setStorageMessage('');
    setPendingBackup(parsed.cards);
  }

  function confirmPendingBackup() {
    if (!pendingBackup) return;
    persist(pendingBackup);
    setPendingBackup(null);
    setStorageMessage('Backup importe.');
  }

  function cancelPendingBackup() {
    setPendingBackup(null);
    setStorageMessage('Import annule.');
  }

  function openWallet() {
    setView({ name: 'wallet' });
  }

  return (
    <div className="app-shell">
      <AppHeader onHome={openWallet} />
      {storageMessage ? (
        <p className="notice" role="status">
          {storageMessage}
        </p>
      ) : null}

      {view.name === 'wallet' ? (
        <main className="page">
          <section className="wallet-hero">
            <p className="eyebrow">Wallet local</p>
            <h1>Mes cartes</h1>
            <label className="search-field">
              <span>Rechercher</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une enseigne"
              />
            </label>
            {hasActivationZones ? (
              <button
                className="secondary-button"
                type="button"
                disabled={currentPosition.status === 'checking'}
                onClick={currentPosition.requestPosition}
              >
                {currentPosition.status === 'checking' ? 'Localisation…' : 'Rafraichir ma position GPS'}
              </button>
            ) : null}
          </section>

          {hasActivationZones ? (
            <NearbyCardsSection
              matches={nearbyCards}
              onOpenCard={openCard}
              onRetry={currentPosition.requestPosition}
              status={currentPosition.status}
            />
          ) : null}

          {cards.length === 0 ? (
            <EmptyState onAdd={() => setView({ name: 'add' })} />
          ) : (
            <section className="cards-grid" aria-label="Cartes de fidelite">
              {filteredCards.map((card) => (
                <CardPreview key={card.id} card={card} onOpen={() => openCard(card.id)} />
              ))}
            </section>
          )}
        </main>
      ) : null}

      {view.name === 'add' ? (
        <CardForm title="Ajouter une carte" onCancel={() => setView({ name: 'wallet' })} onSubmit={createCard} />
      ) : null}

      {view.name === 'edit' ? (
        <CardForm
          title="Modifier la carte"
          card={view.card}
          onCancel={() => setView({ name: 'detail', cardId: view.card.id })}
          onSubmit={(input) => updateCard(view.card.id, input)}
        />
      ) : null}

      {view.name === 'detail' && selectedCard ? (
        <CardDetail
          card={selectedCard}
          currentPosition={currentPosition.position}
          onAddActivationZone={addActivationZone}
          onBack={() => setView({ name: 'wallet' })}
          onDelete={() => deleteCard(selectedCard.id)}
          onDeleteActivationZone={deleteActivationZone}
          onEdit={() => setView({ name: 'edit', card: selectedCard })}
          onUpdateActivationZoneRadius={updateActivationZoneRadius}
        />
      ) : null}

      {view.name === 'settings' ? (
        <main className="page settings-page">
          <section className="settings-hero">
            <p className="eyebrow">Parametres</p>
            <h1>Sauvegarde</h1>
            <p>Exporte tes cartes dans un fichier JSON, ou restaure un backup valide sur cet appareil.</p>
          </section>

          <section className="settings-panel" aria-label="Backup des donnees">
            <div>
              <h2>Backup JSON</h2>
              <p className="helper">
                Le fichier contient une version de format et toutes les cartes locales actuellement enregistrees.
              </p>
            </div>

            <div className="settings-actions">
              <button className="primary-button" type="button" onClick={downloadBackup}>
                Telecharger le backup
              </button>
              <label className="import-button">
                <span>Importer un backup JSON</span>
                <input type="file" accept="application/json,.json" onChange={importBackup} />
              </label>
            </div>

            {pendingBackup ? (
              <div className="confirm-box" role="alertdialog" aria-labelledby="backup-confirm-title">
                <p id="backup-confirm-title">
                  Importer ce backup remplacera toutes les cartes enregistrees sur cet appareil. Continuer ?
                </p>
                <button className="primary-button" type="button" onClick={confirmPendingBackup}>
                  Confirmer l'import
                </button>
                <button className="tertiary-button" type="button" onClick={cancelPendingBackup}>
                  Annuler
                </button>
              </div>
            ) : null}
          </section>
        </main>
      ) : null}

      <nav className="bottom-nav" aria-label="Navigation principale">
        <button
          className={view.name === 'wallet' || view.name === 'detail' ? 'active' : ''}
          type="button"
          onClick={openWallet}
        >
          <Home size={20} strokeWidth={2.2} aria-hidden="true" />
          <span>Accueil</span>
        </button>
        <button className={view.name === 'add' ? 'active' : ''} type="button" onClick={() => setView({ name: 'add' })}>
          <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
          <span>Ajouter</span>
        </button>
        <button
          className={view.name === 'settings' ? 'active' : ''}
          type="button"
          onClick={() => setView({ name: 'settings' })}
        >
          <Settings size={20} strokeWidth={2.2} aria-hidden="true" />
          <span>Parametres</span>
        </button>
      </nav>
    </div>
  );
}
