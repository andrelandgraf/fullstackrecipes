"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import Link from "next/link";

type VerifyEmailResultProps = {
  success: boolean;
  error?: string;
};

export function VerifyEmailResult({ success, error }: VerifyEmailResultProps) {
  if (success) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Email verified!</CardTitle>
          <CardDescription className="text-base">
            Your email address has been successfully verified. You can now sign
            in to your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Link href="/sign-in" className="w-full">
            <Button className="w-full">Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const errorMessage = (() => {
    switch (error) {
      case "INVALID_TOKEN":
        return "This verification link is invalid or has expired.";
      case "NO_TOKEN":
        return "No verification token was provided.";
      case "VERIFICATION_FAILED":
        return "Email verification failed. Please try again.";
      default:
        return "Something went wrong during verification.";
    }
  })();

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Verification failed
        </CardTitle>
        <CardDescription className="text-base">{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>
          If your link has expired, you can request a new verification email
          after signing in.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t pt-6">
        <Link href="/sign-in" className="w-full">
          <Button className="w-full">
            <Mail className="size-4" />
            Sign in to resend
          </Button>
        </Link>
        <Link href="/" className="w-full">
          <Button variant="ghost" className="w-full">
            Back to home
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
