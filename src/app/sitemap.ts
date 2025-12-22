import type { MetadataRoute } from "next";
import { getAllItems } from "@/lib/recipes/data";

const BASE_URL = "https://fullstackrecipes.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const items = getAllItems();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/recipes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const recipePages: MetadataRoute.Sitemap = items.map((item) => ({
    url: `${BASE_URL}/recipes/${item.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...recipePages];
}
