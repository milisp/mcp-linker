import { DxtCard } from "@/components/dxt";
import {
  getAllManifests,
  initTable,
  searchManifests,
} from "@/components/dxt/db";
import autoImportManifests from "@/components/dxt/db/autoImport";
import { DxtManifestSchema } from "@/schemas";
import * as Progress from "@radix-ui/react-progress";
import { useEffect, useState } from "react";
import { z } from "zod";

// Utility to remove 'id' and convert nulls to undefined
function normalizeManifest(obj: any) {
  const { id, ...rest } = obj;
  for (const key in rest) {
    if (rest[key] === null) rest[key] = undefined;
  }
  return { id, ...rest };
}

export default function DxtPage() {
  const [dxtList, setDxtList] = useState<z.infer<typeof DxtManifestSchema>[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<{ step: number; total: number } | null>(null);

  // Ensure table is initialized and auto import manifests if needed
  useEffect(() => {
    (async () => {
      await initTable();
      // Auto import manifests if table is empty
      try {
        await autoImportManifests((step, total) => setProgress({ step, total }));
        setProgress(null); // Hide progress bar after import
      } catch (err) {
        setProgress(null);
        console.error("Failed to auto import manifests:", err);
      }
      getAllManifests().then((result) => {
        const normalized = result.map(normalizeManifest);
        try {
          setDxtList(DxtManifestSchema.array().parse(normalized));
        } catch (e) {
          console.error("Zod parse error:", e, normalized);
          setDxtList([]);
        }
      });
    })();
  }, []);

  // Search
  async function handleSearch() {
    if (search.trim() === "") {
      getAllManifests().then((result) => {
        const normalized = result.map(normalizeManifest);
        try {
          setDxtList(DxtManifestSchema.array().parse(normalized));
        } catch (e) {
          console.error("Zod parse error:", e, normalized);
          setDxtList([]);
        }
      });
    } else {
      searchManifests(search).then((result) => {
        const normalized = result.map(normalizeManifest);
        try {
          setDxtList(DxtManifestSchema.array().parse(normalized));
        } catch (e) {
          console.error("Zod parse error:", e, normalized);
          setDxtList([]);
        }
      });
    }
  }

  return (
    <div className="p-2">
      {/* progress bar */}
      {progress && (
        <div className="mb-4">
          <Progress.Root value={progress.step} max={progress.total} className="h-2 bg-gray-200 rounded overflow-hidden">
            <Progress.Indicator
              className="bg-green-500 h-2 rounded"
              style={{ width: `${(progress.step / progress.total) * 100}%`, transition: 'width 0.3s' }}
            />
          </Progress.Root>
          <div className="text-xs text-gray-500 mt-1">
            Step {progress.step} of {progress.total}
          </div>
        </div>
      )}
      {/* action */}
      <div className="flex gap-2 mb-4">
        <input
          className="border px-2 py-1 rounded"
          placeholder="Search by name or keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          className="px-3 py-1 bg-green-500 text-white rounded"
          onClick={handleSearch}
        >
          Search
        </button>
        <button
          className="px-3 py-1 bg-gray-400 text-white rounded"
          onClick={async () => {
            setSearch("");
            getAllManifests().then((result) => {
              const normalized = result.map(normalizeManifest);
              try {
                setDxtList(DxtManifestSchema.array().parse(normalized));
              } catch (e) {
                console.error("Zod parse error:", e, normalized);
                setDxtList([]);
              }
            });
          }}
        >
          Reset
        </button>
      </div>
      {/* Grid layout for DXT cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {dxtList.map((dxt, idx) => (
          <DxtCard key={idx} dxt={dxt} />
        ))}
      </div>
    </div>
  );
}
