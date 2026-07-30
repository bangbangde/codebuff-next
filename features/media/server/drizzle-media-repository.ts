import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { articleMediaReference, mediaAsset } from "@/lib/db/schema";
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

  async deleteUnreferenced(id, deleteObject) {
    return getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(mediaAsset)
        .where(eq(mediaAsset.id, id))
        .limit(1)
        .for("update");

      if (!row) {
        return "not_found" as const;
      }

      if (row.status === "pending") {
        return "state_conflict" as const;
      }

      const [reference] = await transaction
        .select({ articleId: articleMediaReference.articleId })
        .from(articleMediaReference)
        .where(eq(articleMediaReference.mediaId, id))
        .limit(1);

      if (reference) {
        return "referenced" as const;
      }

      const asset = toMediaAsset(row);
      await deleteObject(asset);

      const [deleted] = await transaction
        .delete(mediaAsset)
        .where(eq(mediaAsset.id, id))
        .returning({ id: mediaAsset.id });

      if (!deleted) {
        throw new Error("Media delete did not return a record.");
      }

      return "deleted" as const;
    });
  },

  async findById(id: string): Promise<MediaAsset | null> {
    const [row] = await getDatabase()
      .select()
      .from(mediaAsset)
      .where(eq(mediaAsset.id, id))
      .limit(1);

    return row ? toMediaAsset(row) : null;
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

  async markPendingForRetry(id: string): Promise<MediaAsset | null> {
    const [updated] = await getDatabase()
      .update(mediaAsset)
      .set({
        failureCode: null,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mediaAsset.id, id),
          eq(mediaAsset.status, "failed"),
        ),
      )
      .returning();

    return updated ? toMediaAsset(updated) : null;
  },

  markReady(id: string) {
    return updateState(id, {
      failureCode: null,
      status: "ready",
    });
  },
};
