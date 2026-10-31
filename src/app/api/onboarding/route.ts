import { dispensarOnboarding } from "@/lib/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Pular" no cartão de primeiros passos. */
export async function POST() {
  await dispensarOnboarding();
  return Response.json({ ok: true });
}
