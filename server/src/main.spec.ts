import { corsOrigins } from './main';

jest.mock('./app.module', () => ({ AppModule: class {} }));

describe('corsOrigins', () => {
  it('uses the configured list, trimmed and without trailing slashes', () => {
    expect(corsOrigins({ CORS_ORIGINS: 'https://how.example.my/, https://admin.example.my' } as NodeJS.ProcessEnv)).toEqual(['https://how.example.my', 'https://admin.example.my']);
  });

  it('allows only the local frontend when nothing is configured in development', () => {
    expect(corsOrigins({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000']);
  });

  it('refuses to start in production without a list, instead of accepting every website', () => {
    expect(() => corsOrigins({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow('CORS_ORIGINS must list');
  });
});
