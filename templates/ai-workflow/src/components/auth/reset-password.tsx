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
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ResetPasswordProps = {
  token: string | null;
  error: string | null;
};

export function ResetPassword({ token, error }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (error || !token) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="size-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Invalid link</CardTitle>
          <CardDescription className="text-base">
            {error === "INVALID_TOKEN"
              ? "This password reset link is invalid or has expired."
              : "Something went wrong. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full">Request new link</Button>
          </Link>
          <Link href="/sign-in" className="w-full">
            <Button variant="ghost" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
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
          <CardTitle className="text-2xl font-bold">Password reset!</CardTitle>
          <CardDescription className="text-base">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Button className="w-full" onClick={() => router.push("/sign-in")}>
            Sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
