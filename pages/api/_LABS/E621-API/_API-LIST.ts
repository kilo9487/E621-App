import { NextApiRequest, NextApiResponse } from "next";

import { POST_GET } from "./posts/get";
import { POST_SEARCH } from "./posts/search";

import { TAG_GET } from "./tags/get";
import { TAG_MATCH } from "./tags/name_match";

import { POOL_GET } from "./pools/get";

import { GET_PALETTE } from "./other/palette";

export const LABS_E621_API = {
  posts: {
    get: POST_GET,
    search: POST_SEARCH,
  },
  tags: {
    get: TAG_GET,
    nameMatch: TAG_MATCH,
  },
  pools: {
    get: POOL_GET,
  },
  other: {
    proxy: GET_PALETTE,
  },
}

export default function hendler(req: NextApiRequest, res: NextApiResponse) {
  res.json([
    "這邊是那來放API調用的地方",
    "主要是因爲我每個API都有自己的格式 再加上我懶",
    "所以就有了這個文件awa",
  ])
};