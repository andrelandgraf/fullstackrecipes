"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useState } from "react";

function MockLoginCard() {
  return (
    <Card className="w-[320px] sm:w-[380px] p-6 shadow-2xl border-2 bg-card/95 backdrop-blur-sm">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Access your AI-powered workspace
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mock-email" className="text-sm">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="mock-email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                defaultValue="demo@aiapp.com"
                disabled
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mock-password" className="text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="mock-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                defaultValue="********"
                disabled
              />
            </div>
          </div>
          <Button className="w-full" disabled>
            Sign in
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <span className="text-primary font-medium">Sign up for free</span>
          </p>
        </div>
      </div>
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
          "max-w-[85%] text-sm leading-relaxed",
          role === "user"
            ? "rounded-2xl bg-secondary px-4 py-3 text-foreground shadow-sm"
            : "text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MockReasoning() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-primary text-sm w-full"
      >
        <BrainIcon className="size-4" />
        <span className="font-medium">Thought for 3 seconds</span>
        <ChevronDownIcon
          className={cn(
            "size-4 ml-auto transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>
      {isExpanded && (
        <div className="text-xs text-muted-foreground pl-6 space-y-1.5">
          <p>Researching fullstackrecipes.com to understand the product...</p>
          <p>
            Found: Next.js AI app recipes, authentication patterns, chat
            persistence...
          </p>
          <p>Drafting announcement - keeping it concise for social media...</p>
        </div>
      )}
    </div>
  );
}

function MockSources() {
  return (
    <Sources className="text-sm mb-0">
      <SourcesTrigger count={1} className="text-sm" />
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
    <div className="rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <WrenchIcon className="size-3.5 text-muted-foreground" />
          </div>
          <span className="font-medium text-sm font-mono">countCharacters</span>
          <Badge
            className="gap-1 rounded-full text-xs px-2 py-0.5"
            variant="secondary"
          >
            <CheckCircleIcon className="size-3 text-green-600" />
            Completed
          </Badge>
        </div>
      </div>
      <div className="border-t border-border/50 p-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">
          Result
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 font-mono text-xs text-muted-foreground">
          {`{ "count": 156, "remaining": 124 }`}
        </div>
      </div>
    </div>
  );
}

function MockChatWindow() {
  return (
    <Card className="w-[320px] sm:w-[460px] max-h-[420px] flex flex-col shadow-2xl border-2 bg-card/95 backdrop-blur-sm">
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <MockMessage role="user">
          I&apos;m launching fullstackrecipes.com - help me write a launch
          announcement
        </MockMessage>

        <div className="space-y-3">
          <MockMessage role="assistant">
            <MockReasoning />
          </MockMessage>

          <MockMessage role="assistant">
            <MockTool />
          </MockMessage>

          <MockMessage role="assistant">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Here&apos;s a draft for your launch:
              </p>
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed border">
                Just shipped fullstackrecipes.com
                <br />
                <br />
                Full stack recipes for your Next.js AI apps - check it out now!
              </div>
            </div>
          </MockMessage>

          <MockMessage role="assistant">
            <MockSources />
          </MockMessage>
        </div>
      </div>

      {/* Chat input - fixed at bottom */}
      <div className="flex items-center gap-2 p-4 pt-2 border-t">
        <Input placeholder="Type a message..." className="flex-1" disabled />
        <Button size="icon" className="shrink-0" disabled>
          <Send className="size-4" />
        </Button>
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
            See it in action
          </h2>
          <p className="mb-6 text-muted-foreground">
            A full-featured AI chat app building on top of the recipes &
            patterns.
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

        {/* Mock UI showcase - Overlapping cards layout */}
        <div className="relative mb-16 flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-[680px] md:h-[460px] flex items-center justify-center">
            {/* Login card - Top on mobile, Left side on desktop, rotated */}
            <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 md:left-[42%] md:top-[55%] md:-translate-y-1/2 md:-translate-x-1/2 transition-all duration-500 ease-out -rotate-3 md:-rotate-6 hover:rotate-0 active:rotate-0 hover:scale-105 active:scale-105 z-10 hover:z-30 active:z-30">
              <MockLoginCard />
            </div>

            {/* Chat window - Bottom on mobile, Right side on desktop, rotated, overlapping */}
            <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 md:left-auto md:right-[42%] md:top-[55%] md:-translate-y-1/2 md:translate-x-1/2 transition-all duration-500 ease-out rotate-2 md:rotate-3 hover:rotate-0 active:rotate-0 hover:scale-105 active:scale-105 z-20 hover:z-30 active:z-30">
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
                <strong className="text-foreground">
                  Durable & resumable workflows
                </strong>{" "}
                with the Workflow Development Kit
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Chat persistence</strong>{" "}
                with the AI SDK, Neon and Drizzle
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  Stripe subscription sync
                </strong>{" "}
                with Neon and Drizzle
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Authentication</strong> with
                Better Auth, Neon and Drizzle
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
