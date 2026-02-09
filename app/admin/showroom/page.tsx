"use client";

import ShowroomForm from "@/components/showroom/ShowroomForm";

export default function AdminShowroomPage() {
  return (
    <ShowroomForm
      backHref="/admin/albums"
      pricingPath="/admin/pricing"
      draftKey="admin_showroom_draft"
      source="admin"
    />
  );
}
