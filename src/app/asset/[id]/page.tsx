"use client";

import { AuthGate } from "@/features/auth/components/auth-gate";
import { AssetDetail } from "@/features/assets/components/asset-detail";
import { AmbientPage } from "@/components/layout/ambient-page";
import { use } from "react";

type AssetPageProps = {
  params: Promise<{ id: string }>;
};

export default function AssetPage({ params }: AssetPageProps) {
  const { id } = use(params);

  return (
    <AuthGate nextPath={`/asset/${id}`}>
      <AmbientPage variant="workspace">
        <AssetDetail id={id} />
      </AmbientPage>
    </AuthGate>
  );
}
