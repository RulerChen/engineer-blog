/**
 * Company names are typed by hand now, so whatever you enter is what shows. This
 * map only fixes up the casing of names that are easy to type in lowercase;
 * anything unrecognized passes through untouched.
 */
const DISPLAY_NAMES: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  openai: "OpenAI",
  linkedin: "LinkedIn",
  paypal: "PayPal",
  nvidia: "NVIDIA",
  aws: "AWS",
  ibm: "IBM",
  deepmind: "DeepMind",
  youtube: "YouTube",
  tiktok: "TikTok",
  line: "LINE",
};

export function sourceName(id: string): string {
  return DISPLAY_NAMES[id.toLowerCase()] ?? id;
}
