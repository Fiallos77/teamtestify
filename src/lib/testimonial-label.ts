type LabelableTestimonial = {
  _id: string;
  authorName: string;
  textContent?: string | null;
};

export function testimonialLabel(
  testimonials: LabelableTestimonial[] | undefined,
  id: string
) {
  const t = testimonials?.find((t) => t._id === id);
  if (!t) return id;
  return t.textContent ? `${t.authorName} — ${t.textContent.slice(0, 40)}` : t.authorName;
}
