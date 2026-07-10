import Link from "next/link";

// convex/entitlements.ts's assertCanCreateSpace/assertCanPublish/
// assertCanPublishVideo errors all end with this phrase — used here to
// detect a plan-limit error and show an upgrade link instead of (or
// alongside) a plain error message.
const UPGRADE_MARKER = "Upgrade to Pro";

export function isUpgradeError(message: string): boolean {
  return message.includes(UPGRADE_MARKER);
}

export function ErrorWithUpgradeCta({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive">
      {message}
      {isUpgradeError(message) && (
        <>
          {" "}
          <Link href="/pricing" className="underline">
            View plans
          </Link>
        </>
      )}
    </p>
  );
}
