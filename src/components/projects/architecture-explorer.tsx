"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network } from "lucide-react";
import type { GuidebookDoc } from "@/lib/domain/architecture";

type ArchitectureExplorerProps = {
  guidebook: GuidebookDoc;
  repoUrl: string;
};

export function ArchitectureExplorer({ guidebook, repoUrl }: ArchitectureExplorerProps) {
  const [selectedId, setSelectedId] = useState(guidebook.architecture.layers[0]?.id ?? "");

  const nodes = useMemo<Node[]>(() => {
    const count = guidebook.architecture.layers.length;
    return guidebook.architecture.layers.map((layer, index) => ({
      id: layer.id,
      position: {
        x: 80 + (index % 3) * 270,
        y: 60 + Math.floor(index / 3) * 190,
      },
      data: {
        label: (
          <div className="w-full">
            <p className="font-mono text-[0.625rem] text-primary">NODE {String(index + 1).padStart(2, "0")}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{layer.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{layer.purpose}</p>
          </div>
        ),
      },
      style: {
        border: selectedId === layer.id ? "2px solid #5be000" : "1px solid #27313c",
        borderRadius: 14,
        background: "#111820",
        width: "auto",
        minWidth: 190,
        maxWidth: 280,
        height: "auto",
        padding: 12,
        boxShadow: selectedId === layer.id ? "0 0 22px rgba(91,224,0,.14)" : "none",
      },
    })).concat(count === 0 ? [] : []);
  }, [guidebook.architecture.layers, selectedId]);

  const edges = useMemo<Edge[]>(() => {
    const result: Edge[] = [];
    guidebook.architecture.dataFlow.slice(0, -1).forEach((step, index) => {
      const source = guidebook.architecture.layers[index % guidebook.architecture.layers.length]?.id;
      const target = guidebook.architecture.layers[(index + 1) % guidebook.architecture.layers.length]?.id;
      if (!source || !target) return;
      result.push({
        id: `flow-${index}`,
        source,
        target,
        animated: false,
        label: `${index + 1}`,
        style: { stroke: "#56636f" },
      });
    });
    return result;
  }, [guidebook.architecture.dataFlow, guidebook.architecture.layers]);

  const selected = guidebook.architecture.layers.find((layer) => layer.id === selectedId);

  return (
    <section className="mt-8" data-overview-section="skillmap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-mono">Skill map</p>
          <h2 className="mt-1 text-xl">Explore the system</h2>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-[430px] w-full overflow-hidden rounded-2xl border border-border bg-[#090d12]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            fitView
            minZoom={0.55}
            nodesFocusable
            aria-label="Interactive architecture map"
          >
            <Background color="#26313b" gap={18} size={1} />
            <Controls position="bottom-right" showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="#26313b" maskColor="rgba(9,13,18,.82)" />
          </ReactFlow>
        </div>
        {selected ? (
          <aside className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Network className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="label-mono">Selected node</p>
                <h3 className="mt-1 text-lg">{selected.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {selected.plainExplanation}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.files.map((file) => (
                    <a
                      key={file}
                      href={`${repoUrl}/blob/HEAD/${file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-full truncate rounded-lg border border-border bg-[#0e141b] px-3 py-2 font-mono text-[0.6875rem] text-[#a9bccb] transition-colors hover:border-primary/50"
                    >
                      {file}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
