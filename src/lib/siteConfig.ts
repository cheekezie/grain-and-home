// Who the business is: set per deployment in env, so one codebase can run
// several shops. What the shop sells and says (tagline, hero, categories,
// delivery area) is in the database: Admin → Shop settings.
//
// The trading name and a contact email are required; the footer and policy
// pages flag them while unset. A postal address is shown only if one is set
// (the owner chose not to publish one, 2026-09-26).
// Each variable is named in full: Next only puts NEXT_PUBLIC_* values into
// browser code when written out literally (process.env[k] is empty there).
const env = (v: string | undefined) => v?.trim() || undefined;

export const siteConfig = {
  name: env(process.env.NEXT_PUBLIC_STORE_NAME) ?? "My shop",
  url: env(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000",
  business: {
    legalName: env(process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME),
    companyNumber: env(process.env.NEXT_PUBLIC_COMPANY_NUMBER),
    vatNumber: env(process.env.NEXT_PUBLIC_VAT_NUMBER),
    address: env(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS),
    email: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
    phone: env(process.env.NEXT_PUBLIC_SUPPORT_PHONE),
  },
};

export const businessDetailsMissing = () => !siteConfig.business.legalName || !siteConfig.business.email;
