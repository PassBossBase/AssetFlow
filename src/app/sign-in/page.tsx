import { ConvexSetupNotice } from "@/features/auth/components/auth-gate";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  if (process.env.NEXT_PUBLIC_CONVEX_URL === undefined) {
    return <ConvexSetupNotice />;
  }

  return <AuthPageShell nextPath={nextPath} />;
}
