import { RgbImage } from './face-engine';

/**
 * The ID card step must read the card clearly: the number on the card has to match the
 * application. These helpers crop the card area for OCR and, when reading fails, say what
 * to fix. The quality figures only choose the message; they never accept or reject a frame.
 */

export interface CardRegion { left: number; top: number; width: number; height: number }

export interface CardQuality {
  /** Mean grey level 0-255. */
  brightness: number;
  /** Share of near-white pixels (reflections on the card's laminate). */
  glare: number;
  /** Variance of the Laplacian: low means blurred or out of focus. */
  sharpness: number;
}

/** The card guide drawn over the camera (x 18-82 %, y 22-78 %), with a margin for a card held slightly off. */
export function cardRegion(image: Pick<RgbImage, 'width' | 'height'>): CardRegion {
  const left = Math.round(image.width * 0.12);
  const top = Math.round(image.height * 0.15);
  return { left, top, width: Math.round(image.width * 0.88) - left, height: Math.round(image.height * 0.85) - top };
}

const grey = (image: RgbImage, x: number, y: number) => {
  const i = (y * image.width + x) * 3;
  return 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
};

export function cardImageQuality(image: RgbImage, region: CardRegion): CardQuality {
  // Sample every other pixel: plenty for these figures and fast on a 1920-wide frame.
  const step = 2;
  let sum = 0;
  let bright = 0;
  let count = 0;
  let lapSum = 0;
  let lapSq = 0;
  let lapCount = 0;
  const x1 = region.left + region.width;
  const y1 = region.top + region.height;
  for (let y = region.top; y < y1; y += step) {
    for (let x = region.left; x < x1; x += step) {
      const g = grey(image, x, y);
      sum += g;
      if (g >= 245) bright += 1;
      count += 1;
      if (x >= step && y >= step && x + step < image.width && y + step < image.height) {
        const lap = grey(image, x - step, y) + grey(image, x + step, y) + grey(image, x, y - step) + grey(image, x, y + step) - 4 * g;
        lapSum += lap;
        lapSq += lap * lap;
        lapCount += 1;
      }
    }
  }
  const mean = lapCount ? lapSum / lapCount : 0;
  return {
    brightness: count ? sum / count : 0,
    glare: count ? bright / count : 0,
    sharpness: lapCount ? lapSq / lapCount - mean * mean : 0,
  };
}

export const CARD_QUALITY_HINTS = { minBrightness: 60, maxGlare: 0.06, minSharpness: 80 } as const;

/** What the applicant should change when the ID number could not be read from the card. */
export function cardRetryMessage(idNumber: 'MATCH' | 'MISMATCH' | 'NOT_FOUND', quality: CardQuality): string {
  if (quality.brightness < CARD_QUALITY_HINTS.minBrightness) return 'The card is too dark to read. Move to a brighter place and try again.';
  if (quality.glare > CARD_QUALITY_HINTS.maxGlare) return 'There is glare on the card. Tilt it slightly away from the light so the text is not shiny.';
  if (quality.sharpness < CARD_QUALITY_HINTS.minSharpness) return 'The card is blurry. Hold it still, flat and close to the camera until the text is sharp.';
  if (idNumber === 'MISMATCH') return 'The number on the card could not be matched to the document number in your form. Show the same ID card you entered, or correct the form.';
  return 'The ID number on the card could not be read. Hold the FRONT of the card inside the frame, close enough to fill it, flat and in focus.';
}
