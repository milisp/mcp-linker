import { FileChange } from "@/bindings/FileChange";
import { DiffViewer } from "@/components/DiffViewer";
import { Badge } from "@/components/ui/badge";

export const renderFileChanges = (changes: { [key: string]: FileChange }) => {
  return Object.entries(changes).map(([filePath, fileChange]) => (
    <div key={filePath} className="space-y-1">
      {fileChange.type === "add" ? (
        <>
          <span className="bg-green-200 dark:bg-green-500 p-0.5 rounded">
            Add
          </span>
          <Badge variant="secondary">{filePath}</Badge>
        </>
      ) : fileChange.type === "delete" ? (
        <>
          <span className="bg-red-200 dark:bg-red-500 p-0.5 rounded">
            Delete
          </span>
          <Badge variant="secondary">{filePath}</Badge>
        </>
      ) : fileChange.type === "update" ? (
        <>
          <div>
            <Badge>update</Badge>
            {fileChange.move_path && (
              <span className="text-xs text-muted-foreground">
                Move path: {fileChange.move_path}
              </span>
            )}
            <Badge variant="secondary">{filePath}</Badge>
          </div>
          <DiffViewer unifiedDiff={fileChange.unified_diff} />
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No content or diff available.
        </p>
      )}
    </div>
  ));
};
