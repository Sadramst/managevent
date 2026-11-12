"use client";

import { X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Tone } from "./Notice";
import { useUiCopy } from "./UiCopy";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

export interface ToastApi {
  /**
   * Shows a short confirmation ("Saved", "Link copied") that leaves by itself. For errors a
   * person must act on, prefer an inline `Notice` next to the control: a toast can be missed.
   */
  show(message: string, options?: { tone?: Tone }): void;
}

const NOOP: ToastApi = { show: () => undefined };
const ToastContext = createContext<ToastApi>(NOOP);

/** `const toast = useToast(); toast.show(copy.saved, { tone: "success" });` */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const MAX_VISIBLE = 3;
const DURATION_MS = 5000;
const DURATION_ERROR_MS = 9000;

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Mounted once in the root layout, inside `UiCopyProvider`. Toasts render in a polite live region, so screen readers
 * announce them without stealing focus; each can be dismissed and leaves after a few seconds.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const { ui } = useUiCopy();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, options) => {
      const id = nextId.current;
      nextId.current += 1;
      const tone = options?.tone ?? "info";
      setItems((current) => [...current, { id, message, tone }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "danger" ? DURATION_ERROR_MS : DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-label={ui.notifications}>
        {items.map((item) => (
          <div key={item.id} className="toast" data-tone={item.tone}>
            <p>{item.message}</p>
            <button
              type="button"
              className="icon-button"
              aria-label={ui.dismiss}
              onClick={() => dismiss(item.id)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
