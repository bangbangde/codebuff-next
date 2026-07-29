import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { mediaAsset } from "@/lib/db/schema";
import type {
  CreatePendingMediaInput,
  MediaAsset,
  MediaFailureCode,
} from "../media-dto";
import type { MediaRepository } from "../media-repository";

function toMediaAsset(
  row: typeof mediaAsset.$inferSelect,
): MediaAsset {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    failureCode: row.failureCode as MediaAsset["failureCode"],
    mediaType: row.mediaType as MediaAsset["mediaType"],
    status: row.status as MediaAsset["status"],
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function updateState(
  id: string,
  values: {
    failureCode: MediaFailureCode | null;
    status: MediaAsset["status"];
  },
) {
  const [updated] = await getDatabase()
    .update(mediaAsset)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mediaAsset.id, id),
        eq(mediaAsset.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error("Media pending state transition did not return a record.");
  }

  return toMediaAsset(updated);
}

export const drizzleMediaRepository: MediaRepository = {
  async createPending(input: CreatePendingMediaInput): Promise<MediaAsset> {
    const [created] = await getDatabase()
      .insert(mediaAsset)
      .values(input)
      .returning();

    if (!created) {
      throw new Error("Media insert did not return the created record.");
    }

    return toMediaAsset(created);
  },

  async list(): Promise<readonly MediaAsset[]> {
    const rows = await getDatabase()
      .select()
      .from(mediaAsset)
      .orderBy(desc(mediaAsset.createdAt));

    return rows.map(toMediaAsset);
  },

  markFailed(id: string, failureCode: MediaFailureCode) {
    return updateState(id, {
      failureCode,
      status: "failed",
    });
  },

  markReady(id: string) {
    return updateState(id, {
      failureCode: null,
      status: "ready",
    });
  },
};
