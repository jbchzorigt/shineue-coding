import "server-only";

import { unstable_cache } from "next/cache";
import { listContests } from "@/lib/db/contests";
import { loadLiveSnapshot } from "@/lib/db/live";

// Shared by every viewer (Vercel's data cache spans instances): a crowd
// watching a contest costs the database about one read per 10 seconds.

/** One public contest's board data, at most 10 seconds old. */
export const getLiveSnapshot = unstable_cache(loadLiveSnapshot, ["live-snapshot"], { revalidate: 10 });

/** Every public contest, at most 10 seconds old. */
export const getPublicContests = unstable_cache(
  async () => (await listContests()).filter((c) => c.is_public),
  ["public-contests"],
  { revalidate: 10 }
);
