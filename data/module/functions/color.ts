interface RGBObject {
  r: number;
  g: number;
  b: number;
}

export default {
  /* From ChatGPT */
  isRGBObject: function (obj: any): obj is RGBObject {
    return typeof obj === 'object' && obj !== null
      && 'r' in obj && typeof obj.r === 'number'
      && 'g' in obj && typeof obj.g === 'number'
      && 'b' in obj && typeof obj.b === 'number';
  },
  hexToRgb: function (hex: string): RGBObject {
    const removePrefix = hex.replace(/0x|#/, "")
    let aftrSex: string = ""

    switch (removePrefix.length) {

      case 3: {
        aftrSex = removePrefix.split("").map(e => e + e).join("")
        break;
      }

      case 6: {
        aftrSex = removePrefix
        break;
      }

      default: {
        aftrSex = "ffffff"
        break
      }

    }

    const clrAry = aftrSex.replace(/(..)(..)(..)/, "$1 $2 $3").split(" ")

    return {
      r: +`0x${clrAry[0]}`,
      g: +`0x${clrAry[1]}`,
      b: +`0x${clrAry[2]}`,
    }
  },
  /* From ChatGPT */
  rgbToHex: function (color: RGBObject): string {
    const hex = ((color.r << 16) | (color.g << 8) | color.b).toString(16).padStart(6, '0');
    return '#' + hex;
  },
  /* From ChatGPT */
  bright: function (color: string | RGBObject, multiplier: number): string {
    let rgb: RGBObject = { r: 0, g: 0, b: 0 };
    if (typeof color === "string" && color.startsWith("#")) {
      rgb = this.hexToRgb(color);
    } else if (this.isRGBObject(color)) {
      rgb = color as RGBObject;
    }

    const adjusted = {
      r: Math.round(rgb.r * multiplier),
      g: Math.round(rgb.g * multiplier),
      b: Math.round(rgb.b * multiplier),
    };

    return this.rgbToHex(adjusted);
  }
}
