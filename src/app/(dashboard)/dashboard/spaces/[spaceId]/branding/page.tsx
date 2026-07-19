import { redirect } from "next/navigation";

// Branding was absorbed into the unified space settings (Identity tab). This
// route is kept only to redirect any old bookmarks/links to its new home.
export default async function SpaceBrandingRedirect({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  redirect(`/dashboard/spaces/${spaceId}/settings?tab=identity`);
}
