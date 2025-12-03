import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { VerifyEmailResult } from "@/components/auth/verify-email-result";

type SearchParams = Promise<{ token?: string; error?: string }>;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token, error } = await searchParams;

  let verificationResult: { success: boolean; error?: string } = {
    success: false,
  };

  if (error) {
    verificationResult = { success: false, error };
  } else if (token) {
    try {
      const result = await auth.api.verifyEmail({
        query: { token },
        headers: await headers(),
      });
      verificationResult = { success: !result.error };
    } catch {
      verificationResult = { success: false, error: "VERIFICATION_FAILED" };
    }
  } else {
    verificationResult = { success: false, error: "NO_TOKEN" };
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <VerifyEmailResult
        success={verificationResult.success}
        error={verificationResult.error}
      />
    </main>
  );
}
