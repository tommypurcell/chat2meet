"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const suffix = i < 12 ? "AM" : "PM";
  return { value: `${String(i).padStart(2, "0")}:00`, label: `${hour}:00 ${suffix}` };
});

const MEETING_LENGTHS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

export default function PreferencesPage() {
  const [noMeetingsBefore, setNoMeetingsBefore] = useState("09:00");
  const [noMeetingsAfter, setNoMeetingsAfter] = useState("17:00");
  const [maxLength, setMaxLength] = useState("30");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(["mon", "tue", "wed", "thu", "fri"]),
  );
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  function toggleDay(key: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-tertiary)]">
            <span>Step 2 of 2</span>
            <span>Preferences</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div className="h-full w-full rounded-full bg-[var(--accent-primary)] transition-all" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Set your preferences
        </h1>

        <Card className="overflow-hidden">
          <CardContent className="space-y-7 p-6">
            {/* Availability window */}
            <FormSection title="Availability window">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="No meetings before"
                  value={noMeetingsBefore}
                  onChange={setNoMeetingsBefore}
                  options={HOURS}
                />
                <SelectField
                  label="No meetings after"
                  value={noMeetingsAfter}
                  onChange={setNoMeetingsAfter}
                  options={HOURS}
                />
              </div>
            </FormSection>

            <Divider />

            {/* Meeting preferences */}
            <FormSection title="Meeting preferences">
              <SelectField
                label="Max meeting length"
                value={maxLength}
                onChange={setMaxLength}
                options={MEETING_LENGTHS}
              />
            </FormSection>

            <Divider />

            {/* Preferred days */}
            <FormSection title="Preferred days">
              <div className="flex gap-2">
                {DAYS.map((day) => {
                  const active = selectedDays.has(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                        active
                          ? "bg-[var(--accent-primary)] text-white shadow-[var(--glow-soft)]"
                          : "border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-focused)]",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </FormSection>

            <Divider />

            {/* Visibility toggle */}
            <FormSection title="Visibility">
              <div className="flex gap-2">
                <ToggleOption
                  active={visibility === "public"}
                  onClick={() => setVisibility("public")}
                  label="Public"
                  description="Anyone can see free/busy"
                />
                <ToggleOption
                  active={visibility === "private"}
                  onClick={() => setVisibility("private")}
                  label="Private"
                  description="Only shared links"
                />
              </div>
            </FormSection>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/">
            <Button size="lg" className="w-full">
              Save preferences
            </Button>
          </Link>
          <Link href="/" className="text-center">
            <Button variant="ghost" size="md" className="w-full">
              Skip for now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaf components (no hooks)                                        */
/* ------------------------------------------------------------------ */

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-[var(--divider)]" />;
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--text-tertiary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "block w-full appearance-none rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)]",
          "focus:border-[var(--border-focused)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focused)]/25",
          "transition-colors",
          "bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat",
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23888'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E")`,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleOption({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-xl px-4 py-3.5 text-center transition-all",
        active
          ? "border-[1.5px] border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
          : "border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-focused)]",
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{description}</span>
    </button>
  );
}
