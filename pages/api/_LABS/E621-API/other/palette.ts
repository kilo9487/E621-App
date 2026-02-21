import { LABS_API_GENERATER } from "../../_LABS-TOOLS/_labsApiGenerater";
import { sha256 } from "js-sha256";

type Input = {
  url: string;
};

const logic = async (opt: Input): Promise<string[]> => {

  const { Vibrant } = await import("node-vibrant/node");
  const path = await import("path");
  const fs = await import("fs");

  const CACHE_DIR = path.join(process.cwd(), ".caches/e621-api/palette");

  const getCacheFilePath = (url: string) => {
    const hash = sha256(url);
    return path.join(CACHE_DIR, `${hash}.json`);
  };

  if (!opt.url) throw new Error("URL is required");

  const cachePath = getCacheFilePath(opt.url);

  try {
    const cachedData = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(cachedData);
  } catch (err) {
  }

  try {
    const response = await fetch(opt.url, {
      headers: { 'User-Agent': "KIASENOLO_E621App/0.0.0 (by KIASENOLO; kilo93466@gmail.com)" },
    });

    if (!response.ok) throw new Error("Fetch failed");

    const buffer = await response.arrayBuffer();

    const palette = await Vibrant.from(Buffer.from(buffer))
      .maxColorCount(64)
      .getPalette();

    const swatches = Object.values(palette).filter((s) => s);

    const colors = swatches
      .sort((a, b) => b!.population - a!.population)
      .slice(0, 10)
      .map(s => s!.hex);

    if (colors.length > 0) {
      try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(colors), "utf-8");
        console.log(`[Cache Save] Saved to disk: ${cachePath}`);
      } catch (writeErr) {
        console.error("Failed to save cache file:", writeErr);
      }
    }

    return colors;

  } catch (e) {
    console.error("Palette extract failed:", e);
    return ["#ffffff"];
  }
};

const { useApi, calcApi } = LABS_API_GENERATER<Input, string[]>(import.meta.url, logic);
export const GET_PALETTE = useApi;
export default calcApi;