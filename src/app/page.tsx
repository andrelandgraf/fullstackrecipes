import { redirect } from "next/navigation";
import { v7 as uuidv7 } from "uuid";

export default function Home() {
  // Generate a new chat ID and redirect to it
  const newChatId = uuidv7();
  redirect(`/${newChatId}`);
}
