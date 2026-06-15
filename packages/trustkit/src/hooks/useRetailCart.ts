import { useState, useCallback, useMemo } from "react";
import type { BuildState } from "./useRetailPrompt";

export interface CartItem {
  name: string;
  price: number;
  slot?: string;
  isExtra: boolean;
}

export interface CartState {
  items: CartItem[];
  buildTotal: number;
  extrasTotal: number;
  total: number;
  isFinalized: boolean;
  addBuild: (build: BuildState) => void;
  addExtra: (name: string, price: number) => void;
  removeExtra: (name: string) => void;
  finalize: () => void;
  reset: () => void;
}

export function useRetailCart(): CartState {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);

  const addBuild = useCallback((build: BuildState) => {
    const buildItems: CartItem[] = Object.entries(build.slots)
      .filter(([, s]) => s.product)
      .map(([slot, s]) => ({
        name: s.product!,
        price: s.price ?? 0,
        slot,
        isExtra: false,
      }));
    setItems((prev) => {
      const extras = prev.filter((i) => i.isExtra);
      return [...buildItems, ...extras];
    });
  }, []);

  const addExtra = useCallback((name: string, price: number) => {
    setItems((prev) => {
      if (prev.some((i) => i.isExtra && i.name === name)) return prev;
      return [...prev, { name, price, isExtra: true }];
    });
  }, []);

  const removeExtra = useCallback((name: string) => {
    setItems((prev) => prev.filter((i) => !(i.isExtra && i.name === name)));
  }, []);

  const finalize = useCallback(() => setIsFinalized(true), []);

  const reset = useCallback(() => {
    setItems([]);
    setIsFinalized(false);
  }, []);

  const buildTotal = useMemo(
    () => items.filter((i) => !i.isExtra).reduce((s, i) => s + i.price, 0),
    [items],
  );
  const extrasTotal = useMemo(
    () => items.filter((i) => i.isExtra).reduce((s, i) => s + i.price, 0),
    [items],
  );

  return {
    items,
    buildTotal,
    extrasTotal,
    total: buildTotal + extrasTotal,
    isFinalized,
    addBuild,
    addExtra,
    removeExtra,
    finalize,
    reset,
  };
}
