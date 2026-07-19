// Copy + gating rule for the "no approved testimonials yet" locked state on
// the Widgets page. Kept free of React/JSX so it's unit-testable and shared
// with the locked-state component.
export const WIDGETS_LOCKED_MESSAGE = "Approve your first testimonial to create widgets";

export function isWidgetsLocked(approvedCount: number): boolean {
  return approvedCount <= 0;
}
