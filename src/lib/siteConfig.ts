// Everything that names or identifies the business lives here, so the
// working name can be changed in one place (or via env) later.
//
// The trading name and a contact email are required; the footer and policy
// pages flag them while unset. A postal address is shown only if one is set
// (the owner chose not to publish one, 2026-09-26).
const env = (k: string) => process.env[k]?.trim() || undefined;

export const siteConfig = {
  name: env("NEXT_PUBLIC_STORE_NAME") ?? "Grain & Home",
  tagline: "Furniture for real homes, delivered across mainland UK.",
  url: env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  business: {
    legalName: env("NEXT_PUBLIC_BUSINESS_LEGAL_NAME"),
    companyNumber: env("NEXT_PUBLIC_COMPANY_NUMBER"),
    vatNumber: env("NEXT_PUBLIC_VAT_NUMBER"),
    address: env("NEXT_PUBLIC_BUSINESS_ADDRESS"),
    email: env("NEXT_PUBLIC_SUPPORT_EMAIL"),
    phone: env("NEXT_PUBLIC_SUPPORT_PHONE"),
  },
  delivery: {
    /** Free delivery is built into prices; mainland UK only. */
    summary: "Free delivery to mainland UK addresses.",
  },
};

export const businessDetailsMissing = () => !siteConfig.business.legalName || !siteConfig.business.email;
