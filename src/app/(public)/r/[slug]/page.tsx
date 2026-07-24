import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { CollectionForm } from "./collection-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await fetchQuery(api.public.getSpaceBySlug, { publicSlug: slug });
  if (!space) {
    return { title: "Testimonial Studio" };
  }

  const title = space.formConfig.headline || space.name;
  const description = space.formConfig.subheading ?? `Share your experience with ${space.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(space.logoUrl ? { images: [space.logoUrl] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(space.logoUrl ? { images: [space.logoUrl] } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <CollectionForm slug={slug} />;
}
