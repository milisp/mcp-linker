import { Button } from "@/components/ui/button";
import { useFolderStore } from "@/stores/useFolderStore";
import { getErrorMessage } from "@/utils/errorUtils";
import { invoke } from "@tauri-apps/api/core";
import { FileText, GitBranch, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface GitStatus {
	staged: string[];
	modified: string[];
	untracked: string[];
	deleted: string[];
	renamed: string[];
	conflicted: string[];
}

interface FileWithStatus {
	path: string;
	status: string;
	statusColor: string;
}

interface GitStatusViewProps {
	currentFolder?: string;
	onDiffClick?: (path: string) => void;
}

export function GitStatusView({ currentFolder, onDiffClick }: GitStatusViewProps) {
	const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { currentFolder: storeFolder } = useFolderStore();

	const loadGitStatus = async (path?: string) => {
		setLoading(true);
		setError(null);

		try {
			const targetPath = path || currentFolder || storeFolder;
			if (!targetPath) {
				setError("No folder selected");
				return;
			}

			const result = await invoke<GitStatus>("get_git_status", {
				directory: targetPath,
			});
			setGitStatus(result);
                } catch (err) {
                        setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadGitStatus();
	}, [currentFolder, storeFolder]);

	if (loading) {
		return (
			<div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
				<RefreshCw className="w-4 h-4 animate-spin" />
				Loading git status...
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">{error}</p>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="mt-2"
				>
					<RefreshCw className="w-4 h-4 mr-1" />
					Retry
				</Button>
			</div>
		);
	}

	if (!gitStatus) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">Not a git repository</p>
			</div>
		);
	}

	const allFiles: FileWithStatus[] = [
		...gitStatus.conflicted.map(path => ({ path, status: '!', statusColor: 'text-red-700' })),
		...gitStatus.staged.map(path => ({ path, status: 'A', statusColor: 'text-green-600' })),
		...gitStatus.modified.map(path => ({ path, status: 'M', statusColor: 'text-yellow-600' })),
		...gitStatus.deleted.map(path => ({ path, status: 'D', statusColor: 'text-red-500' })),
		...gitStatus.renamed.map(path => ({ path, status: 'R', statusColor: 'text-blue-500' })),
		...gitStatus.untracked.map(path => ({ path, status: 'U', statusColor: 'text-green-500' }))
	];

	if (allFiles.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">Working tree clean</p>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="mt-2"
				>
					<RefreshCw className="w-4 h-4 mr-1" />
					Refresh
				</Button>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col">
			<div className="flex items-center justify-between px-3 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<h3 className="font-medium text-sm">Source control</h3>
				</div>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="p-1 h-auto"
				>
					<RefreshCw className="w-3 h-3" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-3">
				{allFiles.map((file, index) => {
					const handleClick = () => {
						onDiffClick?.(file.path);
					};

					return (
						<div
							key={index}
							className="flex items-center justify-between text-sm py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
							onClick={handleClick}
							title="Click to view diff"
						>
							<div className="flex items-center gap-2 flex-1 min-w-0">
								<FileText className="w-3 h-3 flex-shrink-0" />
								<span className="truncate">{file.path}</span>
							</div>
							<span className={`${file.statusColor} font-mono text-xs font-semibold ml-2 flex-shrink-0`}>
								{file.status}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}