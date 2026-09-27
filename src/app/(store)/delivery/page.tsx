import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";

export const metadata: Metadata = { title: "Delivery" };

export default function DeliveryPage() {
  return (
    <PolicyPage title="Delivery" updated="26 September 2026">
      <p>Delivery is free to mainland UK addresses. We can&rsquo;t currently deliver to the Scottish Highlands and islands, Northern Ireland, the Isle of Man, the Channel Islands or other offshore addresses.</p>
      <h2>How long it takes</h2>
      <p>Each product page shows its usual delivery time. Your furniture is sent directly from our supplier&rsquo;s warehouse, so items in one order may arrive separately.</p>
      <h2>Courier and two-person delivery</h2>
      <ul>
        <li><strong>Courier delivery</strong> is to your front door. Someone needs to be in to accept it.</li>
        <li><strong>Two-person delivery</strong> is for large or heavy pieces. The team will contact you to arrange a day.</li>
      </ul>
      <h2>When it arrives</h2>
      <p>Please check your delivery before signing for it. If anything is damaged or missing, tell us within 48 hours with photos and we&rsquo;ll arrange a replacement or refund.</p>
    </PolicyPage>
  );
}
