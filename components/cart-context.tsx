"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number; // FCFA, prix unitaire figé à l'ajout
  image?: string;
  quantity: number;
  stock: number; // stock connu à l'ajout (garde-fou côté UI)
};

type CartState = { lines: CartLine[] };

type Action =
  | { type: "ADD"; line: Omit<CartLine, "quantity">; qty: number }
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "REMOVE"; productId: string }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; state: CartState };

const STORAGE_KEY = "jardin-eiden-cart-v1";

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ADD": {
      const existing = state.lines.find(
        (l) => l.productId === action.line.productId
      );
      if (existing) {
        const qty = Math.min(
          existing.quantity + action.qty,
          action.line.stock
        );
        return {
          lines: state.lines.map((l) =>
            l.productId === action.line.productId ? { ...l, quantity: qty } : l
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          { ...action.line, quantity: Math.min(action.qty, action.line.stock) },
        ],
      };
    }
    case "SET_QTY": {
      if (action.qty <= 0) {
        return {
          lines: state.lines.filter((l) => l.productId !== action.productId),
        };
      }
      return {
        lines: state.lines.map((l) =>
          l.productId === action.productId
            ? { ...l, quantity: Math.min(action.qty, l.stock) }
            : l
        ),
      };
    }
    case "REMOVE":
      return {
        lines: state.lines.filter((l) => l.productId !== action.productId),
      };
    case "CLEAR":
      return { lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });

  // Hydratation depuis localStorage au montage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && Array.isArray(parsed.lines)) {
          dispatch({ type: "HYDRATE", state: parsed });
        }
      }
    } catch {
      /* localStorage indisponible : panier en mémoire */
    }
  }, []);

  // Persistance
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.quantity, 0);
    const subtotal = state.lines.reduce(
      (s, l) => s + l.price * l.quantity,
      0
    );
    return {
      lines: state.lines,
      count,
      subtotal,
      add: (line, qty = 1) => dispatch({ type: "ADD", line, qty }),
      setQty: (productId, qty) =>
        dispatch({ type: "SET_QTY", productId, qty }),
      remove: (productId) => dispatch({ type: "REMOVE", productId }),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
