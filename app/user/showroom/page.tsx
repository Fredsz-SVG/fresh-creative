"use client";

import ShowroomForm from "@/components/showroom/ShowroomForm";

export default function UserShowroomPage() {
  return (
    <ShowroomForm
      backHref="/user/albums"
      pricingPath="/user/pricing"
      draftKey="showroom_draft"
      source="showroom"
    />
  );
}
