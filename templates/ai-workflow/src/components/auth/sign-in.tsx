"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Triangle,
  AlertCircle,
  Send,
} from "lucide-react";
import { signIn, authClient } from "@/lib/auth/client";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SignIn({
  showVercelSignIn = false,
}: {
  showVercelSignIn?: boolean;
} = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  const handleVercelSignIn = async () => {
    await signIn.social(
      {
        provider: "vercel",
        callbackURL: "/chats",
      },
      {
        onRequest: () => setSocialLoading(true),
        onResponse: () => setSocialLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    );
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/sign-in",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Verification email sent! Please check your inbox.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotVerified(false);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    await signIn.email(
      {
        email,
        password,
        rememberMe,
        callbackURL: "/chats",
      },
      {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          const errorMessage = ctx.error.message.toLowerCase();
          if (
            errorMessage.includes("email not verified") ||
            errorMessage.includes("verify your email")
          ) {
            setEmailNotVerified(true);
          } else {
            toast.error(ctx.error.message);
          }
        },
        onSuccess: () => router.push("/chats"),
      },
    );
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showVercelSignIn && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleVercelSignIn}
              disabled={socialLoading || loading}
            >
              {socialLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Triangle className="size-4 fill-current" />
                  Sign in with Vercel
                </>
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}
        {emailNotVerified && (
          <div className="rounded-lg border border-amber-600/30 bg-amber-950/50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-2">
                <p className="font-medium text-amber-200">Email not verified</p>
                <p className="text-sm text-amber-200/70">
                  Please verify your email address before signing in. Check your
                  inbox for a verification link.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-0"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Resend verification email
                </Button>
              </div>
            </div>
          </div>
        )}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember me for 30 days
            </Label>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || socialLoading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t pt-6">
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
