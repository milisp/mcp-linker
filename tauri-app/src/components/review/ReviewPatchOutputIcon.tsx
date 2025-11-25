import { Check, X } from "lucide-react";

interface ReviewPatchOutputItemProps {
  patch_output: string;
}

const getPatchOutputText = (patch_output: string) => {
  try {
    const parsed = JSON.parse(patch_output);
    if (
      parsed &&
      typeof parsed === "object" &&
      "output" in parsed &&
      typeof parsed.output === "string"
    ) {
      return parsed.output;
    }
    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {
    // fallback to raw string when parsing fails
  }
  return patch_output;
};

export function ReviewPatchOutputIcon({
  patch_output,
}: ReviewPatchOutputItemProps) {
  const output = getPatchOutputText(patch_output);
  return (
    <>
      {output.includes("Success") ? (
        <Check className="bg-green-200 dark:bg-green-500" size={16} />
      ) : (
        <X className="bg-red-200 dark:bg-red-500" size={16} />
      )}
    </>
  );
}
