/**
 * Hexadecimal color.
 */
export class HexColor {
  private static readonly TWEAK_PERCENTAGE = 50;
  private readonly _red: number;
  private readonly _green: number;
  private readonly _blue: number;

  public static fromHexadecimalString(hexString: string): HexColor {
    // Return white color by default
    if (hexString === '') {
      return new HexColor(255, 255, 255);
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexString);
    if (result === null) {
      throw new Error(
        `HexColorParser : The given colors "${hexString}" is not in hexadecimal format`
      );
    }
    const red = parseInt(result[1], 16);
    const green = parseInt(result[2], 16);
    const blue = parseInt(result[3], 16);
    return new HexColor(red, green, blue);
  }

  public constructor(red: number, green: number, blue: number) {
    this._red = red;
    this._green = green;
    this._blue = blue;
  }

  public get red(): number {
    return this._red;
  }

  public get green(): number {
    return this._green;
  }

  public get blue(): number {
    return this._blue;
  }

  public get hexValue(): string {
    const hex = (this._red << 16) | (this._green << 8) | (this._blue << 0);
    return '#' + (0x1000000 + hex).toString(16).slice(1);
  }

  public add(other: HexColor): HexColor {
    const newR = this.red + other.red;
    const newG = this.green + other.green;
    const newB = this.blue + other.blue;
    return new HexColor(newR, newG, newB);
  }

  /**
   * Build a lighten version of the current color.
   * @returns A lighten version of the current color.
   */
  public toLighter(): HexColor {
    const percent = HexColor.TWEAK_PERCENTAGE;
    let newR = (this._red * (100 + percent)) / 100;
    let newG = (this._green * (100 + percent)) / 100;
    let newB = (this._blue * (100 + percent)) / 100;

    newR = newR < 255 ? newR : 255;
    newG = newG < 255 ? newG : 255;
    newB = newB < 255 ? newB : 255;

    return new HexColor(newR, newG, newB);
  }

  /**
   * Build a darken version of the current color.
   * @returns A darken version of the current color.
   */
  public toDarker(): HexColor {
    const percent = -HexColor.TWEAK_PERCENTAGE;
    let newR = (this._red * (100 + percent)) / 100;
    let newG = (this._green * (100 + percent)) / 100;
    let newB = (this._blue * (100 + percent)) / 100;

    newR = newR > 0 ? newR : 0;
    newG = newG > 0 ? newG : 0;
    newB = newB > 0 ? newB : 0;

    return new HexColor(newR, newG, newB);
  }
}
