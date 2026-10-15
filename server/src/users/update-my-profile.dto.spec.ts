import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateMyProfileDto } from './update-my-profile.dto';

const errorsFor = async (avatarUrl: string) => (await validate(plainToInstance(UpdateMyProfileDto, { avatarUrl }))).map((error) => error.property);

describe('UpdateMyProfileDto avatarUrl', () => {
  it('accepts an https link, a small PNG/JPEG/WEBP image, or empty to clear', async () => {
    expect(await errorsFor('https://example.com/me.jpg')).toEqual([]);
    expect(await errorsFor('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toEqual([]);
    expect(await errorsFor('data:image/webp;base64,UklGRg==')).toEqual([]);
    expect(await errorsFor('')).toEqual([]);
  });

  it('refuses SVG, plain http and script links', async () => {
    expect(await errorsFor('data:image/svg+xml;base64,PHN2Zz4=')).toEqual(['avatarUrl']);
    expect(await errorsFor('http://example.com/me.jpg')).toEqual(['avatarUrl']);
    expect(await errorsFor('javascript:alert(1)')).toEqual(['avatarUrl']);
  });

  it('refuses an image too large for the request limit', async () => {
    expect(await errorsFor(`data:image/png;base64,${'A'.repeat(90_000)}`)).toEqual(['avatarUrl']);
  });
});
