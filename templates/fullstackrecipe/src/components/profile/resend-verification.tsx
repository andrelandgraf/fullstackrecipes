"use client";

import { useSession, authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function ResendVerification() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  if (!session || session.user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: "/profile",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Verification email sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-amber-600" />
          Verify Your Email
        </CardTitle>
        <CardDescription>
          Your email address has not been verified yet. Please check your inbox
          for a verification link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Button onClick={handleResend} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          Resend Verification Email
        </Button>
      </CardContent>
    </Card>
  );
}
