import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseDataFile, type ParsedData } from "@/lib/data-loader";
import type { Placeholder } from "@/lib/cert-types";

const NONE = "__none__";

interface Props {
  data: ParsedData | null;
  setData: (d: ParsedData | null) => void;
  placeholders: Placeholder[];
  mapping: Record<string, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  filenameColumn: string;
  setFilenameColumn: (c: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DataStep(props: Props) {
  const { data, setData, placeholders, mapping, setMapping, filenameColumn, setFilenameColumn, onBack, onNext } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const parsed = await parseDataFile(file);
      if (!parsed.rows.length) throw new Error("No rows found in file.");
      setData(parsed);
      // auto-map by fuzzy label match
      setMapping((prev) => {
        const next = { ...prev };
        for (const p of placeholders) {
          if (next[p.id]) continue;
          const hit = parsed.headers.find(
            (h) => h.toLowerCase().replace(/[^a-z]/g, "") === p.label.toLowerCase().replace(/[^a-z]/g, ""),
          );
          if (hit) next[p.id] = hit;
        }
        return next;
      });
      if (!filenameColumn) setFilenameColumn(parsed.headers[0] ?? "");
      toast.success(`Loaded ${parsed.rows.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }

  const mappedCols = placeholders.map((p) => mapping[p.id]).filter(Boolean);
  const missingCount = data
    ? data.rows.filter((r) => mappedCols.some((c) => !r[c] || r[c].trim() === "")).length
    : 0;

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!data ? (
        <Card
          className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed p-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">Upload participant data</p>
            <p className="text-sm text-muted-foreground">CSV or Excel (.xlsx) with a header row</p>
          </div>
          <Button disabled={loading}>{loading ? "Parsing…" : "Choose file"}</Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Preview <span className="text-muted-foreground">({data.rows.length} rows)</span>
              </p>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" /> Change file
              </Button>
            </div>
            <Card className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      {data.headers.map((h) => (
                        <TableCell key={h} className="whitespace-nowrap">
                          {r[h] || <span className="text-destructive">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            {missingCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {missingCount} row{missingCount > 1 ? "s have" : " has"} blank values in a mapped column.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Map columns to fields</p>
              {placeholders.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <Label className="text-sm">{p.label}</Label>
                  <Select
                    value={mapping[p.id] ?? NONE}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [p.id]: v === NONE ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— use sample text —</SelectItem>
                      {data.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </Card>

            <Card className="space-y-2 p-4">
              <Label className="text-sm">Filename column</Label>
              <Select value={filenameColumn} onValueChange={setFilenameColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {data.headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used to name each exported certificate.</p>
            </Card>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button disabled={!data} onClick={onNext}>
          Next: Preview & Generate <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}