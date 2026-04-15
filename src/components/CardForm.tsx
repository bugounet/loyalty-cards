import { useCallback, useState, type ClipboardEvent } from 'react';
import type { LoyaltyCard, LoyaltyCardInput } from '../types';
import { fileToLogoImage, urlToLogoImage, validateImageUrl } from '../utils/imageProcessing';
import { BarcodeScannerPanel } from './BarcodeScannerPanel';

type Props = {
  card?: LoyaltyCard;
  onCancel: () => void;
  onSubmit: (input: LoyaltyCardInput) => void;
  title: string;
};

const DEFAULT_ACCENT = '#0032b4';

export function CardForm({ card, onCancel, onSubmit, title }: Props) {
  const [accentColor, setAccentColor] = useState(card?.accentColor ?? DEFAULT_ACCENT);
  const [imageMessage, setImageMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(card?.logoDataUrl ?? '');
  const [loyaltyNumber, setLoyaltyNumber] = useState(card?.loyaltyNumber ?? '');
  const [name, setName] = useState(card?.name ?? '');
  const [note, setNote] = useState(card?.note ?? '');
  const [scannerMessage, setScannerMessage] = useState('');
  const [scannerMessageKind, setScannerMessageKind] = useState<'error' | 'status'>('status');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const canSave = name.trim().length > 0 && loyaltyNumber.trim().length > 0;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      setImageMessage('Preparation du logo...');
      const result = await fileToLogoImage(file);
      setLogoDataUrl(result.dataUrl);
      setSuggestedColors(result.dominantColors);
      setImageMessage('Logo ajoute.');
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "Impossible d'utiliser cette image.");
    }
  }

  async function handleUrl() {
    const validation = validateImageUrl(imageUrl);
    if (!validation.ok) {
      setImageMessage(validation.message);
      return;
    }

    try {
      setImageMessage('Chargement du logo...');
      const result = await urlToLogoImage(imageUrl);
      setLogoDataUrl(result.dataUrl);
      setSuggestedColors(result.dominantColors);
      setImageMessage('Logo ajoute.');
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : 'Impossible de charger cette image.');
    }
  }

  async function handleUrlFieldPaste(event: ClipboardEvent<HTMLInputElement>) {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    await handleFile(file);
  }

  function handleBarcodeDetected(value: string) {
    setLoyaltyNumber(value);
    setScannerMessage('Code detecte.');
    setScannerMessageKind('status');
    setScannerOpen(false);
  }

  const handleScannerError = useCallback((message: string) => {
    setScannerMessage(message);
    setScannerMessageKind('error');
  }, []);

  return (
    <main className="page form-page">
      <button className="tertiary-button back-button" type="button" onClick={onCancel}>
        Retour
      </button>
      <section className="form-shell">
        <p className="eyebrow">Carte locale</p>
        <h1>{title}</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            onSubmit({ accentColor, logoDataUrl, loyaltyNumber, name, note });
          }}
        >
          <label className="field">
            <span>Nom</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label className="field">
            <span>Numero de fidelite</span>
            <input value={loyaltyNumber} onChange={(event) => setLoyaltyNumber(event.target.value)} required />
          </label>
          <div className="scanner-tools">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setScannerMessage('');
                setScannerMessageKind('status');
                setScannerOpen(true);
              }}
            >
              Scanner
            </button>
            {scannerMessage ? (
              <p className="helper" role={scannerMessageKind === 'error' ? 'alert' : 'status'}>
                {scannerMessage}
              </p>
            ) : null}
          </div>
          {scannerOpen ? (
            <BarcodeScannerPanel
              onClose={() => setScannerOpen(false)}
              onDetected={handleBarcodeDetected}
              onError={handleScannerError}
            />
          ) : null}

          <label className="field">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </label>

          <label className="field color-field">
            <span>Couleur</span>
            <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
          </label>

          {suggestedColors.length > 0 ? (
            <div className="color-suggestions" role="group" aria-label="Couleurs suggerees">
              <span className="helper">Couleurs dominantes de l'image</span>
              <div className="color-suggestion-swatches">
                {suggestedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch${accentColor.toLowerCase() === color.toLowerCase() ? ' active' : ''}`}
                    aria-label={`Utiliser la couleur ${color}`}
                    style={{ background: color }}
                    onClick={() => setAccentColor(color)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="logo-tools">
            <label className="field">
              <span>Importer un logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
            <label className="field">
              <span>URL d'image</span>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                onPaste={(event) => void handleUrlFieldPaste(event)}
                placeholder="https://... ou data:image/..."
              />
            </label>
            <button className="secondary-button" type="button" onClick={() => void handleUrl()}>
              Charger l'image
            </button>
            {imageMessage ? (
              <p className="helper" role="status">
                {imageMessage}
              </p>
            ) : null}
          </div>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>
              Annuler
            </button>
            <button className="primary-button" type="submit" disabled={!canSave}>
              Enregistrer
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
