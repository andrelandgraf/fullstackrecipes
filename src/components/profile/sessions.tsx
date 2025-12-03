"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export function Sessions() {
  const [loading, setLoading] = useState(false);

  const handleRevokeOtherSessions = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.revokeOtherSessions();

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("All other sessions have been signed out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active sessions across devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          If you notice any suspicious activity or want to secure your account,
          you can sign out from all other devices.
        </p>
        <Button
          variant="outline"
          onClick={handleRevokeOtherSessions}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out other devices
        </Button>
      </CardContent>
    </Card>
  );
}
