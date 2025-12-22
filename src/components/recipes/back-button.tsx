"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackButton() {
  return (
    <Link
      href="/#recipes"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to recipes
    </Link>
  );
}
