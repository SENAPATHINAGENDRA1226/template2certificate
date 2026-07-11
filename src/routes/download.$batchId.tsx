import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileWarning,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface Recipient {
  row: Record<string, string>;
  filename: string;
}

interface BatchMetadata {
  templateName: string;
  filenameColumn: string;
  recipients: Recipient[];
  total: number;
  createdAt: string;
}

export const Route = createFileRoute("/download/$batchId")({
  component: DownloadPortalPage,
});

function DownloadPortalPage() {
  const { batchId } = Route.useParams();
  const [metadata, setMetadata] = useState<BatchMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Fetch metadata on mount
  useEffect(() => {
    async function fetchMetadata() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/cert/${batchId}/metadata.json`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("This certificate portal does not exist or has expired.");
          }
          throw new Error("Failed to load certificate portal metadata.");
        }
        const data = (await response.json()) as BatchMetadata;
        setMetadata(data);

        // Pre-select if only one recipient
        if (data.recipients && data.recipients.length === 1) {
          setSelectedRecipient(data.recipients[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [batchId]);

  // Filter recipients based on query
  const filteredRecipients = useMemo(() => {
    if (!metadata || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return metadata.recipients.filter((r) => {
      // Search in all row values (e.g. name, email, company, etc.)
      return Object.values(r.row).some((val) =>
        String(val).toLowerCase().includes(query)
      );
    });
  }, [metadata, searchQuery]);

  const handleCopyLink = (recipient: Recipient) => {
    const url = `${window.location.origin}/api/cert/${batchId}/${recipient.filename}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Direct certificate image link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setImageLoading(true);
  };

  // Try to find recipient's primary display name
  const getDisplayName = (row: Record<string, string>) => {
    const priorityKeys = ["name", "recipient", "fullname", "student name", "participant"];
    for (const key of priorityKeys) {
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase() === key || k.toLowerCase().includes(key)
      );
      if (foundKey && row[foundKey]) {
        return row[foundKey];
      }
    }
    // Fallback to first column value
    const values = Object.values(row);
    return values[0] || "Recipient";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-slate-950 text-slate-100 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse">Loading download portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-slate-950 text-slate-100 px-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-950/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <FileWarning className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Portal Error</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight">Certificate Portal</h1>
              <p className="text-[10px] text-slate-400">Verify & Download Certificates</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-950 hover:text-white" asChild>
            <Link to="/">Create Your Own</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 grid gap-8 md:grid-cols-12">
        {/* Left Side: Search & Search Results (col-span-5) */}
        <div className="space-y-6 md:col-span-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Find Your Certificate</h2>
            <p className="text-sm text-slate-400">
              Search by your name or email address to view and download your official document.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Enter your name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>

          {searchQuery.trim() ? (
            <Card className="border-slate-800/80 bg-slate-900/30 backdrop-blur-xl">
              <CardHeader className="py-3 px-4 border-b border-slate-800/40">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Matches ({filteredRecipients.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 max-h-[350px] overflow-y-auto divide-y divide-slate-800/30">
                {filteredRecipients.length > 0 ? (
                  filteredRecipients.map((recipient, i) => {
                    const isSelected = selectedRecipient?.filename === recipient.filename;
                    const displayName = getDisplayName(recipient.row);
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectRecipient(recipient)}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex items-center justify-between text-sm ${isSelected
                            ? "bg-primary/20 text-white font-medium shadow-inner"
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                          }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium truncate">{displayName}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {recipient.row.email || Object.values(recipient.row)[1] || ""}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    No matching certificates found
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            metadata && metadata.recipients.length > 1 && (
              <Card className="border-slate-800/80 bg-slate-900/20">
                <CardContent className="py-6 text-center text-slate-400 text-sm">
                  <Award className="mx-auto h-8 w-8 text-primary/40 mb-2" />
                  Type in the search bar above to locate your certificate.
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Right Side: Preview & Download Card (col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-start">
          {selectedRecipient ? (
            <Card className="border-slate-800/80 bg-slate-950/60 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col h-full">
              <CardHeader className="border-b border-slate-800/50 bg-slate-950/80 py-4 px-6 flex flex-row items-center justify-between gap-4">
                <div className="truncate">
                  <CardTitle className="text-lg font-bold text-white truncate">
                    {getDisplayName(selectedRecipient.row)}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5 truncate">
                    Batch: {metadata?.templateName || "Verified Certificate"}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyLink(selectedRecipient)}
                    className="h-8 w-8 border-slate-800 hover:bg-slate-800 hover:text-white"
                    title="Copy direct link"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/20 relative min-h-[300px]">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                <img
                  src={`/api/cert/${batchId}/${selectedRecipient.filename}`}
                  alt={`${getDisplayName(selectedRecipient.row)}'s Certificate`}
                  className="max-h-[50vh] w-auto max-w-full rounded-md shadow-2xl border border-slate-800/60"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </CardContent>

              <CardFooter className="border-t border-slate-800/50 bg-slate-950/80 p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-xs text-slate-400">
                  Securely served, officially verified certificate
                </div>

                <Button
                  className="w-full sm:w-auto font-medium shadow-lg shadow-primary/20"
                  asChild
                >
                  <a
                    href={`/api/cert/${batchId}/${selectedRecipient.filename}`}
                    download={selectedRecipient.filename}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/10 p-8 text-center">
              <Award className="h-16 w-16 text-slate-700 stroke-[1.25] mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No Certificate Selected</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
                Use the search pane to find your record and select it to generate a verified, download-ready preview.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 mt-12 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Certificate Generator. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-slate-300 transition-colors">Generator App</Link>
            <span className="text-slate-800">|</span>
            <span className="text-slate-500">Client-Side Secure PDF/PNG Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
