### User Menu Component

Create a dropdown menu that shows authentication state and user options:

```tsx
// src/components/auth/user-menu.tsx
"use client";

import { useSession, signOut } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, LogOut, MessageSquare, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button size="sm">Get started</Button>
        </Link>
      </div>
    );
  }

  const user = session.user;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Signed out successfully");
          router.push("/");
        },
        onError: () => {
          toast.error("Failed to sign out");
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full p-0"
        >
          <Avatar className="size-9">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!user.emailVerified && (
            <span className="absolute -top-0.5 -right-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        {!user.emailVerified && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex items-center text-amber-600 dark:text-amber-500"
              >
                <AlertCircle className="mr-2 size-4" />
                Verify your email
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/chats">
              <MessageSquare className="mr-2 size-4" />
              Chats
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <Settings className="mr-2 size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Key features:

- Shows sign in/sign up buttons when logged out
- Displays user avatar with initials fallback when logged in
- Animated badge indicator for unverified email
- Links to chats, settings, and sign out action

---

## Profile Components

### Profile Header

Displays user info with inline editing for name and profile image:

```tsx
// src/components/profile/profile-header.tsx
"use client";

import { useSession, authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Loader2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export function ProfileHeader() {
  const { data: session, isPending } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEditing = () => {
    setName(user.name);
    setImagePreview(user.image || null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName("");
    setImage(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let imageData: string | undefined;
      if (image) {
        imageData = await convertImageToBase64(image);
      }

      const { error } = await authClient.updateUser({
        name: name || undefined,
        image: imageData,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Profile updated successfully");
      setIsEditing(false);
      setImage(null);
      setImagePreview(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEditing}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                {imagePreview ? (
                  <div className="relative size-20 rounded-full overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className="size-20">
                    <AvatarFallback className="text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="profile-image">Profile Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant={user.emailVerified ? "default" : "secondary"}>
                {user.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Change Email

```tsx
// src/components/profile/change-email.tsx
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
```

### Change Password

```tsx
// src/components/profile/change-password.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="revoke-sessions"
              checked={revokeOtherSessions}
              onCheckedChange={(checked) =>
                setRevokeOtherSessions(checked === true)
              }
            />
            <Label htmlFor="revoke-sessions" className="text-sm font-normal">
              Sign out from all other devices
            </Label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Change Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Session Management

```tsx
// src/components/profile/sessions.tsx
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
```

### Resend Verification

Shows only when email is not verified:

```tsx
// src/components/profile/resend-verification.tsx
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
import { useState } from "react";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function ResendVerification() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  if (!session || session.user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: "/profile",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Verification email sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-amber-600" />
          Verify Your Email
        </CardTitle>
        <CardDescription>
          Your email address has not been verified yet. Please check your inbox
          for a verification link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Button onClick={handleResend} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          Resend Verification Email
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Delete Account

```tsx
// src/components/profile/delete-account.tsx
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
```

---

## Profile Page

Create the account settings page that combines all profile components:

```tsx
// src/app/profile/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ChangePassword } from "@/components/profile/change-password";
import { ChangeEmail } from "@/components/profile/change-email";
import { DeleteAccount } from "@/components/profile/delete-account";
import { Sessions } from "@/components/profile/sessions";
import { ResendVerification } from "@/components/profile/resend-verification";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your profile, security settings, email preferences, and active sessions.",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 max-w-2xl">
          <Link href="/chats">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Account Settings</h1>
        </div>
      </header>
      <main className="container max-w-2xl py-8 px-4">
        <div className="space-y-6">
          <ResendVerification />
          <ProfileHeader />
          <ChangeEmail />
          <ChangePassword />
          <Sessions />
          <DeleteAccount />
        </div>
      </main>
    </div>
  );
}
```

---

## File Structure

```
src/components/auth/
  user-menu.tsx       # Dropdown with auth state

src/components/profile/
  profile-header.tsx    # User info with edit mode
  change-email.tsx      # Email change form
  change-password.tsx   # Password change form
  sessions.tsx          # Session management
  resend-verification.tsx # Email verification reminder
  delete-account.tsx    # Account deletion with confirmation

src/app/
  profile/page.tsx    # Account settings page (protected)
```
