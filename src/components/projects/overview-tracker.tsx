"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { markOverviewSectionViewed } from "@/app/actions/progress";
import {
  isOverviewComplete,
  OVERVIEW_SECTIONS,
  OVERVIEW_SECTION_LABELS,
  type OverviewSection,
} from "@/lib/domain/event";
import { cn } from "@/lib/utils";

/**
 * Reading tracker for the architecture map (BLUEPRINT §7, §13).
 *
 * Sections opt in with `data-overview-section`. An IntersectionObserver reports each one
 * once, and the server action owns `overview_section_viewed` + the `map-reader` badge.
 * Nothing here parses model prose or touches Firestore directly.
 */
export function OverviewTracker({
  projectId,
  initialViewed,
  initialBadgeEarned,
}: {
  projectId: string;
  initialViewed: readonly string[];
  initialBadgeEarned: boolean;
}) {
  const [viewed, setViewed] = useState<string[]>(() => [...initialViewed]);
  const [badgeEarned, setBadgeEarned] = useState(initialBadgeEarned);
  const viewedRef = useRef(viewed);
  const badgeEarnedRef = useRef(badgeEarned);
  const pendingRef = useRef(new Set<string>());

  useEffect(() => {
    viewedRef.current = viewed;
  }, [viewed]);

  useEffect(() => {
    badgeEarnedRef.current = badgeEarned;
  }, [badgeEarned]);

  useEffect(() => {
    let cancelled = false;
    // A progress document can complete before the badge write lands (or an old doc can
    // arrive without the badge). One heal call makes the badge converge.
    const needsHeal = isOverviewComplete(initialViewed) && !initialBadgeEarned;

    async function send(section: OverviewSection) {
      if (pendingRef.current.has(section)) return;
      if (viewedRef.current.includes(section) && !needsHeal) return;
      if (badgeEarnedRef.current) return;

      pendingRef.current.add(section);
      try {
        const result = await markOverviewSectionViewed({ projectId, section });
        if (cancelled || !result.ok) return;

        viewedRef.current = result.viewed;
        setViewed(result.viewed);

        if (result.badgeAwarded) {
          badgeEarnedRef.current = true;
          setBadgeEarned(true);
          toast.success("Badge unlocked: Map Reader", {
            description: "You read every section of your own architecture map.",
          });
        }
      } catch {
        // Reading progress is best-effort; never break the page over analytics.
      } finally {
        pendingRef.current.delete(section);
      }
    }

    if (needsHeal) {
      void send("summary");
    }

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const raw = entry.target.getAttribute("data-overview-section");
          const section = OVERVIEW_SECTIONS.find((value) => value === raw);
          if (section) void send(section);
        }
      },
      { threshold: 0.3, rootMargin: "-8% 0px -8% 0px" },
    );

    function observeSections(root: ParentNode) {
      if (root instanceof Element && root.matches("[data-overview-section]")) {
        observe(root);
      }
      root.querySelectorAll<HTMLElement>("[data-overview-section]").forEach(observe);
    }

    function observe(node: Element) {
      if (observed.has(node)) return;
      observed.add(node);
      observer.observe(node);
    }

    observeSections(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) {
            observeSections(node);
          }
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      mutations.disconnect();
      observer.disconnect();
    };
  }, [projectId, initialViewed, initialBadgeEarned]);

  const readCount = OVERVIEW_SECTIONS.filter((section) => viewed.includes(section)).length;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="label-mono">Map read</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {badgeEarned
            ? "All four map areas read. Map Reader is yours."
            : "Visit all four map areas to earn the Map Reader badge."}
        </p>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {OVERVIEW_SECTIONS.map((section) => {
          const done = viewed.includes(section);
          return (
            <span
              key={section}
              title={OVERVIEW_SECTION_LABELS[section]}
              className={cn(
                "size-2.5 rounded-full border transition-colors",
                done ? "border-primary bg-primary" : "border-border bg-secondary",
              )}
            />
          );
        })}
      </div>
      <span
        className="font-mono text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {readCount}/{OVERVIEW_SECTIONS.length}
      </span>
    </div>
  );
}
