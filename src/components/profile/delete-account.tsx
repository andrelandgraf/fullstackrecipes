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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;

    setLoading(true);
    try {
      const { error } = await authClient.deleteUser({
        password,
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "A confirmation email has been sent to verify account deletion",
      );
      setOpen(false);
      setPassword("");
      setConfirmText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <AlertTriangle className="size-4" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter your password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-delete"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPassword("");
                  setConfirmText("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!canDelete || loading || !password}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
