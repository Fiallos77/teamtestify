import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PLAN_UPGRADE_HREF } from "./plan-limit-upgrade";

// Plan-limit upgrade prompt, modeled on AiQuotaUpgradeAlert: an always-visible
// alert (not a silent failure) that states which limit was hit and offers a
// one-click path to the Plan tab. Reused wherever a server-side entitlement
// guard blocks an action (e.g. creating a space beyond the plan's cap). The
// message is the server's own error text, which already names the limit.
export function PlanLimitUpgradeAlert({
  title = "Plan limit reached",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Alert>
      <Sparkles />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <Button render={<Link href={PLAN_UPGRADE_HREF} />} size="sm" className="mt-1">
          Upgrade to Pro
        </Button>
      </AlertDescription>
    </Alert>
  );
}
