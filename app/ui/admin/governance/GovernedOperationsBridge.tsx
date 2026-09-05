"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GovernedWorkspaceContractBanner, type GovernedWorkspaceKind } from "./GovernedWorkspace";

type Host = { element: HTMLElement; kind: GovernedWorkspaceKind; title: string };

function markRegion(root: HTMLElement, selector: string, attribute: string) {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => element.setAttribute(attribute, "true"));
}

function discoverHosts(): Host[] {
  const result: Host[] = [];
  const records = document.getElementById("operations-published");
  if (records) {
    records.dataset.governedWorkspace = "records";
    records.dataset.workspaceContract = "master-detail-v1";
    markRegion(records, ".published-record-list", "data-governed-master");
    result.push({ element: records, kind: "records", title: "Governed Records Workspace" });
  }

  const review = document.getElementById("operations-review");
  if (review) {
    review.dataset.governedWorkspace = "review";
    review.dataset.workspaceContract = "master-detail-v1";
    markRegion(review, ":scope > section", "data-governed-master");
    markRegion(review, "[aria-label='Contextual Inspector']", "data-governed-inspector");
    result.push({ element: review, kind: "review", title: "Governed Review Workspace" });
  }

  const mediaMaster = document.querySelector<HTMLElement>(".media-vault-assets");
  const mediaRoot = mediaMaster?.closest<HTMLElement>("section");
  if (mediaRoot) {
    mediaRoot.id ||= "operations-media";
    mediaRoot.dataset.governedWorkspace = "media";
    mediaRoot.dataset.workspaceContract = "master-detail-v1";
    mediaMaster?.setAttribute("data-governed-master", "true");
    markRegion(mediaRoot, ".media-vault-inspector", "data-governed-inspector");
    result.push({ element: mediaRoot, kind: "media", title: "Governed Media Workspace" });
  }
  return result;
}

export function GovernedOperationsBridge() {
  const [hosts, setHosts] = useState<Host[]>([]);

  useEffect(() => {
    const sync = () => {
      const next = discoverHosts();
      setHosts((current) => {
        const currentKey = current.map((item) => `${item.kind}:${item.element.id}`).join("|");
        const nextKey = next.map((item) => `${item.kind}:${item.element.id}`).join("|");
        return currentKey === nextKey ? current : next;
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

  return <>{hosts.map((host) => createPortal(
    <GovernedWorkspaceContractBanner kind={host.kind} title={host.title} />,
    host.element,
    `governed-${host.kind}`,
  ))}</>;
}
