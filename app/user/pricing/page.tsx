"use client";

import PricingView from "@/components/showroom/PricingView";

export default function UserPricingPage() {
  return (
    <PricingView
      draftKey="showroom_draft"
      leadIdKey="lead_id"
      redirectNoDraft="/user/showroom"
      backHrefNoDraft="/user/showroom"
      backHrefSaved="/user/portal/albums"
      source="showroom"
    />
  );
}
