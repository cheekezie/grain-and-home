import { notFound } from "next/navigation";

// Unknown admin addresses get the admin's own 404 (not-found.tsx), inside the admin.
export default function MissingAdminPage() {
  notFound();
}
