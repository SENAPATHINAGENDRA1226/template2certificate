import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  FileArchive,
  FileText,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getTemplateImage, drawCertificate, sanitizeFilename } from "@/lib/render-cert";
import { downloadSingle, generateZipOnTheFly, generatePdfOnTheFly, generateZipBlob } from "@/lib/export-cert";
import type { LoadedTemplate } from "@/lib/template-loader";
import type { ParsedData } from "@/lib/data-loader";
import type { Placeholder } from "@/lib/cert-types";

interface Props {
  template: LoadedTemplate;
  data: ParsedData;
  placeholders: Placeholder[];
  mapping: Record<string, string>;
  filenameColumn: string;
  onBack: () => void;
}

export function PreviewStep({ template, data, placeholders, mapping, filenameColumn, onBack }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeDataUrl, setActiveDataUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<"zip" | "pdf" | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrent, setExportCurrent] = useState(0);

  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<{ row: Record<string, string>; filename: string }[]>([]);

  const totalCerts = data.rows.length;

  useEffect(() => {
    let active = true;
    async function updatePreview() {
      setRendering(true);
      try {
        const img = await getTemplateImage(template.dataUrl);
        const canvas = document.createElement("canvas");
        const row = data.rows[activeIndex];
        if (!row) return;

        const values: Record<string, string> = {};
        for (const p of placeholders) {
          const col = mapping[p.id];
          values[p.id] = col ? row[col] ?? "" : p.sample;
        }
        drawCertificate(canvas, img, placeholders, values);
        if (active) {
          setActiveDataUrl(canvas.toDataURL("image/png"));
        }
      } catch (e) {
        toast.error("Failed to render preview");
      } finally {
        if (active) setRendering(false);
      }
    }
    updatePreview();
    return () => {
      active = false;
    };
  }, [template, data, placeholders, mapping, activeIndex]);

  async function handleExportZip() {
    setExporting(true);
    setExportType("zip");
    setExportProgress(0);
    setExportCurrent(0);
    try {
      await generateZipOnTheFly(
        template,
        data,
        placeholders,
        mapping,
        filenameColumn,
        (current, total) => {
          setExportCurrent(current);
          setExportProgress(Math.round((current / total) * 100));
        }
      );
      toast.success("ZIP downloaded successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportType("pdf");
    setExportProgress(0);
    setExportCurrent(0);
    try {
      await generatePdfOnTheFly(
        template,
        data,
        placeholders,
        mapping,
        (current, total) => {
          setExportCurrent(current);
          setExportProgress(Math.round((current / total) * 100));
        }
      );
      toast.success("PDF downloaded successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  }

  async function handlePublishPortal() {
    setSharing(true);
    setExporting(true);
    setExportType("zip");
    setExportProgress(0);
    setExportCurrent(0);
    setShareUrl(null);
    try {
      const zipBlob = await generateZipBlob(
        template,
        data,
        placeholders,
        mapping,
        filenameColumn,
        (current, total) => {
          setExportCurrent(current);
          setExportProgress(Math.round((current / total) * 100));
        }
      );

      const seen = new Map<string, number>();
      const calculatedRecipients = data.rows.map((row, i) => {
        const rawFilename = sanitizeFilename(row[filenameColumn] ?? "", `certificate_${i + 1}`);
        let filename = rawFilename;
        const n = seen.get(filename) ?? 0;
        if (n > 0) filename = `${filename}_${n + 1}`;
        seen.set(rawFilename, n + 1);
        return {
          row,
          filename: `${filename}.png`,
        };
      });

      const metadata = {
        templateName: template.name,
        filenameColumn,
        recipients: calculatedRecipients,
        total: calculatedRecipients.length,
        createdAt: new Date().toISOString(),
      };

      const formData = new FormData();
      formData.append("zip", zipBlob, "certificates.zip");
      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload certificates to the server.");
      }

      const result = await response.json();
      const batchId = result.batchId;
      const portalUrl = `${window.location.origin}/download/${batchId}`;

      setShareUrl(portalUrl);
      setRecipients(calculatedRecipients);
      toast.success("Shareable certificate portal created!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sharing failed");
    } finally {
      setSharing(false);
      setExporting(false);
      setExportType(null);
    }
  }

  function handleDownloadActive() {
    if (!activeDataUrl) return;
    const row = data.rows[activeIndex];
    const filename = sanitizeFilename(row[filenameColumn] ?? "", `certificate_${activeIndex + 1}`);
    downloadSingle({
      filename,
      dataUrl: activeDataUrl,
      width: 0,
      height: 0,
    });
  }

  function handlePageInputChange(val: string) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalCerts) {
      setActiveIndex(parsed - 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Preview & Generate</h2>
          <p className="text-sm text-muted-foreground">
            {totalCerts} certificate{totalCerts !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack} disabled={exporting}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left pane: Active preview & Pagination */}
        <div className="space-y-4">
          <Card className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden bg-muted p-6">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {activeDataUrl ? (
              <img
                src={activeDataUrl}
                alt={`Certificate ${activeIndex + 1}`}
                className="max-h-[60vh] w-auto max-w-full rounded-md shadow-md"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">No preview generated</p>
              </div>
            )}
          </Card>

          {/* Pagination Controls */}
          <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveIndex(0)}
                disabled={activeIndex === 0 || exporting}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveIndex((p) => p - 1)}
                disabled={activeIndex === 0 || exporting}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveIndex((p) => p + 1)}
                disabled={activeIndex === totalCerts - 1 || exporting}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveIndex(totalCerts - 1)}
                disabled={activeIndex === totalCerts - 1 || exporting}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Certificate</span>
              <Input
                type="number"
                min={1}
                max={totalCerts}
                value={activeIndex + 1}
                onChange={(e) => handlePageInputChange(e.target.value)}
                className="w-16 h-8 text-center"
                disabled={exporting}
              />
              <span className="text-muted-foreground">of {totalCerts}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadActive}
              disabled={!activeDataUrl || exporting}
            >
              <Download className="mr-1.5 h-4 w-4" /> Download Current PNG
            </Button>
          </Card>
        </div>

        {/* Right pane: Export Controls */}
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Bulk Actions
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export certificates in bulk directly inside your browser. No file data is sent to external servers.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full justify-start"
                disabled={exporting}
                onClick={handleExportZip}
              >
                <FileArchive className="mr-2 h-4 w-4" /> Export all as ZIP (PNG)
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={exporting}
                onClick={handleExportPdf}
              >
                <FileText className="mr-2 h-4 w-4" /> Export all as Single PDF
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-4 border-primary/20 bg-primary/20000">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> Share & Hosting
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Publish a secure, shareable portal. Each recipient will be able to search and download their own certificate individually.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full justify-start"
                disabled={exporting}
                onClick={handlePublishPortal}
              >
                <Globe className="mr-2 h-4 w-4" /> Publish Shareable Portal
              </Button>
            </div>
          </Card>

          {exporting && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  {sharing ? "Uploading certificates..." : `Generating ${exportType === "zip" ? "ZIP" : "PDF"}...`}
                </span>
                <span className="text-muted-foreground">
                  {exportCurrent} / {totalCerts}
                </span>
              </div>
              <Progress value={exportProgress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">
                Please keep this tab open during generation.
              </p>
            </Card>
          )}

          {shareUrl && (
            <Card className="p-4 border-green-500/30 bg-green-500/2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-green-600 dark:text-green-400">
                  Live Sharing Portal
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your certificate portal is live! Share this URL with your recipients so they can search and download their own certificate:
              </p>

              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="h-9 text-xs bg-background border-muted font-mono"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Portal link copied to clipboard!");
                  }}
                  className="shrink-0"
                >
                  Copy
                </Button>
              </div>

              {/* Scrollable list of individual copy links */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Individual Recipient Links
                </h4>
                <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                  {recipients.map((recipient, i) => {
                    const name = recipient.row[filenameColumn] || `Recipient ${i + 1}`;
                    const rawUrl = `${shareUrl}?search=${encodeURIComponent(name)}`;
                    const directUrl = `${window.location.origin}/api/cert/${shareUrl.split('/').pop()}/${recipient.filename}`;
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 text-xs first:pt-0">
                        <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300">{name}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(rawUrl);
                              toast.success(`Search link copied for ${name}`);
                            }}
                            className="h-7 rounded-md px-2 text-[10px] text-primary hover:bg-primary/10"
                          >
                            Copy Search Link
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(directUrl);
                              toast.success(`Direct download link copied for ${name}`);
                            }}
                            className="h-7 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-muted"
                          >
                            Direct Link
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}