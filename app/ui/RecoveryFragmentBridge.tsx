"use client";

import { useEffect } from "react";

export function RecoveryFragmentBridge() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token") || "";
    if (fragment.get("type") !== "recovery" || !accessToken) return;

    // Remove the credential from the address bar before any network or user action.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    fetch("/api/auth/recovery-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ accessToken }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("invalid_recovery_session");
        window.location.replace("/update-password");
      })
      .catch(() => {
        window.location.replace("/update-password?error=invalid_or_expired");
      });
  }, []);

  return null;
}
