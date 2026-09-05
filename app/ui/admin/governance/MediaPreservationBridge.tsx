"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MediaPreservationInspectorPanel, MediaPreservationStatusStrip } from "./MediaPreservationProjection";

type ProjectionMounts = { status: HTMLElement | null; inspector: HTMLElement | null };

function projectionMount(
  root: HTMLElement,
  attribute: "preservationStatusHost" | "preservationInspectorHost",
  position: "prepend" | "append",
) {
  const selector = attribute === "preservationStatusHost"
    ? "[data-preservation-status-host]"
    : "[data-preservation-inspector-host]";
  const existing = root.querySelector<HTMLElement>(`:scope > ${selector}`);
  if (existing) return existing;
  const mount = document.createElement("div");
  mount.dataset[attribute] = "true";
  if (position === "prepend") root.prepend(mount);
  else root.append(mount);
  return mount;
}

function discoverPreservationMounts(): ProjectionMounts {
  const mediaMaster = document.querySelector<HTMLElement>(".media-vault-assets");
  const mediaRoot = mediaMaster?.closest<HTMLElement>("section");
  if (!mediaRoot) return { status: null, inspector: null };

  mediaRoot.id ||= "operations-media";
  mediaRoot.dataset.governedWorkspace = "media";
  mediaRoot.dataset.workspaceContract = "master-detail-v1";
  mediaMaster.setAttribute("data-governed-master", "true");

  const inspector = mediaRoot.querySelector<HTMLElement>(".media-vault-inspector");
  inspector?.setAttribute("data-governed-inspector", "true");

  return {
    status: projectionMount(mediaRoot, "preservationStatusHost", "prepend"),
    inspector: inspector ? projectionMount(inspector, "preservationInspectorHost", "append") : null,
  };
}

export function MediaPreservationBridge() {
  const [projections, setProjections] = useState<ProjectionMounts>({ status: null, inspector: null });

  useEffect(() => {
    const sync = () => {
      const next = discoverPreservationMounts();
      setProjections((current) => {
        const currentKey = `${current.status?.isConnected || false}:${current.inspector?.isConnected || false}`;
        const nextKey = `${next.status?.isConnected || false}:${next.inspector?.isConnected || false}`;
        return currentKey === nextKey && current.status === next.status && current.inspector === next.inspector
          ? current
          : next;
      });
    };

    const handle = window.setTimeout(sync, 0);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(handle);
      observer.disconnect();
    };
  }, []);

  return <>
    {projections.status ? createPortal(<MediaPreservationStatusStrip />, projections.status, "media-preservation-status") : null}
    {projections.inspector ? createPortal(<MediaPreservationInspectorPanel />, projections.inspector, "media-preservation-inspector") : null}
  </>;
}
