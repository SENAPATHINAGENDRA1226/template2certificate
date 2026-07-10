import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { StepIndicator } from "@/components/cert/StepIndicator";
import { TemplateStep } from "@/components/cert/TemplateStep";
import { DataStep } from "@/components/cert/DataStep";
import { PreviewStep } from "@/components/cert/PreviewStep";
import type { LoadedTemplate } from "@/lib/template-loader";
import type { ParsedData } from "@/lib/data-loader";
import type { Placeholder, TemplateProfile } from "@/lib/cert-types";
import { deleteProfile, loadProfiles, saveProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Certificate Generator — Bulk certificates from a template" },
      {
        name: "description",
        content:
          "Upload a certificate template, position text fields, and generate bulk certificates from CSV or Excel data — all in your browser. Export as PNG, ZIP, or PDF.",
      },
      { property: "og:title", content: "Certificate Generator" },
      {
        property: "og:description",
        content: "Generate bulk certificates from a template and spreadsheet, entirely in your browser.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<LoadedTemplate | null>(null);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [filenameColumn, setFilenameColumn] = useState("");
  const [profiles, setProfiles] = useState<TemplateProfile[]>([]);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Certificate Generator</h1>
            <p className="text-xs text-muted-foreground">Template → Data → Generate, all in your browser</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <StepIndicator step={step} onGoto={setStep} />
        </div>

        {step === 1 && (
          <TemplateStep
            template={template}
            setTemplate={setTemplate}
            placeholders={placeholders}
            setPlaceholders={setPlaceholders}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            profiles={profiles}
            onSaveProfile={(name) => setProfiles(saveProfile(name, placeholders))}
            onLoadProfile={(p) => {
              setPlaceholders(p.placeholders.map((x) => ({ ...x })));
              setSelectedId(null);
            }}
            onDeleteProfile={(id) => setProfiles(deleteProfile(id))}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <DataStep
            data={data}
            setData={setData}
            placeholders={placeholders}
            mapping={mapping}
            setMapping={setMapping}
            filenameColumn={filenameColumn}
            setFilenameColumn={setFilenameColumn}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && template && data && (
          <PreviewStep
            template={template}
            data={data}
            placeholders={placeholders}
            mapping={mapping}
            filenameColumn={filenameColumn}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
