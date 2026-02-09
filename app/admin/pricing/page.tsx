"use client";

import PricingView from "@/components/showroom/PricingView";

export default function AdminPricingPage() {
  return (
    <PricingView
      draftKey="admin_showroom_draft"
      leadIdKey="lead_id"
      redirectNoDraft="/admin/showroom"
      backHrefNoDraft="/admin/showroom"
      backHrefSaved="/admin/albums"
      source="admin"
      afterSaveRedirect="/admin/albums"
    />
  );
}
