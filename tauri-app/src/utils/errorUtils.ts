export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    console.error("Failed to stringify error:", jsonError);
    return String(error);
  }
}
