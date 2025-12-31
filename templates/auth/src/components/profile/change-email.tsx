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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ChangeEmail() {
  const { data: session } = useSession();
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail) {
      toast.error("Please enter a new email address");
      return;
    }

    if (newEmail === session?.user.email) {
      toast.error("New email must be different from current email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: "/profile",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "A confirmation email has been sent to your current email address",
      );
      setNewEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
        <CardDescription>
          Update your email address. You&apos;ll need to verify both your
          current and new email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              type="email"
              value={session?.user.email || ""}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Change Email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
