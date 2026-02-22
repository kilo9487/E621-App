import { NextApiRequest, NextApiResponse } from "next";
import { E621 } from "../types/e621";

const USER_AGENT = process.env.E621_USER_AGENT || "KIASENOLO_E621App/0.1.0 (OpenSource project)";
const BASE_URL = process.env.E621_BASE_URL || "https://e926.net";

export const makeQuery = (params: Record<string, any>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

export const E621Internal = {
  async fetch<T>(endpoint: string, params: any = {}, user?: E621.BaseRequest['user']): Promise<T> {
    const url = `${BASE_URL}${endpoint}?${makeQuery(params)}`;

    const headers: HeadersInit = {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    };

    if (user && user.name && user.key) {
      const auth = Buffer.from(`${user.name}:${user.key}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.error(`E621 Fetch Error: ${res.status} ${res.statusText}`);
      throw new Error(`E621 API Error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json([
    "這邊 放E621核心用的 就這樣awa",
  ])
};