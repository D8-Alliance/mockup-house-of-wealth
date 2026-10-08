import { cardImageQuality, cardRegion, cardRetryMessage } from './card-quality';
import { RgbImage } from './face-engine';

function image(width: number, height: number, pixel: (x: number, y: number) => number): RgbImage {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data.fill(pixel(x, y), (y * width + x) * 3, (y * width + x) * 3 + 3);
  return { data, width, height };
}

describe('ID card image quality', () => {
  it('crops the card guide area with a margin', () => {
    expect(cardRegion({ width: 1000, height: 1000 })).toEqual({ left: 120, top: 150, width: 760, height: 700 });
  });

  it('tells sharp text from a blurred or empty card', () => {
    const flat = image(200, 200, () => 128);
    const text = image(200, 200, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 30 : 220));
    expect(cardImageQuality(flat, cardRegion(flat)).sharpness).toBe(0);
    expect(cardImageQuality(text, cardRegion(text)).sharpness).toBeGreaterThan(1000);
  });

  it('measures darkness and glare', () => {
    const dark = image(100, 100, () => 20);
    const shiny = image(100, 100, (x) => (x < 50 ? 255 : 120));
    expect(cardImageQuality(dark, cardRegion(dark)).brightness).toBe(20);
    expect(cardImageQuality(shiny, cardRegion(shiny)).glare).toBeGreaterThan(0.4);
  });

  it('explains what to fix, most basic problem first', () => {
    const good = { brightness: 150, glare: 0, sharpness: 500 };
    expect(cardRetryMessage('NOT_FOUND', { ...good, brightness: 30 })).toMatch(/too dark/);
    expect(cardRetryMessage('NOT_FOUND', { ...good, glare: 0.2 })).toMatch(/glare/);
    expect(cardRetryMessage('NOT_FOUND', { ...good, sharpness: 10 })).toMatch(/blurry/);
    expect(cardRetryMessage('MISMATCH', good)).toMatch(/could not be matched/);
    expect(cardRetryMessage('NOT_FOUND', good)).toMatch(/could not be read/);
  });
});
