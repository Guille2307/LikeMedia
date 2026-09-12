import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import pg from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: pg.Pool;
  private connected = false;

  async onModuleInit(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return;

    this.pool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });

    try {
      await this.pool.query('SELECT 1');
      await this.createSchema();
      this.connected = true;
      this.logger.log('PostgreSQL conectado');
    } catch {
      await this.pool.end();
      this.pool = undefined;
      this.logger.warn('DATABASE_URL definida, pero PostgreSQL no está disponible; se usará memoria temporal.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  get isConnected(): boolean { return this.connected; }
  get status(): 'connected' | 'memory' { return this.connected ? 'connected' : 'memory'; }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<T> | null> {
    if (!this.pool) return null;
    return this.pool.query<T>(text, [...values]);
  }

  private async createSchema(): Promise<void> {
    await this.pool?.query(`
      CREATE TABLE IF NOT EXISTS service_packages (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        eyebrow TEXT NOT NULL,
        title TEXT NOT NULL,
        price_usd TEXT NOT NULL,
        price_eur TEXT NOT NULL,
        description TEXT NOT NULL,
        includes JSONB NOT NULL DEFAULT '[]'::jsonb,
        featured BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        provider TEXT NOT NULL,
        meeting_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_date_time_unique
        ON bookings (date, time);
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
}
