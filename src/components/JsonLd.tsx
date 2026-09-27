// Structured data for search engines (schema.org JSON-LD), as the Next.js
// guide recommends: "<" escaped so content can't close the script tag.
export default function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
