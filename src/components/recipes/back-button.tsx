"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackButton() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    if (window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href="/#recipes"
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to recipes
    </Link>
  );
}
