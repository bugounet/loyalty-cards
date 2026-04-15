import { useLayoutEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  formatBarcodeValueForDisplay,
  getBarcodeFormatCandidates,
  normalizeBarcodeValue,
  type BarcodeFormat
} from '../utils/barcodeFormats';

type Props = {
  value: string;
};

type RenderState = { status: 'ready'; format: BarcodeFormat } | { status: 'fallback' };

const BARCODE_OPTIONS = {
  background: '#ffffff',
  displayValue: false,
  height: 96,
  lineColor: '#111111',
  margin: 0,
  width: 2
};

export function BarcodeDisplay({ value }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const normalizedValue = normalizeBarcodeValue(value);
  const displayValue = formatBarcodeValueForDisplay(value);
  const [renderState, setRenderState] = useState<RenderState>(
    normalizedValue ? { status: 'ready', format: 'CODE128' } : { status: 'fallback' }
  );

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !normalizedValue) {
      setRenderState({ status: 'fallback' });
      return;
    }

    for (const format of getBarcodeFormatCandidates(normalizedValue)) {
      try {
        svg.replaceChildren();
        JsBarcode(svg, normalizedValue, {
          ...BARCODE_OPTIONS,
          format
        });
        setRenderState({ status: 'ready', format });
        return;
      } catch {
        svg.replaceChildren();
      }
    }

    setRenderState({ status: 'fallback' });
  }, [normalizedValue]);

  return (
    <section className="barcode-panel" aria-label="Code-barres de la carte">
      <div className="barcode-surface">
        {renderState.status === 'ready' ? (
          <svg ref={svgRef} className="barcode-svg" role="img" aria-label={`Code-barres ${renderState.format}`} />
        ) : (
          <div className="barcode-fallback" role="alert">
            Code-barres indisponible. Presentez ce numero en caisse.
          </div>
        )}
        <p className="barcode-number">{displayValue || value}</p>
      </div>
    </section>
  );
}
