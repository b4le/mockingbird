"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EvidenceFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  selectedStatus: string | null;
  selectedStrength: string | null;
  onCategoryChange: (cat: string | null) => void;
  onStatusChange: (status: string | null) => void;
  onStrengthChange: (strength: string | null) => void;
}

const STATUSES = ["supported", "contested", "unverified"];
const STRENGTHS = ["strong", "moderate", "weak", "circumstantial"];

export function EvidenceFilters({
  categories,
  selectedCategory,
  selectedStatus,
  selectedStrength,
  onCategoryChange,
  onStatusChange,
  onStrengthChange,
}: EvidenceFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="evidence-filters"
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div id="evidence-filters" className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Category
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedCategory === null}
              onClick={() => onCategoryChange(null)}
            >
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() =>
                  onCategoryChange(selectedCategory === cat ? null : cat)
                }
              >
                <Badge
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {cat}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Claim Status
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by claim status">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedStatus === null}
              onClick={() => onStatusChange(null)}
            >
              <Badge
                variant={selectedStatus === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selectedStatus === s}
                onClick={() =>
                  onStatusChange(selectedStatus === s ? null : s)
                }
              >
                <Badge
                  variant={selectedStatus === s ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Evidence Strength
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by evidence strength">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedStrength === null}
              onClick={() => onStrengthChange(null)}
            >
              <Badge
                variant={selectedStrength === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {STRENGTHS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selectedStrength === s}
                onClick={() =>
                  onStrengthChange(selectedStrength === s ? null : s)
                }
              >
                <Badge
                  variant={selectedStrength === s ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
