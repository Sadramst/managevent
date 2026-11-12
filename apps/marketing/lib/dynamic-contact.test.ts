import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONTACT_SETTINGS,
  getStoredContactSettings,
  saveContactSettings,
  SETTINGS_EVENT_NAME,
  SETTINGS_STORAGE_KEY,
} from "../components/dynamic-contact";
import { buildLocalBusinessJsonLd, buildOrganizationJsonLd } from "./seo-schema";
import { contact } from "./site";

describe("Dynamic Contact & Admin Settings", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("defaults contact email to appilico.au@gmail.com and phone to empty string", () => {
    expect(contact.email).toBe("appilico.au@gmail.com");
    expect(contact.phone).toBe("");
    expect(DEFAULT_CONTACT_SETTINGS.contactEmail).toBe("appilico.au@gmail.com");
    expect(DEFAULT_CONTACT_SETTINGS.contactPhone).toBe("");
    expect(DEFAULT_CONTACT_SETTINGS.notificationEmail).toBe("appilico.au@gmail.com");
    expect(DEFAULT_CONTACT_SETTINGS.coordinatorName).toBe("Appilico Team");
  });

  it("retrieves defaults when localStorage has no saved overrides", () => {
    const settings = getStoredContactSettings();
    expect(settings.contactEmail).toBe("appilico.au@gmail.com");
    expect(settings.contactPhone).toBe("");
    expect(settings.companyName).toBe("Appilico");
  });

  it("persists dynamically changed settings to localStorage and dispatches custom event", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const updated = {
      ...DEFAULT_CONTACT_SETTINGS,
      contactEmail: "info@appilico.com.au",
      contactPhone: "08 9200 1234",
      coordinatorName: "Sarah Planner",
    };

    saveContactSettings(updated);

    expect(mockStore[SETTINGS_STORAGE_KEY]).toContain("info@appilico.com.au");
    expect(mockStore[SETTINGS_STORAGE_KEY]).toContain("08 9200 1234");
    expect(dispatchSpy).toHaveBeenCalled();

    const reloaded = getStoredContactSettings();
    expect(reloaded.contactEmail).toBe("info@appilico.com.au");
    expect(reloaded.contactPhone).toBe("08 9200 1234");
    expect(reloaded.coordinatorName).toBe("Sarah Planner");
  });

  it("builds valid JSON-LD schemas reflecting appilico.au@gmail.com and omitting empty telephone", () => {
    const org = buildOrganizationJsonLd();
    expect(org.email).toBe("appilico.au@gmail.com");
    expect("telephone" in org).toBe(false);

    const localBusiness = buildLocalBusinessJsonLd(["Perth CBD", "Swan Valley"]);
    expect(localBusiness.email).toBe("appilico.au@gmail.com");
    expect("telephone" in localBusiness).toBe(false);
  });
});
