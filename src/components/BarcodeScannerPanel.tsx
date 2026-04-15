import { BarcodeScanner, type DetectedBarcode } from 'react-barcode-scanner';
import 'react-barcode-scanner/polyfill';
import { useEffect } from 'react';

type Props = {
  onClose: () => void;
  onDetected: (value: string) => void;
  onError: (message: string) => void;
};

const CAMERA_ERROR_MESSAGE = "Impossible d'utiliser la camera. Saisissez le numero manuellement.";
const LOG_PREFIX = '[BarcodeScanner]';
const SCANNER_OPTIONS = {
  delay: 250,
  formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar']
};

function formatBoundingBox(candidate: Partial<DetectedBarcode>) {
  if (!candidate.boundingBox) return undefined;

  return {
    height: candidate.boundingBox.height,
    width: candidate.boundingBox.width,
    x: candidate.boundingBox.x,
    y: candidate.boundingBox.y
  };
}

function formatCandidate(candidate: Partial<DetectedBarcode>, index: number) {
  return {
    boundingBox: formatBoundingBox(candidate),
    cornerPoints: candidate.cornerPoints,
    format: candidate.format,
    index,
    rawValue: candidate.rawValue,
    rawValueLength: candidate.rawValue?.length ?? 0
  };
}

export function BarcodeScannerPanel({ onClose, onDetected, onError }: Props) {
  useEffect(() => {
    console.debug(`${LOG_PREFIX} scanner opened`, {
      configuredOptions: SCANNER_OPTIONS,
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      isSecureContext: window.isSecureContext
    });

    if (!window.isSecureContext) {
      console.warn(`${LOG_PREFIX} insecure context`, { isSecureContext: window.isSecureContext });
      onError(CAMERA_ERROR_MESSAGE);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn(`${LOG_PREFIX} getUserMedia unavailable`);
      onError(CAMERA_ERROR_MESSAGE);
    }
  }, [onError]);

  const handleClose = () => {
    console.debug(`${LOG_PREFIX} scanner closed by user`);
    onClose();
  };

  return (
    <section className="scanner-panel" aria-labelledby="scanner-title">
      <div className="scanner-panel-header">
        <h2 id="scanner-title">Scanner le code-barres</h2>
        <button className="tertiary-button" type="button" onClick={handleClose}>
          Fermer le scanner
        </button>
      </div>
      <BarcodeScanner
        aria-label="Camera du scanner"
        onCapture={(barcodes: DetectedBarcode[]) => {
          console.debug(`${LOG_PREFIX} capture event`, {
            candidates: barcodes.map(formatCandidate),
            configuredFormats: SCANNER_OPTIONS.formats,
            count: barcodes.length,
            delay: SCANNER_OPTIONS.delay
          });

          const value = barcodes.find((barcode) => barcode.rawValue)?.rawValue;
          if (value) {
            console.debug(`${LOG_PREFIX} barcode selected`, { rawValue: value });
            onDetected(value);
          } else {
            console.warn(`${LOG_PREFIX} capture without rawValue`, { count: barcodes.length });
          }
        }}
        options={SCANNER_OPTIONS}
        onError={() => {
          console.warn(`${LOG_PREFIX} scanner error event`);
          onError(CAMERA_ERROR_MESSAGE);
        }}
        trackConstraints={{ facingMode: 'environment' }}
      />
    </section>
  );
}
