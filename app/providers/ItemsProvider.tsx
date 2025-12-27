import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Item = {
  id: string;
  name: string;
  photoUri?: string;
  location?: string | null;
  createdAt?: number;
  foundAt?: number;

  // New (Phase 1 foundation for “Visual Breadcrumbs”)
  // If present, photos[0] should be the original/main photo.
  photos?: string[];

  // Existing feature
  foundCount?: number;
};

type ItemsContextValue = {
  items: Item[];
  getItemById: (id: string) => Item | undefined;
  replaceItem: (item: Item) => Promise<void>;
};

const ItemsContext = createContext<ItemsContextValue | null>(null);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  // Minimal in-memory store for now.
  // This keeps the app compiling and stable; persistence can be wired later.
  const [items, setItems] = useState<Item[]>([]);

  const getItemById = useCallback(
    (id: string) => items.find((it) => it.id === id),
    [items],
  );

  const replaceItem = useCallback(async (next: Item) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === next.id);
      if (idx === -1) return prev;
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  }, []);

  const value = useMemo(
    () => ({
      items,
      getItemById,
      replaceItem,
    }),
    [items, getItemById, replaceItem],
  );

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) {
    throw new Error("useItems must be used within ItemsProvider");
  }
  return ctx;
}
