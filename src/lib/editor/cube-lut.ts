export type CubeLut = {
  title?: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  values: Float32Array;
};

const DIRECTIVES = new Set(["TITLE", "DOMAIN_MIN", "DOMAIN_MAX", "LUT_3D_SIZE", "LUT_1D_SIZE"]);

function finiteTriplet(tokens: string[], label: string): [number, number, number] {
  if (tokens.length !== 3) throw new Error(`${label} must contain exactly three values.`);
  const values = tokens.map(Number);
  if (values.some((value) => !Number.isFinite(value))) throw new Error(`${label} contains a non-finite value.`);
  return values as [number, number, number];
}

export function parseCubeLut(source: string): CubeLut {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  let title: string | undefined;
  let size: number | undefined;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const table: number[] = [];

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber].replace(/\s*#.*$/, "").trim();
    if (!line) continue;
    const [head, ...tokens] = line.match(/"[^"]*"|\S+/g) ?? [];
    if (!head) continue;
    const directive = head.toUpperCase();
    if (directive === "LUT_1D_SIZE") throw new Error("1D LUTs are not supported. Choose a 3D .cube LUT.");
    if (directive === "LUT_3D_SIZE") {
      if (size !== undefined) throw new Error("The LUT contains more than one 3D table.");
      if (tokens.length !== 1 || !Number.isInteger(Number(tokens[0]))) throw new Error("LUT_3D_SIZE must be one integer.");
      size = Number(tokens[0]);
      if (size < 2 || size > 65) throw new Error("3D LUT grid size must be between 2 and 65.");
      continue;
    }
    if (directive === "TITLE") {
      title = tokens.join(" ").replace(/^"|"$/g, "").trim() || undefined;
      continue;
    }
    if (directive === "DOMAIN_MIN") {
      domainMin = finiteTriplet(tokens, "DOMAIN_MIN");
      continue;
    }
    if (directive === "DOMAIN_MAX") {
      domainMax = finiteTriplet(tokens, "DOMAIN_MAX");
      continue;
    }
    if (DIRECTIVES.has(directive) || /^[A-Z_]+$/.test(directive)) throw new Error(`Unsupported LUT directive on line ${lineNumber + 1}.`);
    if (size === undefined) throw new Error("LUT_3D_SIZE must appear before the color table.");
    table.push(...finiteTriplet([head, ...tokens], `Color row ${lineNumber + 1}`));
  }

  if (size === undefined) throw new Error("Missing LUT_3D_SIZE table.");
  if (domainMin.some((value, index) => value >= domainMax[index])) throw new Error("DOMAIN_MIN must be lower than DOMAIN_MAX on every channel.");
  const expected = size * size * size * 3;
  if (table.length !== expected) throw new Error(`Incomplete 3D LUT: expected ${expected / 3} rows and found ${table.length / 3}.`);
  return { title, size, domainMin, domainMax, values: Float32Array.from(table) };
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function channelAt(lut: CubeLut, r: number, g: number, b: number, channel: number) {
  const index = (((b * lut.size + g) * lut.size + r) * 3) + channel;
  return lut.values[index];
}

export function sampleCubeLut(lut: CubeLut, rgb: [number, number, number]): [number, number, number] {
  const coordinates = rgb.map((value, channel) => clamp((value - lut.domainMin[channel]) / (lut.domainMax[channel] - lut.domainMin[channel])) * (lut.size - 1));
  const low = coordinates.map(Math.floor);
  const high = coordinates.map((value) => Math.min(lut.size - 1, Math.ceil(value)));
  const mix = coordinates.map((value, channel) => value - low[channel]);
  const output: number[] = [];
  for (let channel = 0; channel < 3; channel += 1) {
    const c000 = channelAt(lut, low[0], low[1], low[2], channel);
    const c100 = channelAt(lut, high[0], low[1], low[2], channel);
    const c010 = channelAt(lut, low[0], high[1], low[2], channel);
    const c110 = channelAt(lut, high[0], high[1], low[2], channel);
    const c001 = channelAt(lut, low[0], low[1], high[2], channel);
    const c101 = channelAt(lut, high[0], low[1], high[2], channel);
    const c011 = channelAt(lut, low[0], high[1], high[2], channel);
    const c111 = channelAt(lut, high[0], high[1], high[2], channel);
    const x00 = c000 + (c100 - c000) * mix[0];
    const x10 = c010 + (c110 - c010) * mix[0];
    const x01 = c001 + (c101 - c001) * mix[0];
    const x11 = c011 + (c111 - c011) * mix[0];
    const y0 = x00 + (x10 - x00) * mix[1];
    const y1 = x01 + (x11 - x01) * mix[1];
    output.push(y0 + (y1 - y0) * mix[2]);
  }
  return output as [number, number, number];
}
