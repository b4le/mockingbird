"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { EvidenceFilters } from "./EvidenceFilters";
import type { Claim, EvidenceItem, Stakeholder } from "@/types";

interface EvidencePageClientProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  stakeholders: Stakeholder[];
}

export function EvidencePageClient({
  claims,
  evidence,
  stakeholders,
}: EvidencePageClientProps) {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null);

  const stakeholderMap = new Map(stakeholders.map((s) => [s.id, s]));
  const evidenceMap = new Map(evidence.map((e) => [e.id, e]));
  const categories = useMemo(
    () => [...new Set(claims.map((c) => c.category))].sort(),
    [claims]
  );

  const filteredClaims = useMemo(() => {
    let result = claims;
    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }
    if (selectedStatus) {
      result = result.filter((c) => c.status === selectedStatus);
    }
    if (selectedStrength) {
      result = result.filter((c) =>
        c.evidenceIds.some(
          (eid) => evidenceMap.get(eid)?.strength === selectedStrength
        )
      );
    }
    return result;
  }, [claims, selectedCategory, selectedStatus, selectedStrength, evidenceMap]);

  const activeClaimEvidence = useMemo(() => {
    if (!selectedClaim) return [];
    const claim = claims.find((c) => c.id === selectedClaim);
    if (!claim) return [];
    return claim.evidenceIds
      .map((id) => evidenceMap.get(id))
      .filter(Boolean) as EvidenceItem[];
  }, [selectedClaim, claims, evidenceMap]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Evidence Board</h1>
      <EvidenceFilters
        categories={categories}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        selectedStrength={selectedStrength}
        onCategoryChange={setSelectedCategory}
        onStatusChange={setSelectedStatus}
        onStrengthChange={setSelectedStrength}
      />
      {filteredClaims.length === 0 ? (
        <EmptyState message="No claims match the current filters" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {filteredClaims.map((claim) => {
              const raiser = stakeholderMap.get(claim.raisedById);
              return (
                <Card
                  key={claim.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedClaim === claim.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setSelectedClaim(
                      selectedClaim === claim.id ? null : claim.id
                    )
                  }
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {claim.assertion}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {claim.category}
                      </Badge>
                      <StatusBadge type="claim" status={claim.status} />
                      <span className="text-xs text-muted-foreground">
                        {claim.evidenceIds.length} evidence
                      </span>
                    </div>
                    {raiser && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <StakeholderAvatar stakeholder={raiser} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {raiser.name}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="lg:col-span-2">
            {selectedClaim ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Supporting Evidence ({activeClaimEvidence.length})
                </h3>
                {activeClaimEvidence.map((ev) => (
                  <Card key={ev.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{ev.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {ev.description}
                          </p>
                        </div>
                        <StatusBadge type="strength" status={ev.strength} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{ev.source}</span>
                        <span>&middot;</span>
                        <Badge variant="outline" className="text-xs">
                          {ev.sourceType}
                        </Badge>
                        <span>&middot;</span>
                        <DateDisplay date={ev.date} />
                      </div>
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View source &rarr;
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Select a claim to see its evidence
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
