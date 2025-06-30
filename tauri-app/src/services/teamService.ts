import { api } from "@/lib/api";
import { TeamWithRoleResponse } from "@/types/team";

// Fetch all teams accessible by the current user (owned + joined)
export const fetchMyTeams = async (): Promise<TeamWithRoleResponse[]> => {
  const { data } = await api.get("/teams/my_teams");
  return data.teams;
};

// Create a new team
export const createTeam = async (
  name: string,
  description?: string,
): Promise<void> => {
  await api.post(`/teams/`, {
    name: name.trim(),
    description: description?.trim() || undefined,
  });
};

// Update an existing team
export const updateTeam = async (
  teamId: string,
  name: string,
  description?: string,
): Promise<void> => {
  const params = new URLSearchParams();
  params.append("name", name.trim());
  if (description?.trim()) {
    params.append("description", description.trim());
  }
  await api.put(`/teams/${teamId}?${params.toString()}`);
};

// Delete a team
export const deleteTeam = async (teamId: string): Promise<void> => {
  await api.delete(`/teams/${teamId}`);
};
