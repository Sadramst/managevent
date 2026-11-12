"use client";

import { useEffect, useState } from "react";
import { contact as defaultContact } from "../lib/site";

export interface ContactSettings {
  contactEmail: string;
  contactPhone: string;
  notificationEmail: string;
  coordinatorName: string;
  companyName: string;
  businessAbn: string;
  operatingArea: string;
}

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  contactEmail: defaultContact.email || "appilico.au@gmail.com",
  contactPhone: defaultContact.phone || "",
  notificationEmail: defaultContact.email || "appilico.au@gmail.com",
  coordinatorName: "Appilico Team",
  companyName: "Appilico",
  businessAbn: "51 824 753 556",
  operatingArea: "Perth Metro & Swan Valley, WA",
};

export const SETTINGS_STORAGE_KEY = "managevent_admin_settings";
export const SETTINGS_EVENT_NAME = "managevent:settings-changed";

export function getStoredContactSettings(): ContactSettings {
  if (typeof window === "undefined") return DEFAULT_CONTACT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_CONTACT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONTACT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_CONTACT_SETTINGS;
  }
}

export function saveContactSettings(settings: ContactSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT_NAME, { detail: settings }));
  } catch {
    // ignore quota/storage errors
  }
}

export function DynamicContactEmail({
  fallback,
  asLink = false,
  className,
}: {
  fallback?: string;
  asLink?: boolean;
  className?: string;
}) {
  const [email, setEmail] = useState<string>(fallback ?? DEFAULT_CONTACT_SETTINGS.contactEmail);

  useEffect(() => {
    const sync = () => {
      const s = getStoredContactSettings();
      setEmail(s.contactEmail || DEFAULT_CONTACT_SETTINGS.contactEmail);
    };
    sync();
    window.addEventListener(SETTINGS_EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (asLink) {
    return (
      <a href={`mailto:${email}`} className={className}>
        <bdi>{email}</bdi>
      </a>
    );
  }

  return <bdi className={className}>{email}</bdi>;
}

export function DynamicContactPhone({
  fallback,
  asLink = false,
  className,
}: {
  fallback?: string;
  asLink?: boolean;
  className?: string;
}) {
  const [phone, setPhone] = useState<string>(fallback ?? DEFAULT_CONTACT_SETTINGS.contactPhone);

  useEffect(() => {
    const sync = () => {
      const s = getStoredContactSettings();
      setPhone(s.contactPhone || "");
    };
    sync();
    window.addEventListener(SETTINGS_EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!phone) return null;

  if (asLink) {
    return (
      <a href={`tel:${phone}`} className={className}>
        <bdi>{phone}</bdi>
      </a>
    );
  }

  return <bdi className={className}>{phone}</bdi>;
}

export function DynamicContactPhoneRow({
  fallback,
}: {
  fallback?: string;
}) {
  const [phone, setPhone] = useState<string>(fallback ?? DEFAULT_CONTACT_SETTINGS.contactPhone);

  useEffect(() => {
    const sync = () => {
      const s = getStoredContactSettings();
      setPhone(s.contactPhone || "");
    };
    sync();
    window.addEventListener(SETTINGS_EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!phone) return null;

  return (
    <p>
      Phone:{" "}
      <a href={`tel:${phone}`}>
        <bdi>{phone}</bdi>
      </a>
    </p>
  );
}

export function DynamicContactPhoneWithSeparator({
  fallback,
}: {
  fallback?: string;
}) {
  const [phone, setPhone] = useState<string>(fallback ?? DEFAULT_CONTACT_SETTINGS.contactPhone);

  useEffect(() => {
    const sync = () => {
      const s = getStoredContactSettings();
      setPhone(s.contactPhone || "");
    };
    sync();
    window.addEventListener(SETTINGS_EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!phone) return null;

  return (
    <>
      {" "}
      ·{" "}
      <a href={`tel:${phone}`}>
        <bdi>{phone}</bdi>
      </a>
    </>
  );
}
