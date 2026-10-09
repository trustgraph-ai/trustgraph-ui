import { useState, useEffect, useCallback } from "react";

export type VersionStatus =
  | { status: "current" }
  | { status: "patch-available"; version: string }
  | {
      status: "upgrade-available";
      upgrade: {
        template: string;
        version: string;
        description: string;
        announcement: string;
      };
    };

export interface VersionCheckResult {
  currentVersion: string | null;
  variantId: string | null;
  check: VersionStatus | null;
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
  showOverlay: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
}

const CHECK_URL = "/config-svc/api/check-version";
const DISMISSED_KEY = "trustgraph-version-dismissed";

function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function setDismissedVersion(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {}
}

export function useVersionCheck(): VersionCheckResult {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [check, setCheck] = useState<VersionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const vResp = await fetch("/config/version.json");
        if (!vResp.ok) {
          setLoading(false);
          return;
        }
        const vData = await vResp.json();
        const version = vData.version as string | undefined;
        const variant = vData["variant-id"] as string | undefined;
        if (!version) {
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setCurrentVersion(version);
          setVariantId(variant || null);
        }

        const params = new URLSearchParams({ version });
        if (variant) params.set("variant", variant);

        const cResp = await fetch(`${CHECK_URL}?${params}`);
        if (!cResp.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const cData = (await cResp.json()) as VersionStatus;

        if (cancelled) return;

        setCheck(cData);
        setLoading(false);

        if (cData.status !== "current") {
          const newVersion =
            cData.status === "patch-available"
              ? cData.version
              : cData.upgrade.version;
          const alreadyDismissed = getDismissedVersion() === newVersion;
          setDismissed(alreadyDismissed);
          if (!alreadyDismissed) {
            setShowOverlay(true);
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!check || check.status === "current") return;
    const ver =
      check.status === "patch-available"
        ? check.version
        : check.upgrade.version;
    setDismissedVersion(ver);
    setDismissed(true);
    setShowOverlay(false);
  }, [check]);

  const openOverlay = useCallback(() => setShowOverlay(true), []);
  const closeOverlay = useCallback(() => setShowOverlay(false), []);

  return {
    currentVersion,
    variantId,
    check,
    loading,
    dismissed,
    dismiss,
    showOverlay,
    openOverlay,
    closeOverlay,
  };
}
