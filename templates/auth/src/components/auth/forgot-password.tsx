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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import Link from "next/link";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-base">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent
            password reset instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Didn&apos;t receive the email? Check your spam folder or try again
            with a different email address.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSuccess(false)}
          >
            Try another email
          </Button>
          <Link href="/sign-in" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="size-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t pt-6">
        <Link href="/sign-in" className="w-full">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="size-4" />
            Back to sign in
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
