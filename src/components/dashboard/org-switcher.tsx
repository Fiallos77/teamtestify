"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function OrgSwitcher() {
  const organizations = useQuery(api.organizations.listMine);
  const activeOrg = useQuery(api.organizations.getActive);
  const setActive = useMutation(api.organizations.setActive);

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
