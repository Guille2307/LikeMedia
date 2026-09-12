import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export interface AdminLoginInput {
  email?: unknown;
  password?: unknown;
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin';
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AdminUser;
}

interface AdminJwtPayload extends AdminUser {
  sub: 'admin';
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const MAX_TOKEN_LENGTH = 4096;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class AuthService {
  /**
   * JWT authentication for the private admin area.
   *
   * ADMIN_PASSWORD_HASH is preferred. ADMIN_PASSWORD is kept as a migration
   * fallback so Railway can be configured without exposing a password in Git.
   */
  isConfigured(): boolean {
    return this.secret().length >= 32
      && this.email().length > 0
      && this.name().length > 0
      && (this.passwordHash().length > 0 || this.password().length >= 8);
  }

  login(input: AdminLoginInput = {}): AdminLoginResponse {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!email || !password) throw new BadRequestException('Correo y contraseña son obligatorios.');
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('El acceso por correo y contraseña aún no está configurado en el servidor.');
    }

    const passwordMatches = this.verifyPassword(password);
    if (email !== this.email() || !passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña no válidos.');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: AdminJwtPayload = {
      sub: 'admin',
      email: this.email(),
      name: this.name(),
      role: 'admin',
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    };
    const encodedHeader = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = base64url(JSON.stringify(payload));
    const content = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', this.secret()).update(content).digest();

    return {
      accessToken: `${content}.${base64url(signature)}`,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
      user: { email: payload.email, name: payload.name, role: payload.role },
    };
  }

  isValidToken(token?: string): boolean {
    if (!token || token.length > MAX_TOKEN_LENGTH || !this.isConfigured()) return false;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) return false;

    try {
      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const content = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = createHmac('sha256', this.secret()).update(content).digest();
      const providedSignature = Buffer.from(encodedSignature, 'base64url');
      if (!safeEqual(expectedSignature, providedSignature)) return false;

      const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as { alg?: string; typ?: string };
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<AdminJwtPayload>;
      const now = Math.floor(Date.now() / 1000);
      return header.alg === 'HS256'
        && header.typ === 'JWT'
        && payload.sub === 'admin'
        && payload.role === 'admin'
        && payload.email === this.email()
        && typeof payload.iat === 'number'
        && payload.iat <= now + 60
        && typeof payload.exp === 'number'
        && payload.exp > now;
    } catch {
      return false;
    }
  }

  private verifyPassword(password: string): boolean {
    const encodedHash = this.passwordHash();
    if (encodedHash) return this.verifyEncodedHash(password, encodedHash);

    const configuredPassword = this.password();
    return configuredPassword.length > 0 && safeEqual(Buffer.from(password), Buffer.from(configuredPassword));
  }

  private verifyEncodedHash(password: string, encodedHash: string): boolean {
    const parts = encodedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const cost = Number(parts[1]);
    const blockSize = Number(parts[2]);
    const parallelization = Number(parts[3]);
    if (!Number.isInteger(cost) || cost < 1024 || cost > 1_048_576 || (cost & (cost - 1)) !== 0
      || !Number.isInteger(blockSize) || blockSize < 1 || blockSize > 32
      || !Number.isInteger(parallelization) || parallelization < 1 || parallelization > 8) return false;

    try {
      const salt = Buffer.from(parts[4], 'base64url');
      const expected = Buffer.from(parts[5], 'base64url');
      if (salt.length < 8 || salt.length > 64 || expected.length < 32 || expected.length > 128) return false;
      const actual = scryptSync(password, salt, expected.length, {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: Math.max(32 * 1024 * 1024, 128 * cost * blockSize + 128 * cost * parallelization + 1024),
      });
      return safeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  private secret(): string { return process.env.JWT_SECRET?.trim() ?? ''; }
  private email(): string { return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ''; }
  private name(): string { return process.env.ADMIN_NAME?.trim() ?? ''; }
  private password(): string { return process.env.ADMIN_PASSWORD ?? ''; }
  private passwordHash(): string { return process.env.ADMIN_PASSWORD_HASH?.trim() ?? ''; }
}
