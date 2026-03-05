import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type PocketBaseType from 'pocketbase';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PocketBase = require('pocketbase/cjs');

@Injectable()
export class PocketBaseService implements OnModuleInit, OnModuleDestroy {
  private client: PocketBaseType;
  private authInFlight: Promise<void> | null = null;

  constructor() {
    const url = process.env.POCKETBASE_URL || 'http://localhost:8090';
    this.client = new PocketBase(url);
  }

  async onModuleInit() {
    try {
      await this.ensureSuperuserAuth();
    } catch (err) {
      console.warn(
        'PocketBase admin auth failed (check POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD):',
        (err as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    this.client.authStore.clear();
  }

  get pb(): PocketBaseType {
    return this.client;
  }

  collection(name: string) {
    return this.client.collection(name);
  }

  async ensureSuperuserAuth(): Promise<void> {
    const email = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@mango.travel';
    const password = process.env.POCKETBASE_ADMIN_PASSWORD || '';

    if (!password) return;
    if (this.client.authStore.isValid) return;

    if (!this.authInFlight) {
      this.authInFlight = this.authWithFallback(email, password).finally(() => {
        this.authInFlight = null;
      });
    }
    await this.authInFlight;
  }

  private async authWithFallback(email: string, password: string): Promise<void> {
    try {
      const maybeAdmins = (this.client as any).admins;
      if (!maybeAdmins?.authWithPassword) {
        throw new Error('Legacy admins auth API is unavailable.');
      }
      await maybeAdmins.authWithPassword(email, password);
      return;
    } catch {
      await this.client.collection('_superusers').authWithPassword(email, password);
    }
  }
}
