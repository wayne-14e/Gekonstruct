import { Skeleton } from "@/components/ui/skeleton";

/** Segment-level skeleton so opening a project never flashes an empty page. */
export default function ProjectLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-24" />

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-40 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      <Skeleton className="mt-6 h-11 w-full max-w-md rounded-xl" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
    </div>
  );
}
