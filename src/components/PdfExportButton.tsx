"use client";

import { useEffect } from "react";

type Props = {
  autoStart?: boolean;
};

export function PdfExportButton({ autoStart = false }: Props) {
  useEffect(() => {
    if (!autoStart) return;
    const timeout = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timeout);
  }, [autoStart]);

  return (
    <button type="button" onClick={() => window.print()} className="ui-ghost-btn px-4 py-2 text-sm">
      Export As PDF
    </button>
  );
}
