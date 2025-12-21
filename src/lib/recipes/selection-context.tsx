"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  getAllItems,
  isCookbook,
  getItemPromptText,
  type Recipe,
  type Cookbook,
} from "@/lib/recipes/data";

const items = getAllItems();

// Create a map of slug -> index for sorting by display order
const itemIndexMap = new Map(items.map((item, index) => [item.slug, index]));

function getItemOrder(slug: string): number {
  return itemIndexMap.get(slug) ?? Infinity;
}

// Get combined prompt text for multiple items
function getCombinedPromptText(selectedItems: (Recipe | Cookbook)[]): string {
  if (selectedItems.length === 0) return "";
  if (selectedItems.length === 1) return getItemPromptText(selectedItems[0]);

  const itemDescriptions = selectedItems.map((item) => {
    const type = isCookbook(item) ? "cookbook" : "recipe";
    return `- "${item.title}" ${type}`;
  });

  return `Follow these guides from fullstackrecipes in order:\n${itemDescriptions.join("\n")}`;
}

// Get all unique registry deps from selected items
function getCombinedRegistryDeps(
  selectedItems: (Recipe | Cookbook)[],
): string[] {
  const deps = new Set<string>();
  for (const item of selectedItems) {
    if (item.registryDeps) {
      for (const dep of item.registryDeps) {
        deps.add(dep);
      }
    }
  }
  return Array.from(deps);
}

/** Available tabs in the "how to add" section */
export type DeliveryTab = "copy" | "mcp" | "registry";

/** Get a valid tab for the current context (falls back if tab not available) */
function getValidTab(tab: DeliveryTab, hasRegistry: boolean): DeliveryTab {
  if (tab === "registry" && !hasRegistry) {
    return "copy";
  }
  return tab;
}

type SelectionContextValue = {
  /** Currently selected recipe/cookbook slugs */
  selectedSlugs: string[];
  /** Resolved selected items in display order */
  selectedItems: (Recipe | Cookbook)[];
  /** All content slugs including cookbook recipes, in display order */
  allContentSlugs: string[];
  /** Prompt text for the selected items */
  promptText: string;
  /** Combined registry deps from selected items */
  registryDeps: string[];
  /** Whether any selected item has registry deps */
  hasRegistry: boolean;
  /** Recipes included in selected cookbooks (for display purposes) */
  recipesIncludedInCookbooks: Set<string>;
  /** Currently selected delivery tab (persists across dialog open/close) */
  deliveryTab: DeliveryTab;
  /** Set the selected slugs */
  setSelectedSlugs: (slugs: string[]) => void;
  /** Toggle a single item selection */
  toggleItem: (slug: string) => void;
  /** Remove a single item from selection */
  removeItem: (slug: string) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Set the delivery tab */
  setDeliveryTab: (tab: DeliveryTab) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

type SelectionProviderProps = {
  children: ReactNode;
  /** Initial selection, defaults to first item */
  initialSlugs?: string[];
};

export function SelectionProvider({
  children,
  initialSlugs,
}: SelectionProviderProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    initialSlugs ?? [items[0]?.slug].filter(Boolean),
  );
  const [deliveryTabRaw, setDeliveryTabRaw] = useState<DeliveryTab>("copy");

  // Sort selected items by their display order in data.tsx (not selection order)
  const selectedItems = useMemo(() => {
    return selectedSlugs
      .map((slug) => items.find((i) => i.slug === slug))
      .filter((item): item is Recipe | Cookbook => item !== undefined)
      .sort((a, b) => getItemOrder(a.slug) - getItemOrder(b.slug));
  }, [selectedSlugs]);

  // Get recipe slugs that are included in selected cookbooks (for display)
  const recipesIncludedInCookbooks = useMemo(() => {
    const included = new Set<string>();
    for (const item of selectedItems) {
      if (isCookbook(item)) {
        for (const recipeSlug of item.recipes) {
          included.add(recipeSlug);
        }
      }
    }
    return included;
  }, [selectedItems]);

  // All items to show content for (selected + cookbook recipes), sorted by display order
  const allContentSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const item of selectedItems) {
      if (isCookbook(item)) {
        // For cookbooks, add the cookbook itself and all its recipes
        slugs.add(item.slug);
        for (const recipeSlug of item.recipes) {
          slugs.add(recipeSlug);
        }
      } else {
        slugs.add(item.slug);
      }
    }
    // Sort by display order so markdown content is in correct sequence
    return Array.from(slugs).sort((a, b) => getItemOrder(a) - getItemOrder(b));
  }, [selectedItems]);

  const registryDeps = useMemo(
    () => getCombinedRegistryDeps(selectedItems),
    [selectedItems],
  );

  const hasRegistry = registryDeps.length > 0;

  // Ensure the delivery tab is valid for current selection
  const deliveryTab = useMemo(
    () => getValidTab(deliveryTabRaw, hasRegistry),
    [deliveryTabRaw, hasRegistry],
  );

  const setDeliveryTab = useCallback((tab: DeliveryTab) => {
    setDeliveryTabRaw(tab);
  }, []);

  const promptText = useMemo(
    () => getCombinedPromptText(selectedItems),
    [selectedItems],
  );

  const toggleItem = useCallback(
    (slug: string) => {
      const item = items.find((i) => i.slug === slug);
      if (!item) return;

      // If it's a recipe that's included in a selected cookbook, don't allow toggle
      if (!isCookbook(item) && recipesIncludedInCookbooks.has(slug)) {
        return;
      }

      if (selectedSlugs.includes(slug)) {
        // Deselect
        setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
      } else {
        // Select - if selecting a cookbook, remove any individually selected recipes that are in it
        if (isCookbook(item)) {
          const newSelection = selectedSlugs.filter(
            (s) => !item.recipes.includes(s),
          );
          setSelectedSlugs([...newSelection, slug]);
        } else {
          setSelectedSlugs([...selectedSlugs, slug]);
        }
      }
    },
    [selectedSlugs, recipesIncludedInCookbooks],
  );

  const removeItem = useCallback(
    (slug: string) => {
      setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
    },
    [selectedSlugs],
  );

  const clearSelection = useCallback(() => {
    setSelectedSlugs([]);
  }, []);

  const value: SelectionContextValue = {
    selectedSlugs,
    selectedItems,
    allContentSlugs,
    promptText,
    registryDeps,
    hasRegistry,
    recipesIncludedInCookbooks,
    deliveryTab,
    setSelectedSlugs,
    toggleItem,
    removeItem,
    clearSelection,
    setDeliveryTab,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
