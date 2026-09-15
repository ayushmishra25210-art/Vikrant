const { PDFDocument, PDFName, PDFHexString } = require('pdf-lib');

const ATTRIBUTION_KEY = 'XAttributionData';

/**
 * Embeds a hidden attribution payload into a PDF's Info dictionary using a
 * non-standard, non-rendered key (XAttributionData). This does not alter any
 * visible page content — no watermark is drawn — and is invisible to a normal
 * PDF reader's page view. It is only recoverable by inspecting the document's
 * metadata/Info dictionary, which is exactly what the leak-investigation flow
 * does on an uploaded/leaked copy.
 *
 * A short marker is also written to the standard Keywords field as a secondary,
 * more tool-resilient recovery path (some pipelines strip nonstandard Info keys
 * but preserve Keywords).
 */
async function embedHiddenMetadata(pdfBytes, payload) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const jsonPayload = JSON.stringify(payload);

  let infoRef = pdfDoc.context.trailerInfo.Info;
  let infoDict = infoRef ? pdfDoc.context.lookup(infoRef) : undefined;
  if (!infoDict) {
    infoDict = pdfDoc.context.obj({});
    pdfDoc.context.trailerInfo.Info = pdfDoc.context.register(infoDict);
  }
  infoDict.set(PDFName.of(ATTRIBUTION_KEY), PDFHexString.fromText(jsonPayload));

  const existingKeywords = pdfDoc.getKeywords() || '';
  const marker = `ATTR-${payload.tokenId}`;
  pdfDoc.setKeywords(existingKeywords ? [existingKeywords, marker] : [marker]);

  return pdfDoc.save();
}

/**
 * Extracts the hidden attribution payload from a PDF (leaked copy under
 * investigation). Returns { found, payload, keywordMarker } — payload is null
 * if no attribution metadata is present (e.g. a document that was never
 * decrypted through this system, or one whose metadata was stripped).
 */
async function extractHiddenMetadata(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { updateMetadata: false, ignoreEncryption: true });

  let payload = null;
  const infoRef = pdfDoc.context.trailerInfo.Info;
  if (infoRef) {
    const infoDict = pdfDoc.context.lookup(infoRef);
    const val = infoDict && infoDict.get(PDFName.of(ATTRIBUTION_KEY));
    if (val) {
      try {
        const text = typeof val.decodeText === 'function' ? val.decodeText() : val.toString();
        payload = JSON.parse(text);
      } catch (err) {
        payload = null;
      }
    }
  }

  let keywordMarker = null;
  try {
    const keywords = pdfDoc.getKeywords();
    if (keywords) {
      const match = keywords.split(',').map((k) => k.trim()).find((k) => k.startsWith('ATTR-'));
      if (match) keywordMarker = match.replace('ATTR-', '');
    }
  } catch (err) {
    // no keywords present
  }

  return { found: Boolean(payload || keywordMarker), payload, keywordMarker, pageCount: pdfDoc.getPageCount() };
}

module.exports = { embedHiddenMetadata, extractHiddenMetadata };
