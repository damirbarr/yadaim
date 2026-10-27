import { config } from "./config";

/** Build a click-to-chat WhatsApp link (works without any API account). */
export function waLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const intl = digits.startsWith("972") ? digits : digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function appUrl(path: string) {
  return config.appUrl + path;
}
