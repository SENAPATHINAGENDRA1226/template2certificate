import type { Placeholder, TextAlign } from "@/lib/cert-types";
import { FONT_FAMILIES } from "@/lib/cert-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Trash2 } from "lucide-react";

interface Props {
  field: Placeholder;
  onChange: (patch: Partial<Placeholder>) => void;
  onDelete: () => void;
}

export function FieldControls({ field, onChange, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Field label</Label>
        <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Sample / default text</Label>
        <Input value={field.sample} onChange={(e) => onChange({ sample: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Font family</Label>
        <Select value={field.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Font size ({Math.round(field.fontRel * 1000) / 10}%)</Label>
        <Slider
          min={1}
          max={20}
          step={0.2}
          value={[field.fontRel * 100]}
          onValueChange={([v]) => onChange({ fontRel: v / 100 })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Color</Label>
          <input
            type="color"
            value={field.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alignment</Label>
          <ToggleGroup
            type="single"
            value={field.align}
            onValueChange={(v) => v && onChange({ align: v as TextAlign })}
            className="justify-start"
          >
            <ToggleGroupItem value="left" aria-label="Left"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Center"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Right"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <ToggleGroup type="multiple" className="justify-start">
          <ToggleGroupItem
            value="bold"
            data-state={field.bold ? "on" : "off"}
            onClick={() => onChange({ bold: !field.bold })}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            data-state={field.italic ? "on" : "off"}
            onClick={() => onChange({ italic: !field.italic })}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}