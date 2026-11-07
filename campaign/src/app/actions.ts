"use server";

import { revalidatePath } from "next/cache";
import {
  dismissDuplicateGroup,
  mergeDuplicateGroup,
  runAgent,
  runFaris,
  generateDailyReport,
} from "@/lib/agents";
import { logCall } from "@/lib/calls";
import { ensureReady } from "@/lib/db";

function refresh() {
  revalidatePath("/", "layout");
}

export async function runAgentAction(agentId: string) {
  await ensureReady();
  await runAgent(agentId);
  refresh();
}

export async function generateReportAction(slot: "morning" | "afternoon") {
  await ensureReady();
  await generateDailyReport(slot);
  refresh();
}

export async function mergeDuplicateAction(groupId: number) {
  await ensureReady();
  await mergeDuplicateGroup(groupId);
  refresh();
}

export async function dismissDuplicateAction(groupId: number) {
  await ensureReady();
  await dismissDuplicateGroup(groupId);
  refresh();
}

export async function logCallAction(formData: FormData) {
  await ensureReady();
  const customerId = Number(formData.get("customerId"));
  const callerId = String(formData.get("callerId") || "");
  const outcome = String(formData.get("outcome") || "");
  const notes = String(formData.get("notes") || "");
  if (!customerId || !callerId || !outcome) {
    throw new Error("Caller, customer and outcome are required.");
  }
  await logCall({ customerId, callerId, outcome, notes: notes || undefined });
  refresh();
}

export async function draftProposalAction(customerId: number) {
  await ensureReady();
  await runFaris(customerId);
  refresh();
}

export async function allocateAction() {
  await ensureReady();
  await runAgent("omar");
  refresh();
}
