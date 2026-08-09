import "server-only";

import { listPublishedArticles } from "@/features/articles/server/article-service";
import { homeLatestNotesDisplayLimit } from "../home-content-dto";
import {
  formatPublicHomeUpdatedAt,
  publicHomeAboutFallback,
  publicHomeNowFallback,
  selectPublicHomeLatestNotes,
  type PublicHomeAboutContent,
  type PublicHomeContent,
  type PublicHomeNowContent,
} from "../public-home-content";
import { homeContentService } from "./home-content-service";

const FALLBACK_LATEST_NOTES_LIMIT = 1;

function isDisplayLimitUsable(displayLimit: number) {
  return (
    Number.isSafeInteger(displayLimit) &&
    displayLimit >= homeLatestNotesDisplayLimit.minimum &&
    displayLimit <= homeLatestNotesDisplayLimit.maximum
  );
}

function reportReadFailure(section: string, reason: unknown) {
  console.error(`Failed to read public home ${section}.`, reason);
}

export async function getPublicHomeContent(): Promise<PublicHomeContent> {
  const [nowResult, latestConfigResult, publishedArticlesResult, aboutResult] =
    await Promise.allSettled([
      homeContentService.getNowSection(),
      homeContentService.getLatestNotesConfig(),
      listPublishedArticles(),
      homeContentService.getAboutSection(),
    ]);

  let now: PublicHomeNowContent = publicHomeNowFallback;

  if (nowResult.status === "rejected") {
    reportReadFailure("Now section", nowResult.reason);
  } else if (nowResult.value) {
    const updatedAt = formatPublicHomeUpdatedAt(nowResult.value.updatedAt);

    if (updatedAt) {
      now = {
        markdown: nowResult.value.markdown,
        ...updatedAt,
      };
    }
  }

  let about: PublicHomeAboutContent = publicHomeAboutFallback;

  if (aboutResult.status === "rejected") {
    reportReadFailure("About section", aboutResult.reason);
  } else if (aboutResult.value) {
    about = { markdown: aboutResult.value.markdown };
  }

  let latestNotes: PublicHomeContent["latestNotes"] = [];

  if (publishedArticlesResult.status === "rejected") {
    reportReadFailure("published articles", publishedArticlesResult.reason);
  } else if (latestConfigResult.status === "rejected") {
    reportReadFailure("Latest Notes config", latestConfigResult.reason);
    latestNotes = publishedArticlesResult.value.slice(
      0,
      FALLBACK_LATEST_NOTES_LIMIT,
    );
  } else if (
    !latestConfigResult.value ||
    !isDisplayLimitUsable(latestConfigResult.value.displayLimit)
  ) {
    latestNotes = publishedArticlesResult.value.slice(
      0,
      FALLBACK_LATEST_NOTES_LIMIT,
    );
  } else {
    latestNotes = selectPublicHomeLatestNotes(
      publishedArticlesResult.value,
      latestConfigResult.value.pinnedNoteIds,
      latestConfigResult.value.displayLimit,
    );
  }

  return { about, latestNotes, now };
}
