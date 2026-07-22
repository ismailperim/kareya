import { notFound, redirect } from "next/navigation";

import { isDbConfigured } from "@/lib/db";
import { getSessionId } from "@/lib/meeting-repo";

import { MeetingRoom } from "./MeetingRoom";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.length < 8) {
    notFound();
  }

  // Rooms exist only for minted sessions (invite redemption or ops — KAR-42).
  // An unknown token lands at the invite door instead of an empty room shell.
  if (isDbConfigured && !(await getSessionId(token))) {
    redirect("/invite");
  }

  return <MeetingRoom token={token} />;
}
