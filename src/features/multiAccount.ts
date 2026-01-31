import { logger } from '../utils/logger.js';
import { MoltbookClient } from '../moltbook/client.js';

export interface Account {
  id: string;
  name: string;
  baseUrl: string;
  authToken: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  metadata?: {
    username?: string;
    email?: string;
    avatar?: string;
  };
}

export class MultiAccountManager {
  private accounts: Map<string, Account> = new Map();
  private activeAccountId: string | null = null;
  private clients: Map<string, MoltbookClient> = new Map();

  addAccount(account: Omit<Account, 'id' | 'createdAt' | 'isActive'>): string {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAccount: Account = {
      ...account,
      id,
      createdAt: new Date(),
      isActive: false,
    };

    this.accounts.set(id, newAccount);
    this.clients.set(id, new MoltbookClient(account.baseUrl, account.authToken));

    logger.info({ accountId: id, name: account.name }, 'Account added');
    return id;
  }

  removeAccount(id: string): boolean {
    if (this.activeAccountId === id) {
      this.activeAccountId = null;
    }

    const removed = this.accounts.delete(id);
    this.clients.delete(id);

    if (removed) {
      logger.info({ accountId: id }, 'Account removed');
    }

    return removed;
  }

  setActiveAccount(id: string): boolean {
    const account = this.accounts.get(id);
    if (!account) {
      logger.warn({ accountId: id }, 'Account not found');
      return false;
    }

    // Deactivate all accounts
    this.accounts.forEach((acc) => {
      acc.isActive = false;
    });

    // Activate selected account
    account.isActive = true;
    account.lastUsed = new Date();
    this.activeAccountId = id;

    logger.info({ accountId: id, name: account.name }, 'Active account changed');
    return true;
  }

  getActiveAccount(): Account | null {
    if (!this.activeAccountId) return null;
    return this.accounts.get(this.activeAccountId) || null;
  }

  getActiveClient(): MoltbookClient | null {
    if (!this.activeAccountId) return null;
    return this.clients.get(this.activeAccountId) || null;
  }

  getAccount(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  updateAccount(
    id: string,
    updates: Partial<Omit<Account, 'id' | 'createdAt'>>
  ): boolean {
    const account = this.accounts.get(id);
    if (!account) return false;

    Object.assign(account, updates);

    // Update client if credentials changed
    if (updates.baseUrl || updates.authToken) {
      this.clients.set(
        id,
        new MoltbookClient(
          updates.baseUrl || account.baseUrl,
          updates.authToken || account.authToken
        )
      );
    }

    logger.info({ accountId: id }, 'Account updated');
    return true;
  }

  exportAccounts(): string {
    const accounts = Array.from(this.accounts.values()).map((acc) => ({
      ...acc,
      authToken: '***REDACTED***', // Don't export tokens
    }));
    return JSON.stringify(accounts, null, 2);
  }

  importAccounts(data: string, includeTokens = false): number {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected array');
      }

      let imported = 0;
      parsed.forEach((acc) => {
        if (includeTokens && acc.authToken && acc.authToken !== '***REDACTED***') {
          this.addAccount({
            name: acc.name,
            baseUrl: acc.baseUrl,
            authToken: acc.authToken,
            metadata: acc.metadata,
          });
          imported++;
        }
      });

      logger.info({ count: imported }, 'Accounts imported');
      return imported;
    } catch (error) {
      logger.error({ error }, 'Failed to import accounts');
      throw new Error('Invalid account data format');
    }
  }
}
