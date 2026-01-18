"use client";

import { useState } from "react";
import { Copy, Check, Terminal, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WizardTrigger } from "@/components/wizard/wizard-trigger";
import { McpConfigSection, type McpClient } from "@/components/mcp/config";
import {
  SKILLS_CLIENTS,
  getSkillsInstallCommand,
  type SkillsClient,
} from "@/lib/recipes/data";

export function InstallSection() {
  const [mcpClient, setMcpClient] = useState<McpClient>("cursor");
  const [skillsClient, setSkillsClient] = useState<SkillsClient>("cursor");
  const [copied, setCopied] = useState(false);

  const skillsCommand = getSkillsInstallCommand(skillsClient);

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-10 w-full max-w-2xl space-y-6">
      {/* CTA Buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          size="lg"
          className="w-full gap-2 font-medium sm:w-auto"
        >
          <a href="#recipes">
            Browse Recipes
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>

        <WizardTrigger queryParam="wizard">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 font-medium sm:w-auto"
          >
            <Wand2 className="h-4 w-4" />
            Add to Agent
          </Button>
        </WizardTrigger>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs text-muted-foreground">
          or install all recipes and skills
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* MCP Server Section */}
      <div className="rounded-xl border border-border/60 bg-secondary/20 p-6 text-left backdrop-blur-sm">
        <h3 className="mb-4 text-sm font-medium">
          Add fullstackrecipes MCP server
        </h3>
        <McpConfigSection mcpClient={mcpClient} setMcpClient={setMcpClient} />
      </div>

      {/* Skills Section */}
      <div className="rounded-xl border border-border/60 bg-secondary/20 p-6 text-left backdrop-blur-sm">
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium">Add all skills to your agent</h3>
          <Select
            value={skillsClient}
            onValueChange={(value) => setSkillsClient(value as SkillsClient)}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILLS_CLIENTS.map((agent) => (
                <SelectItem key={agent.value} value={agent.value}>
                  {agent.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2.5">
          <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground/90 sm:text-sm">
            {skillsCommand}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(skillsCommand)}
            className="h-7 w-7 shrink-0 p-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
