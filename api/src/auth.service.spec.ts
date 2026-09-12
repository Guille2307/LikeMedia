import { scryptSync } from 'node:crypto';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const original = {
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_NAME: process.env.ADMIN_NAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('issues and verifies an admin JWT with the configured identity', () => {
    process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters';
    process.env.ADMIN_EMAIL = 'info@likemedia.es';
    process.env.ADMIN_NAME = 'Dysmar Vidal';
    process.env.ADMIN_PASSWORD = 'test-password-123';
    delete process.env.ADMIN_PASSWORD_HASH;

    const auth = new AuthService();
    const result = auth.login({ email: 'INFO@LIKEMEDIA.ES', password: 'test-password-123' });

    expect(result.tokenType).toBe('Bearer');
    expect(result.user).toEqual({ email: 'info@likemedia.es', name: 'Dysmar Vidal', role: 'admin' });
    expect(auth.isValidToken(result.accessToken)).toBe(true);
    expect(auth.isValidToken(`${result.accessToken}x`)).toBe(false);
  });

  it('accepts the scrypt password hash format', () => {
    process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters';
    process.env.ADMIN_EMAIL = 'info@likemedia.es';
    process.env.ADMIN_NAME = 'Dysmar Vidal';
    delete process.env.ADMIN_PASSWORD;
    const salt = Buffer.from('test-salt-123456');
    const hash = scryptSync('test-password-123', salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
    process.env.ADMIN_PASSWORD_HASH = `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;

    const auth = new AuthService();
    expect(auth.login({ email: 'info@likemedia.es', password: 'test-password-123' }).user.name).toBe('Dysmar Vidal');
    expect(() => auth.login({ email: 'info@likemedia.es', password: 'wrong-password' })).toThrow('Correo o contraseña no válidos.');
  });
});
