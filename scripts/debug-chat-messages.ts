#!/usr/bin/env bun

/**
 * Debug script to fetch and log chat messages for a given chatId
 *
 * Usage:
 *   bun scripts/debug-chat-messages.ts <chatId>
 *
 * Example:
 *   bun scripts/debug-chat-messages.ts abc123
 */

import { getChatMessages } from "@/lib/db/queries";

async function main() {
  // Get chatId from command line arguments
  const chatId = process.argv[2];

  if (!chatId) {
    console.error("❌ Error: chatId is required");
    console.log("\nUsage:");
    console.log("  bun scripts/debug-chat-messages.ts <chatId>");
    console.log("\nExample:");
    console.log("  bun scripts/debug-chat-messages.ts abc123");
    process.exit(1);
  }

  console.log(`\n🔍 Fetching messages for chat: ${chatId}\n`);

  try {
    const messages = await getChatMessages(chatId);

    if (messages.length === 0) {
      console.log("📭 No messages found for this chat");
      return;
    }

    console.log(`✅ Found ${messages.length} message(s)\n`);
    console.log("=".repeat(80));

    // Log each message with its parts
    messages.forEach((message, index) => {
      console.log(`\n📨 Message ${index + 1}:`);
      console.log(`   ID: ${message.id}`);
      console.log(`   Role: ${message.role}`);
      console.log(`   Created: ${message.createdAt}`);
      console.log(`   Parts: ${message.parts.length}`);

      if (message.parts.length > 0) {
        console.log("\n   Parts:");
        message.parts.forEach((part, partIndex) => {
          console.log(`\n   ${partIndex + 1}. Type: ${part.type}`);

          switch (part.type) {
            case "text":
              console.log(
                `      Text: ${part.text.substring(0, 100)}${part.text.length > 100 ? "..." : ""}`,
              );
              break;
            case "reasoning":
              console.log(
                `      Reasoning: ${part.text.substring(0, 100)}${part.text.length > 100 ? "..." : ""}`,
              );
              break;
            case "tool":
              console.log(`      Tool: ${part.toolType}`);
              console.log(`      Tool Call ID: ${part.toolCallId}`);
              console.log(
                `      Data:`,
                JSON.stringify(part.input, null, 2)
                  .split("\n")
                  .map((line) => `      ${line}`)
                  .join("\n"),
              );
              console.log(
                `      Output:`,
                JSON.stringify(part.output, null, 2)
                  .split("\n")
                  .map((line) => `      ${line}`)
                  .join("\n"),
              );
              break;
          }
        });
      }

      console.log("\n" + "-".repeat(80));
    });

    console.log("\n✨ Complete message data (JSON):\n");
    console.log(JSON.stringify(messages, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

main();
