import { IStorageAdapter } from "../IStorageAdapter";

/**
 * Temporary implementation of a CouchDB storage adapter as the one in works is not 100% functional.
 */
export class CouchdbLocalStorageAdapter implements IStorageAdapter {
  private dbName: string;
  private couchdbUrl: string;

  private readonly embeddedPort: number = 5984;

  constructor(couchdbUrl: string = `http://localhost:${this.embeddedPort}`, couchdbName: string = "localstorage") {
    this.couchdbUrl = couchdbUrl;
    this.dbName = couchdbName;
  }

  length(): number {
    throw new Error("Method not implemented.");
  }

  getAllItems(): Promise<Record<string, string | null>> {
    throw new Error("Method not implemented.");
  }

  async init(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async setItem(key: string, value: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async getItem(key: string): Promise<string | null> {
    throw new Error("Method not implemented.");
  }

  async removeItem(key: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async clear(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}