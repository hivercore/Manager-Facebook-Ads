import * as fs from 'fs';
import * as path from 'path';

interface StoredAccount {
  id: string;
  name: string;
  accessToken: string;
  accountId: string;
  createdAt: string;
  tokenExpiresAt?: number; // Timestamp in milliseconds when token expires
}

class AccountStorage {
  private accounts: Map<string, StoredAccount> = new Map();
  private storagePath: string;

  constructor() {
    // Create storage directory if it doesn't exist
    const storageDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    this.storagePath = path.join(storageDir, 'accounts.json');
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        const accountsArray: StoredAccount[] = JSON.parse(data);
        
        // Load accounts into memory
        accountsArray.forEach(account => {
          this.accounts.set(account.id, account);
        });
        
        console.log(`Loaded ${accountsArray.length} accounts from storage`);
      }
    } catch (error) {
      console.error('Error loading accounts from file:', error);
    }
  }

  private saveToFile(): void {
    try {
      const accountsArray = Array.from(this.accounts.values());
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify(accountsArray, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving accounts to file:', error);
    }
  }

  addAccount(account: Omit<StoredAccount, 'createdAt'>): StoredAccount {
    const storedAccount: StoredAccount = {
      ...account,
      createdAt: new Date().toISOString(),
    };
    this.accounts.set(account.id, storedAccount);
    this.saveToFile();
    return storedAccount;
  }

  getAccount(id: string): StoredAccount | undefined {
    return this.accounts.get(id);
  }

  getAccountByAccountId(accountId: string): StoredAccount | undefined {
    return Array.from(this.accounts.values()).find(acc => acc.accountId === accountId);
  }

  getAllAccounts(): StoredAccount[] {
    return Array.from(this.accounts.values());
  }

  deleteAccount(id: string): boolean {
    const deleted = this.accounts.delete(id);
    if (deleted) {
      this.saveToFile();
    }
    return deleted;
  }

  updateAccount(id: string, updates: Partial<StoredAccount>): StoredAccount | null {
    const account = this.accounts.get(id);
    if (!account) return null;

    const updatedAccount = { ...account, ...updates };
    this.accounts.set(id, updatedAccount);
    this.saveToFile();
    return updatedAccount;
  }

  // Helper to get access token for an account
  getAccessToken(accountId: string): string | null {
    const account = this.getAccountByAccountId(accountId);
    return account ? account.accessToken : null;
  }
}

export const accountStorage = new AccountStorage();
