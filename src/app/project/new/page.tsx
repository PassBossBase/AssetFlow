"use client";

import { useRouter } from "next/navigation";

import { AmbientPage } from "@/components/layout/ambient-page";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { ProjectForm } from "@/features/projects/components/project-form";

export default function NewProjectPage() {
  const router = useRouter();

  return (
    <AuthGate nextPath="/project/new">
      <AmbientPage variant="workspace">
        <main className="mx-auto max-w-2xl px-6 py-12">
          <ProjectForm onCreated={() => router.push("/dashboard")} />
        </main>
      </AmbientPage>
    </AuthGate>
  );
}
