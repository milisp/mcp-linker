"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddTeamMemberData, TeamMemberRole } from "@/types/team";
import { Mail, Plus } from "lucide-react";
import { useState } from "react";

interface AddTeamMemberFormProps {
  onAddMember: (newMember: AddTeamMemberData) => void;
  isAddingMember: boolean;
}

export function AddTeamMemberForm({
  onAddMember,
  isAddingMember,
}: AddTeamMemberFormProps) {
  const [newMemberData, setNewMemberData] = useState<AddTeamMemberData>({
    email: "",
    role: "MEMBER",
  });

  const handleAddClick = () => {
    onAddMember(newMemberData);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Member
      </h3>
      <div className="flex flex-row items-end justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter member's email"
            value={newMemberData.email}
            onChange={(e) =>
              setNewMemberData((prev) => ({ ...prev, email: e.target.value }))
            }
          />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={newMemberData.role}
              onValueChange={(value: TeamMemberRole) =>
                setNewMemberData((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddClick}
            disabled={isAddingMember || !newMemberData.email.trim()}
            className="h-10"
          >
            <Mail className="mr-2 h-4 w-4" />
            {isAddingMember ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
