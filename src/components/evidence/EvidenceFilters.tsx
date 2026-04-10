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
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Category
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onCategoryChange(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onCategoryChange(selectedCategory === cat ? null : cat)
                }
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Claim Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedStatus === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStatusChange(null)}
            >
              All
            </Badge>
            {STATUSES.map((s) => (
              <Badge
                key={s}
                variant={selectedStatus === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onStatusChange(selectedStatus === s ? null : s)
                }
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Evidence Strength
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedStrength === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStrengthChange(null)}
            >
              All
            </Badge>
            {STRENGTHS.map((s) => (
              <Badge
                key={s}
                variant={selectedStrength === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onStrengthChange(selectedStrength === s ? null : s)
                }
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
