import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { WidgetEmbed } from "./widget-embed";

type Props = { params: Promise<{ widgetId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { widgetId } = await params;
  const meta = await fetchQuery(api.embedPublic.getWidgetMeta, {
    widgetId: widgetId as Id<"widgets">,
  });
  if (!meta) {
    return { title: "Testimonial Studio" };
  }

  return {
    title: meta.spaceName,
    description: meta.headline,
    openGraph: { title: meta.spaceName, description: meta.headline },
    twitter: { card: "summary", title: meta.spaceName, description: meta.headline },
  };
}

export default async function EmbedWidgetPage({ params }: Props) {
  const { widgetId } = await params;
  return <WidgetEmbed widgetId={widgetId} />;
}
