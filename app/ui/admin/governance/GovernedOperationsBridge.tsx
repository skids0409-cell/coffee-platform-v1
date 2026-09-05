"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GovernedWorkspaceContractBanner, type GovernedWorkspaceKind } from "./GovernedWorkspace";
import { MediaPreservationInspectorPanel, MediaPreservationStatusStrip } from "./MediaPreservationProjection";
import { OperationsWorkspaceChrome } from "./OperationsWorkspaceChrome";
import { OperationsCenterArchitecture } from "./OperationsCenterArchitecture";
import { OperationsWorkspaceComposition } from "./OperationsWorkspaceComposition";

type Host = { element: HTMLElement; mount: HTMLElement; kind: GovernedWorkspaceKind; title: string };
type ProjectionMounts = { status: HTMLElement | null; inspector: HTMLElement | null };

function markRegion(root: HTMLElement, selector: string, attribute: string) {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => element.setAttribute(attribute, "true"));
}

function bannerMount(root: HTMLElement, kind: GovernedWorkspaceKind) {
  const selector = `[data-governed-banner-host="${kind}"]`;
  const existing = root.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const mount = document.createElement("div");
  mount.dataset.governedBannerHost = kind;
  root.prepend(mount);
  return mount;
}

function projectionMount(root: HTMLElement, attribute: "preservationStatusHost" | "preservationInspectorHost", position: "prepend" | "append") {
  const selector = attribute === "preservationStatusHost" ? "[data-preservation-status-host]" : "[data-preservation-inspector-host]";
  const existing = root.querySelector<HTMLElement>(`:scope > ${selector}`);
  if (existing) return existing;
  const mount = document.createElement("div");
  mount.dataset[attribute] = "true";
  if (position === "prepend") root.prepend(mount); else root.append(mount);
  return mount;
}

function discoverHosts(): { hosts: Host[]; projections: ProjectionMounts } {
  document.querySelectorAll<HTMLElement>(".record-editor").forEach((editor) => {
    editor.dataset.governedInspector = "true";
    editor.dataset.workspaceContract = "master-detail-v1";
  });

  const result: Host[] = [];
  const projections: ProjectionMounts = { status: null, inspector: null };
  const records = document.getElementById("operations-published");
  if (records) {
    records.dataset.governedWorkspace = "records";
    records.dataset.workspaceContract = "master-detail-v1";
    records.dataset.entityWorkspace = "true";
    markRegion(records, ".published-record-list", "data-governed-master");
    result.push({ element: records, mount: bannerMount(records, "records"), kind: "records", title: "Governed Records & Entities Workspace" });
  }

  const review = document.getElementById("operations-review");
  if (review) {
    review.dataset.governedWorkspace = "review";
    review.dataset.workspaceContract = "master-detail-v1";
    markRegion(review, ":scope > section", "data-governed-master");
    markRegion(review, "[aria-label='Contextual Inspector']", "data-governed-inspector");
    result.push({ element: review, mount: bannerMount(review, "review"), kind: "review", title: "Governed Review Workspace" });
  }

  const mediaMaster = document.querySelector<HTMLElement>(".media-vault-assets");
  const mediaRoot = mediaMaster?.closest<HTMLElement>("section");
  if (mediaRoot) {
    mediaRoot.id ||= "operations-media";
    mediaRoot.dataset.governedWorkspace = "media";
    mediaRoot.dataset.workspaceContract = "master-detail-v1";
    mediaMaster?.setAttribute("data-governed-master", "true");
    markRegion(mediaRoot, ".media-vault-inspector", "data-governed-inspector");
    result.push({ element: mediaRoot, mount: bannerMount(mediaRoot, "media"), kind: "media", title: "Governed Media Workspace" });
    const inspector = mediaRoot.querySelector<HTMLElement>(".media-vault-inspector");
    projections.status = projectionMount(mediaRoot, "preservationStatusHost", "prepend");
    projections.inspector = inspector ? projectionMount(inspector, "preservationInspectorHost", "append") : null;
  }
  return { hosts: result, projections };
}

export function GovernedOperationsBridge() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [projections, setProjections] = useState<ProjectionMounts>({ status: null, inspector: null });

  useEffect(() => {
    const sync = () => {
      const next = discoverHosts();
      setHosts((current) => {
        const currentKey = current.map((item) => `${item.kind}:${item.element.id}:${item.mount.isConnected}`).join("|");
        const nextKey = next.hosts.map((item) => `${item.kind}:${item.element.id}:${item.mount.isConnected}`).join("|");
        return currentKey === nextKey ? current : next.hosts;
      });
      setProjections((current) => {
        const currentKey = `${current.status?.isConnected || false}:${current.inspector?.isConnected || false}`;
        const nextKey = `${next.projections.status?.isConnected || false}:${next.projections.inspector?.isConnected || false}`;
        return currentKey === nextKey && current.status === next.projections.status && current.inspector === next.projections.inspector ? current : next.projections;
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
    <OperationsWorkspaceChrome />
    <OperationsCenterArchitecture />
    <OperationsWorkspaceComposition />
    {hosts.map((host) => createPortal(
      <GovernedWorkspaceContractBanner kind={host.kind} title={host.title} />,
      host.mount,
      `governed-${host.kind}`,
    ))}
    {projections.status ? createPortal(<MediaPreservationStatusStrip />, projections.status, "media-preservation-status") : null}
    {projections.inspector ? createPortal(<MediaPreservationInspectorPanel />, projections.inspector, "media-preservation-inspector") : null}
  </>;
}
