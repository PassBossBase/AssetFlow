import { ProjectsDashboard } from "@/features/projects/components/projects-dashboard";

type DashboardProjectsPageProps = {
  searchParams: Promise<{ create?: string }>;
};

export default async function DashboardProjectsPage({ searchParams }: DashboardProjectsPageProps) {
  const { create } = await searchParams;

  return <ProjectsDashboard initialCreateOpen={create === "1"} />;
}
