import { useEffect, useState } from "react";
import { AppDoc, DOC_LABEL, REQUIRED_DOCS } from "@/lib/types";
import { formatDateTime } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Panel, PanelHeader } from "@/components/status-badge";

async function dataUrlToBlobUrl(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return URL.createObjectURL(blob);
}

export function DocPreviewDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: AppDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (open && doc?.dataUrl) {
      dataUrlToBlobUrl(doc.dataUrl)
        .then((u) => {
          url = u;
          setBlobUrl(u);
        })
        .catch(() => setBlobUrl(null));
    } else {
      setBlobUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, doc]);

  if (!doc) return null;
  const isImage = doc.mime.startsWith("image/");
  const isPdf = doc.mime === "application/pdf";
  const requiredLabel = REQUIRED_DOCS.find((r) => r.type === doc.type)?.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-2 border-foreground bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold uppercase tracking-wide">{doc.name}</DialogTitle>
          <DialogDescription>
            {requiredLabel ?? DOC_LABEL[doc.type]} · uploaded {formatDateTime(doc.uploadedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="border-2 border-foreground bg-secondary/60" style={{ minHeight: 260 }}>
          {doc.dataUrl && isImage ? (
            <img src={blobUrl ?? doc.dataUrl} alt={doc.name} className="max-h-[50vh] w-full object-contain" />
          ) : doc.dataUrl && isPdf && blobUrl ? (
            <iframe src={blobUrl} title={doc.name} className="h-[50vh] w-full" />
          ) : doc.dataUrl ? (
            <p className="p-6 text-sm text-muted-foreground">
              Preview is not available for this file type in the demo. File: {doc.name} ({doc.mime}).
            </p>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Demo sample document — a real file was not attached during seeding, so no preview is available.
            </p>
          )}
        </div>

        <div>
          <Panel>
            <PanelHeader title="File details" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">File name</dt>
              <dd className="truncate font-medium">{doc.name}</dd>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium">{doc.sizeKb} KB</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{doc.mime}</dd>
              <dt className="text-muted-foreground">Uploaded</dt>
              <dd className="font-medium">{formatDateTime(doc.uploadedAt)}</dd>
            </dl>
          </Panel>
          {Object.keys(doc.extracted).length > 0 && (
            <Panel className="mt-3">
              <PanelHeader title="Sample extracted fields (simulated)" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm">
                {Object.entries(doc.extracted)
                  .filter(([k]) => k !== "missingField")
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
              </dl>
            </Panel>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
