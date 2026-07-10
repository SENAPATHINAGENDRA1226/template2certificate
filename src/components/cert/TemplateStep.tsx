import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Plus, Save, FolderOpen, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlaceholderCanvas } from "./PlaceholderCanvas";
import { FieldControls } from "./FieldControls";
import { loadTemplate, type LoadedTemplate } from "@/lib/template-loader";
import { createPlaceholder, type Placeholder, type TemplateProfile } from "@/lib/cert-types";
import { cn } from "@/lib/utils";

interface Props {
  template: LoadedTemplate | null;
  setTemplate: (t: LoadedTemplate | null) => void;
  placeholders: Placeholder[];
  setPlaceholders: React.Dispatch<React.SetStateAction<Placeholder[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  profiles: TemplateProfile[];
  onSaveProfile: (name: string) => void;
  onLoadProfile: (p: TemplateProfile) => void;
  onDeleteProfile: (id: string) => void;
  onNext: () => void;
}

export function TemplateStep(props: Props) {
  const {
    template,
    setTemplate,
    placeholders,
    setPlaceholders,
    selectedId,
    setSelectedId,
    profiles,
    onSaveProfile,
    onLoadProfile,
    onDeleteProfile,
    onNext,
  } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  const selected = placeholders.find((p) => p.id === selectedId) ?? null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const t = await loadTemplate(file);
      setTemplate(t);
      toast.success("Template loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }

  function updateField(id: string, patch: Partial<Placeholder>) {
    setPlaceholders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addField(xRel: number, yRel: number) {
    const p = createPlaceholder({ xRel, yRel, label: `Field ${placeholders.length + 1}`, sample: "Sample Text" });
    setPlaceholders((prev) => [...prev, p]);
    setSelectedId(p.id);
  }

  if (!template) {
    return (
      <Card
        className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed p-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold">Upload a certificate template</p>
          <p className="text-sm text-muted-foreground">Drag & drop or click to select a PNG, JPG or PDF</p>
        </div>
        <Button disabled={loading}>{loading ? "Loading…" : "Choose file"}</Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Click anywhere on the template to add a text field. Drag to move, use the handle to resize.
          </p>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Change template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <PlaceholderCanvas
          dataUrl={template.dataUrl}
          placeholders={placeholders}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={updateField}
          onAddAt={addField}
        />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => addField(0.3, 0.45)}>
            <Plus className="mr-1 h-4 w-4" /> Add field
          </Button>
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={!placeholders.length}>
                <Save className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save layout profile</DialogTitle>
              </DialogHeader>
              <Input placeholder="Profile name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!profileName.trim()) return;
                    onSaveProfile(profileName.trim());
                    setProfileName("");
                    setSaveOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={!profiles.length}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Saved layout profiles</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.placeholders.length} fields</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          onLoadProfile(p);
                          setLoadOpen(false);
                        }}
                      >
                        Load
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteProfile(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Fields</p>
          {placeholders.length === 0 && <p className="text-sm text-muted-foreground">No fields yet.</p>}
          <div className="space-y-1">
            {placeholders.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                  p.id === selectedId ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
              >
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {selected && (
          <Card className="p-4">
            <FieldControls
              field={selected}
              onChange={(patch) => updateField(selected.id, patch)}
              onDelete={() => {
                setPlaceholders((prev) => prev.filter((x) => x.id !== selected.id));
                setSelectedId(null);
              }}
            />
          </Card>
        )}

        <Button className="w-full" disabled={!placeholders.length} onClick={onNext}>
          Next: Data & Mapping <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}