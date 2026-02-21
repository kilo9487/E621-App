import { NextApiRequest, NextApiResponse } from "next";
import { LABS_API_GENERATER } from "./_labsApiGenerater";


export const LABS_API_TOOLS = {
  apiGenerater: LABS_API_GENERATER
}

export default function hendler(req: NextApiRequest, res: NextApiResponse) {
  res.json([
    "這邊是那來放API調用的地方",
    "主要是因爲我每個API都有自己的格式 再加上我懶",
    "所以就有了這個文件awa",
  ])
};