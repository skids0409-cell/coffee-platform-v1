"use client";

export function OperationsWorkspaceChrome() {
  return <style>{`
    .operations-workspace-nav {
      position: sticky !important;
      top: 86px !important;
      z-index: 40 !important;
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 7px !important;
      margin: 14px 0 22px !important;
      padding: 8px !important;
      border: 1px solid #dfd4c5 !important;
      border-radius: 14px !important;
      background: rgba(255, 253, 249, .96) !important;
      box-shadow: 0 10px 28px rgba(58, 31, 18, .08) !important;
      backdrop-filter: blur(12px);
    }
    .operations-workspace-nav button {
      flex: 1 1 145px !important;
      min-height: 44px !important;
      padding: 9px 12px !important;
      border: 1px solid transparent !important;
      border-radius: 9px !important;
      background: transparent !important;
      color: #6d371e !important;
      font: inherit !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      line-height: 1.35 !important;
      text-align: center !important;
      box-shadow: none !important;
    }
    .operations-workspace-nav button:hover {
      border-color: #dfd4c5 !important;
      background: #f7f1e8 !important;
      color: #3a1f12 !important;
    }
    .operations-workspace-nav button.active {
      border-color: #3a1f12 !important;
      background: #3a1f12 !important;
      color: #fffaf3 !important;
      box-shadow: 0 5px 14px rgba(58, 31, 18, .16) !important;
    }
    .operations-workspace-nav button:focus-visible {
      outline: 3px solid #c89152 !important;
      outline-offset: 2px !important;
    }
    @media (max-width: 900px) {
      .operations-workspace-nav { top: 86px !important; }
      .operations-workspace-nav button { flex-basis: 155px !important; }
    }
    @media (max-width: 600px) {
      .operations-workspace-nav {
        position: static !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .operations-workspace-nav button { min-width: 0 !important; }
    }
  `}</style>;
}
