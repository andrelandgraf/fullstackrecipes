"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createRecipeAction, updateRecipeAction } from "@/lib/recipes/actions";
import { toast } from "sonner";
import type { UserRecipe } from "@/lib/recipes/schema";

type RecipeFormProps = {
  recipe?: UserRecipe;
  mode: "create" | "edit";
};

export function RecipeForm({ recipe, mode }: RecipeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [content, setContent] = useState(recipe?.content ?? "");
  const [tags, setTags] = useState(recipe?.tags?.join(", ") ?? "");
  const [isPublic, setIsPublic] = useState(recipe?.isPublic ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("content", content);
    formData.set("tags", tags);
    formData.set("isPublic", isPublic.toString());

    if (mode === "edit" && recipe) {
      formData.set("id", recipe.id);
    }

    const action = mode === "create" ? createRecipeAction : updateRecipeAction;
    const result = await action(formData);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(mode === "create" ? "Recipe created" : "Recipe updated");
      router.push("/dashboard/recipes");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recipe Details</CardTitle>
          <CardDescription>Basic information about your recipe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Setting up Stripe Webhooks"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this recipe covers..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., Stripe, Payments, Webhooks (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your recipe in Markdown format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="content">Recipe Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`## Getting Started

1. First, install the dependencies...

\`\`\`bash
bun add stripe
\`\`\`

2. Then, configure your environment...`}
              rows={20}
              className="font-mono text-sm"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control who can see your recipe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Public recipes are visible to everyone in the community
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Recipe"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
