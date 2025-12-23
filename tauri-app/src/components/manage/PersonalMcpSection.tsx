import { LocalTable } from "@/components/manage/LocalTable/index";
import { PersonalCloudTable } from "@/components/manage/PersonalCloudTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTier } from "@/hooks/useTier";
import { Cloud } from "lucide-react";

/**
 * Props for PersonalMcpSection component.
 */
interface PersonalMcpSectionProps {
  personalTab: string;
  setPersonalTab: (tab: string) => void;
  user: any;
  isAuthenticated: boolean;
  encryptionKey: string | null;
  navigate: (to: any) => void;
}

/**
 * Component for rendering the personal MCP server management tabs and tables.
 */
export function PersonalMcpSection({
  personalTab,
  setPersonalTab,
  user,
  isAuthenticated,
  encryptionKey,
  navigate,
}: PersonalMcpSectionProps) {
  const { canUseCloudSync } = useTier();

  return (
    <Tabs
      value={personalTab}
      onValueChange={setPersonalTab}
      className="h-full flex flex-col"
    >
      <TabsList className="grid grid-cols-2 gap-2 bg-secondary">
        <TabsTrigger value="personalLocal">Local</TabsTrigger>
        <TabsTrigger value="personalCloud">
          <Cloud />
          Cloud {!canUseCloudSync && "🔒"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="personalLocal" className="flex-1 min-h-0">
        <LocalTable user={user} isAuthenticated={isAuthenticated} />
      </TabsContent>
      <TabsContent value="personalCloud" className="flex-1 min-h-0">
        {isAuthenticated ? (
          <PersonalCloudTable />
        ) : !encryptionKey ? (
          <Button onClick={() => navigate("/settings")}>
            go to generate Encryption Key
          </Button>
        ) : (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            Please log in to view your personal cloud servers.
            <Button onClick={() => navigate("/auth")} className="mt-2">
              Login
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
