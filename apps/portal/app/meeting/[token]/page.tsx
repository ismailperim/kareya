import { notFound } from "next/navigation";
import { MeetingRoom } from "./MeetingRoom";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // MVP token check: empty/too-short token = no access. Real validation
  // (account-bound, single-use token via Neon) and hardening come in a
  // later ticket (with security-reviewer).
  if (!token || token.length < 8) {
    notFound();
  }

  return <MeetingRoom token={token} />;
}
