import { AmbientPage } from "@/components/layout/ambient-page";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { ProjectDetail } from "@/features/projects/components/project-detail";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <AuthGate nextPath={`/project/${id}`}>
      <AmbientPage variant="workspace">
        <ProjectDetail id={id} />
      </AmbientPage>
    </AuthGate>
  );
}
