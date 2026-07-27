export function isBetaModeValue(value: string | undefined): boolean {
  return value === "true";
}

export const BETA_MODE = isBetaModeValue(process.env.NEXT_PUBLIC_BETA_MODE);
