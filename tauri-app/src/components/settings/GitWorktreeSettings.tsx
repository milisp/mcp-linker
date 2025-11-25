import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings/SettingsStore";

export function GitWorktreeSettings() {
  const { autoCommitGitWorktree, setAutoCommitGitWorktree } = useSettingsStore();

  return (
    <Card className="max-w-3xl my-6">
      <CardHeader>
        <CardTitle>Git Worktree</CardTitle>
        <CardDescription>
          Control whether Codexia automatically stages and commits task-specific worktrees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium">Auto-commit to worktrees</p>
            <p className="text-xs text-muted-foreground">
              When enabled, task completion events will prepare a conversation-specific git worktree,
              copy changes, and create a commit under <code>~/.codexia/worktrees</code>.
            </p>
          </div>
          <Switch
            checked={autoCommitGitWorktree}
            onCheckedChange={setAutoCommitGitWorktree}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Disable this if you prefer to manage git commits manually or operate on repositories that
          do not support detached worktrees.
        </p>
      </CardContent>
    </Card>
  );
}

export function SimpleGitWorktreeSettings() {
  const { autoCommitGitWorktree, setAutoCommitGitWorktree } = useSettingsStore();

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">Auto-commit to worktrees</p>
        <p className="text-xs text-muted-foreground">
          When enabled, task completion events will prepare a conversation-specific git worktree,
          copy changes, and create a commit under <code>~/.codexia/worktrees</code>.
        </p>
      </div>
      <Switch
        checked={autoCommitGitWorktree}
        onCheckedChange={setAutoCommitGitWorktree}
      />
    </div>
  );
}

