'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const swatch = HEX_PATTERN.test(value) ? value : '#FFFFFF';

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={swatch}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-8 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0"
        />
        <Input
          id={id}
          value={value}
          placeholder="#4F46E5"
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}
