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
