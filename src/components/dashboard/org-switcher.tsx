"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function OrgSwitcher() {
  const organizations = useQuery(api.organizations.listMine);
  const activeOrg = useQuery(api.organizations.getActive);
  const setActive = useMutation(api.organizations.setActive);
  const createOrganization = useMutation(api.organizations.create);
  const [creating, setCreating] = useState(false);

  async function handleCreateNew() {
    const name = window.prompt("New organization name");
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const slug = `${slugify(name)}-${Date.now().toString(36)}`;
      await createOrganization({ name, slug });
    } finally {
      setCreating(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            {activeOrg?.name ?? "Select organization"}
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent>
        {organizations?.map((org) => (
          <DropdownMenuItem
            key={org._id}
            onClick={() => setActive({ organizationId: org._id })}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateNew} disabled={creating}>
          <Plus className="size-4" />
          New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
