import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateOpenrouterConversationBody,
  GetOpenrouterConversationParams,
  DeleteOpenrouterConversationParams,
  ListOpenrouterMessagesParams,
  SendOpenrouterMessageParams,
  SendOpenrouterMessageBody,
} from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router: IRouter = Router();

router.get("/openrouter/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/openrouter/conversations", async (req, res) => {
  const parsed = CreateOpenrouterConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/openrouter/conversations/:id", async (req, res) => {
  const parsed = GetOpenrouterConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, parsed.data.id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id));
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/openrouter/conversations/:id", async (req, res) => {
  const parsed = DeleteOpenrouterConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(conversations).where(eq(conversations.id, parsed.data.id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/openrouter/conversations/:id/messages", async (req, res) => {
  const parsed = ListOpenrouterMessagesParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/openrouter/conversations/:id/messages", async (req, res) => {
  const params = SendOpenrouterMessageParams.safeParse({ id: Number(req.params.id) });
  const body = SendOpenrouterMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const [userMsg] = await db.insert(messages).values({
      conversationId: params.data.id,
      role: "user",
      content: body.data.content,
    }).returning();

    const history = await db.select().from(messages).where(eq(messages.conversationId, params.data.id));

    const systemPrompt = "You are TaxWise AI, an expert assistant for W-2 tax return automation. You help users understand their tax returns, analyze W-2 data, answer tax questions, and provide guidance on federal tax calculations.";

    const chatMessages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-flash-1.5",
      max_tokens: 8192,
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
    });

    const assistantContent = completion.choices[0]?.message?.content || "I apologize, I could not generate a response.";

    const [assistantMsg] = await db.insert(messages).values({
      conversationId: params.data.id,
      role: "assistant",
      content: assistantContent,
    }).returning();

    res.json(assistantMsg);
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
