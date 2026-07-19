import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AI_QUOTA_LIMIT_MESSAGE, AI_UPGRADE_HREF } from "./ai-quota-upgrade";

// Free-tier upgrade prompt shown once the org has spent its monthly AI quota.
// Deliberately inline and always visible (not tucked behind a trigger) so it's
// obvious why the Generate button is disabled and what to do about it, rather
// than the feature silently going dead. Rendered by both the request assistant
// and the image generator.
export function AiQuotaUpgradeAlert() {
  return (
    <Alert>
      <Sparkles />
      <AlertTitle>AI limit reached</AlertTitle>
      <AlertDescription>
        <p>{AI_QUOTA_LIMIT_MESSAGE}</p>
        <Button nativeButton={false} render={<Link href={AI_UPGRADE_HREF} />} size="sm" className="mt-1">
          Upgrade to Pro
        </Button>
      </AlertDescription>
    </Alert>
  );
}
