import { z } from "zod";

import {
  homeContentSectionKeys,
  homeLatestNotesDisplayLimit,
} from "./home-content-dto";

export const homeContentSectionKeySchema = z.enum(homeContentSectionKeys);

export const homeContentMarkdownSchema = z.string();

const updatedBySchema = z
  .string()
  .min(1, "更新者必须是有效的 Better Auth 用户 ID。");

export const updateHomeContentSectionSchema = z.object({
  sectionKey: homeContentSectionKeySchema,
  markdown: homeContentMarkdownSchema,
  updatedBy: updatedBySchema,
});

export const updateHomeLatestNotesConfigSchema = z.object({
  displayLimit: z
    .number()
    .int("Latest Notes 展示数量必须是整数。")
    .min(
      homeLatestNotesDisplayLimit.minimum,
      `Latest Notes 展示数量不能小于 ${homeLatestNotesDisplayLimit.minimum}。`,
    )
    .max(
      homeLatestNotesDisplayLimit.maximum,
      `Latest Notes 展示数量不能大于 ${homeLatestNotesDisplayLimit.maximum}。`,
    ),
  pinnedNoteIds: z
    .array(z.string().uuid("置顶文章 ID 必须是有效的 UUID。"))
    .superRefine((noteIds, context) => {
      const seen = new Set<string>();

      noteIds.forEach((noteId, index) => {
        if (seen.has(noteId)) {
          context.addIssue({
            code: "custom",
            message: "同一篇文章不能重复置顶。",
            path: [index],
          });
        }

        seen.add(noteId);
      });
    }),
  updatedBy: updatedBySchema,
});
