import { Window } from 'happy-dom';
import { afterAll } from 'vitest';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const window = new Window();

Object.assign(globalThis, {
  DocumentFragment: window.DocumentFragment,
  Element: window.Element,
  File: window.File,
  HTMLElement: window.HTMLElement,
  HTMLCanvasElement: window.HTMLCanvasElement,
  HTMLImageElement: window.HTMLImageElement,
  Image: window.Image,
  Node: window.Node,
  Storage: MemoryStorage,
  document: window.document,
  localStorage: new MemoryStorage()
});

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: window.navigator
});

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: window
});

afterAll(async () => {
  await window.happyDOM.close();
});
