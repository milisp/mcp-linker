// HeaderEditor.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderEditorProps {
  header: Record<string, string>;
  headerValues: Record<string, string>;
  setHeaderValues: (values: Record<string, string>) => void;
  onHeaderChange: (key: string, value: string) => void;
}

export const HeaderEditor = ({
  header,
  headerValues,
  setHeaderValues,
  onHeaderChange,
}: HeaderEditorProps) => {
  const handleAddHeader = () => {
    const newKey = `key_${Date.now()}`;
    setHeaderValues({
      ...headerValues,
      [newKey]: "",
    });
    onHeaderChange(newKey, "");
  };

  return (
    <div className="grid gap-2">
      <div className="flex justify-between">
      <h2 className="text-foreground dark:text-gray-200">header</h2>
      <Button onClick={handleAddHeader}>addHeader</Button>
      </div>
      <div className="space-y-2">
        {Object.entries(headerValues).map(([key, value], headerIndex) => (
          <div
            key={headerIndex}
            className="flex items-center gap-2"
          >
              <Input
                className="col-span-1 dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  if (!newKey || newKey === key) return;

                  const value = headerValues[key];
                  const updatedHeaderValues = { ...headerValues };
                  delete updatedHeaderValues[key];
                  updatedHeaderValues[newKey] = value;
                  setHeaderValues(updatedHeaderValues);

                  // Clear old key and set new key in header
                  onHeaderChange(key, ""); 
                  onHeaderChange(newKey, value);
                }}
                required
              />
            <Input
              className="col-span-3 dark:bg-gray-800 dark:border-gray-500 dark:text-white"
              value={value}
              placeholder={header[key]}
              onChange={(e) => {
                const newValue = e.target.value;
                setHeaderValues({
                  ...headerValues,
                  [key]: newValue,
                });
                onHeaderChange(key, newValue);
              }}
              required
            />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const updatedHeaderValues = { ...headerValues };
                  delete updatedHeaderValues[key];
                  setHeaderValues(updatedHeaderValues);
                  onHeaderChange(key, "");
                }}
              >
                🗑️
              </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
