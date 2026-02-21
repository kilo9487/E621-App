import { NextApiRequest, NextApiResponse } from "next";
import functions from "@/data/module/functions";

export function LABS_API_GENERATER<T1, T2>(
  routePath: string,
  calc: (option: T1) => T2 | Promise<T2>
) {

  const getRoutePath = (inputPath: string) => {
    let cleanedPath = inputPath.startsWith("file://") ? inputPath.slice(7) : inputPath;
    cleanedPath = cleanedPath.replace(/\\/g, "/");
    const match = cleanedPath.match(/pages\/(.*)/);

    if (match && match[1]) {
      return "/" + match[1].replace(/\.(ts|js|tsx)$/, "");
    }
    return cleanedPath;
  }

  const apiPath = getRoutePath(routePath);

  // 前端用的
  const useApi = async (options: T1) => {
    const res = await fetch(apiPath + "?_options=" + functions.toBase64(JSON.stringify(options)))

    if (!res.ok) {
      const errJson = await res.json();
      console.error("API Error:", errJson);
      throw new Error(errJson.error || "API call failed");
    }

    const json = await res.json()
    return json as T2
  };

  const calcApi = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    let raw_option = "";

    try {
      const { _options } = req.query;

      if (_options) {
        raw_option = typeof _options === "string" ? _options : _options[0]

        let options: T1;
        try {
          const decoded = functions.fromBase64(raw_option);
          options = JSON.parse(decoded);
        } catch {
          throw Error("JSONERR")
        }

        const out: Awaited<T2> = await calc(options)
        return res.json(out)

      } else {
        throw Error("EMPTY")
      }
    } catch (_err) {
      const err = _err as Error

      switch (err.message) {
        case "EMPTY": {
          res.status(400).json({
            error: "你踏馬沒給東西啊",
            code: err.message
          })
          break;
        }

        case "JSONERR": {
          res.status(400).json({
            error: "你給的啥啊？JSON他媽解不出來啊",
            code: err.message
          })
          break;
        }

        default: {
          console.error("Server Error Stack:", err);
          res.status(500)

          let parsedOption = null;
          try {
            if (raw_option) parsedOption = JSON.parse(functions.fromBase64(raw_option));
          } catch (e) {
            parsedOption = "無法解析的原始資料";
          }

          return res.json({
            error: "很好 死了",
            des: {
              name: err.name,
              message: err.message,
              stack: process.env.NODE_ENV === 'development' ? err.stack?.split("\n") : "Stack hidden in production",
              cause: err.cause
            },
            text: "這是你傳進來的東西",
            option: {
              base64: raw_option,
              json: parsedOption
            },
          })
        }
      }
    }
  }

  return {
    useApi,
    calcApi,
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json([
    "聽過預製菜嗎？ 聽過對吧",
    "意思大概就是 菜先做好 之後拿出來用 對吧",
    "那你聽過預製API嗎？ 欸想不到吧 就連API也不是現做的哦",
    "好啦好像也不能這樣講 因爲這個東西是負責把框架的部分生出來",
    "額 框架是預製 只有API的處理 是現做的",
  ])
};