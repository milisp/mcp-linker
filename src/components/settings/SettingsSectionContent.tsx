import EncryptionKeyCard from "@/components/settings/EncryptionKeyCard";
import SecurityNoticeCard from "@/components/settings/SecurityNoticeCard";
import React from "react";
import LangSelect from "./LangSelect";
import LicenseCard from "./LicenseCard";

interface Key {
  id: string;
  name: string;
}

interface SettingsSectionContentProps {
  selectedSection: string;
  keys: Key[];
}

// Main content area for settings page, renders section content
const SettingsSectionContent: React.FC<SettingsSectionContentProps> = ({
  selectedSection,
  keys,
}) => {
  // Use zustand store for privacy state

  if (selectedSection === "encryption") {
    return (
      <div className="space-y-4">
        {keys.map((key) => (
          <EncryptionKeyCard
            key={key.id}
            keyId={key.id}
            keyName={key.name}
          />
        ))}
        {/* Security Notice always at the bottom */}
        <SecurityNoticeCard />
      </div>
    );
  }

  if (selectedSection === "general") {
    return (
      <div className="space-y-4">
        <LangSelect />
      </div>
    );
  }
  if (selectedSection === "license") {
    return <LicenseCard />;
  }

  // Add more sections here
  return null;
};

export default SettingsSectionContent;
