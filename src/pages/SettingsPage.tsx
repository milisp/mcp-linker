import SettingsSectionContent from "@/components/settings/SettingsSectionContent";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/useUpdateStore";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Key {
  id: string;
  name: string;
}


const DEFAULT_KEYS: Key[] = [{ id: "personal", name: "Personal" }];

export default function SettingPage() {
    const { t } = useTranslation();
  
  const SECTIONS = [
    { id: "general", label: t("general", "General") },
    { id: "encryption", label: t("encryption", "Encryption") },
    { id: "license", label: t("license.title") },
  ];
  const [selectedSection, setSelectedSection] = useState<string>("general");
  const { isChecking, triggerManualCheck } = useUpdateStore();

  // Main render
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <Button
            variant="outline"
            disabled={isChecking}
            onClick={() => triggerManualCheck()}
          >
            {isChecking ? "Checking…" : "Check for Updates"}
          </Button>
        </div>
      </div>
      <div className="flex gap-8">
        {/* Sidebar navigation */}
        <SettingsSidebar
          sections={SECTIONS}
          selectedSection={selectedSection}
          onSelectSection={setSelectedSection}
        />
        {/* Main content area */}
        <div className="flex-1 space-y-6">
          <SettingsSectionContent
            selectedSection={selectedSection}
            keys={DEFAULT_KEYS}
          />
        </div>
      </div>
    </div>
  );
}

