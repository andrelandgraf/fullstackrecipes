"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  MessageSquare,
  LogIn,
  Github,
  Mail,
  Lock,
  BrainIcon,
  CheckCircleIcon,
  WrenchIcon,
  Send,
  ChevronDownIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function MockLoginCard() {
  return (
    <Card className="w-[280px] shadow-xl border-border/50 bg-card/95 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-center">
          Sign in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="mock-email" className="text-xs">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              id="mock-email"
              type="email"
              placeholder="you@example.com"
              className="pl-8 h-8 text-xs"
              disabled
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mock-password" className="text-xs">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              id="mock-password"
              type="password"
              placeholder="••••••••"
              className="pl-8 h-8 text-xs"
              disabled
            />
          </div>
        </div>
        <Button size="sm" className="w-full h-8 text-xs" disabled>
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}

function MockMessage({
  role,
  children,
  className,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        role === "user" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[85%] text-xs leading-relaxed",
          role === "user"
            ? "rounded-lg bg-secondary px-3 py-2 text-foreground"
            : "text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MockReasoning() {
  return (
    <div className="flex items-center gap-1.5 text-primary text-xs">
      <BrainIcon className="size-3.5" />
      <span>Thought for 3 seconds</span>
      <ChevronDownIcon className="size-3.5" />
    </div>
  );
}

function MockSources() {
  return (
    <Sources className="text-xs mb-0">
      <SourcesTrigger count={1} className="text-xs" />
      <SourcesContent>
        <Source
          href="https://fullstackrecipes.com"
          title="fullstackrecipes.com"
        />
      </SourcesContent>
    </Sources>
  );
}

function MockTool() {
  return (
    <div className="rounded-md border border-border/50 bg-card/50">
      <div className="flex items-center justify-between gap-3 p-2">
        <div className="flex items-center gap-1.5">
          <WrenchIcon className="size-3 text-muted-foreground" />
          <span className="font-medium text-xs">countCharacters</span>
          <Badge
            className="gap-1 rounded-full text-[10px] px-1.5 py-0"
            variant="secondary"
          >
            <CheckCircleIcon className="size-2.5 text-green-600" />
            Completed
          </Badge>
        </div>
      </div>
      <div className="border-t border-border/50 p-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
          Result
        </div>
        <div className="rounded bg-muted/50 p-1.5 font-mono text-[10px] text-muted-foreground">
          {`{ "count": 156, "remaining": 124 }`}
        </div>
      </div>
    </div>
  );
}

function MockChatWindow() {
  return (
    <Card className="w-[340px] shadow-2xl border-border/50 bg-card/95 backdrop-blur overflow-hidden">
      {/* Chat messages */}
      <CardContent className="p-3 space-y-3 h-[320px] overflow-y-auto">
        <MockMessage role="user">
          I&apos;m launching fullstackrecipes.com
        </MockMessage>

        <MockMessage role="assistant">
          <MockReasoning />
        </MockMessage>

        <MockMessage role="assistant">
          <MockSources />
        </MockMessage>

        <MockMessage role="assistant">
          <MockTool />
        </MockMessage>

        <MockMessage role="assistant">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px]">
              Here&apos;s a draft for your launch:
            </p>
            <div className="rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed">
              Just shipped fullstackrecipes.com 🎉
              <br />
              <br />
              Full stack recipes for your Next.js AI apps - check it out now!
            </div>
          </div>
        </MockMessage>
      </CardContent>

      {/* Chat input */}
      <div className="border-t border-border/50 p-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            className="h-8 text-xs flex-1"
            disabled
          />
          <Button size="icon" className="h-8 w-8 shrink-0" disabled>
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Demo() {
  return (
    <section className="border-b border-border/50 py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        {/* CTA Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Try it yourself
          </h2>
          <p className="mb-6 text-muted-foreground">
            A full-featured AI chat app using all patterns from the docs.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 font-medium">
              <Link href="/sign-in">
                <LogIn className="h-4 w-4" />
                Sign into demo app
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 font-medium"
            >
              <a
                href="https://github.com/andrelandgraf/fullstackrecipes"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Mock UI showcase */}
        <div className="mb-32 flex justify-center">
          <div
            className="relative h-[440px] w-full max-w-[500px]"
            style={{ perspective: "1000px" }}
          >
            {/* Login card - background, tilted, comes to front on hover */}
            <div
              className="absolute top-8 left-0 z-10 transition-all duration-500 hover:z-30 hover:translate-x-4 hover:-translate-y-4 hover:scale-105"
              style={{
                transform: "rotateY(15deg) rotateX(5deg) translateZ(-50px)",
                transformStyle: "preserve-3d",
              }}
            >
              <MockLoginCard />
            </div>

            {/* Chat window - foreground */}
            <div
              className="absolute top-0 right-0 z-20 transition-all duration-500 hover:-translate-x-2 hover:translate-y-2"
              style={{
                transform: "rotateY(-5deg) rotateX(2deg) translateZ(50px)",
                transformStyle: "preserve-3d",
              }}
            >
              <MockChatWindow />
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="mx-auto max-w-2xl">
          <h3 className="mb-6 text-center text-lg font-semibold">
            Every pattern in action
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Authentication</strong> with
                Better Auth, sessions, and email verification
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Persistent chat</strong>{" "}
                using Neon serverless Postgres and Drizzle ORM
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">AI SDK</strong> with
                streaming, tool calls, and reasoning
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Resumable chats</strong>{" "}
                that pick up right where you left off
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
