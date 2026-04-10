/**
 * Removes flat gray / shadow background from the source app icon via edge flood-fill,
 * then writes PWA-ready PNGs under public/icons/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const defaultInput = path.join(projectRoot, "public", "icons", "source-app-icon.png");

const inputPath = process.argv[2] ?? defaultInput;

function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)];
}

function colorDistanceSquared(red, green, blue, referenceRed, referenceGreen, referenceBlue) {
  const deltaRed = red - referenceRed;
  const deltaGreen = green - referenceGreen;
  const deltaBlue = blue - referenceBlue;
  return deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue;
}

function isLowSaturationBackground(red, green, blue, maxDistanceSquared) {
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const saturation = maxChannel - minChannel;
  if (saturation > 42) {
    return false;
  }
  const distanceSquared = colorDistanceSquared(
    red,
    green,
    blue,
    referenceRed,
    referenceGreen,
    referenceBlue,
  );
  return distanceSquared <= maxDistanceSquared;
}

const imageBuffer = fs.readFileSync(inputPath);
const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});

const width = info.width;
const height = info.height;
const pixelStride = 4;
const totalPixels = width * height;

const edgeRedSamples = [];
const edgeGreenSamples = [];
const edgeBlueSamples = [];

for (let coordinateX = 0; coordinateX < width; coordinateX += 1) {
  const topIndex = coordinateX * pixelStride;
  const bottomIndex = ((height - 1) * width + coordinateX) * pixelStride;
  edgeRedSamples.push(data[topIndex], data[bottomIndex]);
  edgeGreenSamples.push(data[topIndex + 1], data[bottomIndex + 1]);
  edgeBlueSamples.push(data[topIndex + 2], data[bottomIndex + 2]);
}

for (let coordinateY = 0; coordinateY < height; coordinateY += 1) {
  const leftIndex = (coordinateY * width) * pixelStride;
  const rightIndex = (coordinateY * width + (width - 1)) * pixelStride;
  edgeRedSamples.push(data[leftIndex], data[rightIndex]);
  edgeGreenSamples.push(data[leftIndex + 1], data[rightIndex + 1]);
  edgeBlueSamples.push(data[leftIndex + 2], data[rightIndex + 2]);
}

const referenceRed = median(edgeRedSamples);
const referenceGreen = median(edgeGreenSamples);
const referenceBlue = median(edgeBlueSamples);

const maxBackgroundDistanceSquared = 95 * 95;
const visited = new Uint8Array(totalPixels);
const breadthQueue = [];

function tryEnqueue(coordinateX, coordinateY) {
  if (coordinateX < 0 || coordinateY < 0 || coordinateX >= width || coordinateY >= height) {
    return;
  }
  const pixelIndex = coordinateY * width + coordinateX;
  if (visited[pixelIndex] !== 0) {
    return;
  }
  const bufferIndex = pixelIndex * pixelStride;
  const red = data[bufferIndex];
  const green = data[bufferIndex + 1];
  const blue = data[bufferIndex + 2];
  if (!isLowSaturationBackground(red, green, blue, maxBackgroundDistanceSquared)) {
    return;
  }
  visited[pixelIndex] = 1;
  breadthQueue.push(pixelIndex);
}

for (let coordinateX = 0; coordinateX < width; coordinateX += 1) {
  tryEnqueue(coordinateX, 0);
  tryEnqueue(coordinateX, height - 1);
}
for (let coordinateY = 0; coordinateY < height; coordinateY += 1) {
  tryEnqueue(0, coordinateY);
  tryEnqueue(width - 1, coordinateY);
}

const neighborOffsets = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

let queueReadIndex = 0;
while (queueReadIndex < breadthQueue.length) {
  const pixelIndex = breadthQueue[queueReadIndex];
  queueReadIndex += 1;
  const bufferIndex = pixelIndex * pixelStride;
  data[bufferIndex + 3] = 0;
  const coordinateX = pixelIndex % width;
  const coordinateY = Math.floor(pixelIndex / width);
  for (const [offsetX, offsetY] of neighborOffsets) {
    const nextX = coordinateX + offsetX;
    const nextY = coordinateY + offsetY;
    if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
      continue;
    }
    const neighborIndex = nextY * width + nextX;
    if (visited[neighborIndex] !== 0) {
      continue;
    }
    const neighborBufferIndex = neighborIndex * pixelStride;
    const neighborRed = data[neighborBufferIndex];
    const neighborGreen = data[neighborBufferIndex + 1];
    const neighborBlue = data[neighborBufferIndex + 2];
    if (!isLowSaturationBackground(neighborRed, neighborGreen, neighborBlue, maxBackgroundDistanceSquared)) {
      continue;
    }
    visited[neighborIndex] = 1;
    breadthQueue.push(neighborIndex);
  }
}

const rgbaBuffer = await sharp(data, {
  raw: {
    width,
    height,
    channels: 4,
  },
})
  .png()
  .toBuffer();

const trimmed = sharp(rgbaBuffer).trim({ threshold: 0 });

const icon192Path = path.join(projectRoot, "public", "icons", "icon-192x192.png");
const icon512Path = path.join(projectRoot, "public", "icons", "icon-512x512.png");
const icon512MaskablePath = path.join(projectRoot, "public", "icons", "icon-512-maskable.png");
const favicon32Path = path.join(projectRoot, "public", "icons", "favicon-32x32.png");

const maskableBackground = { r: 15, g: 118, b: 110, alpha: 1 };

await trimmed
  .clone()
  .resize(192, 192, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(icon192Path);

await trimmed
  .clone()
  .resize(32, 32, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(favicon32Path);

await trimmed
  .clone()
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(icon512Path);

await trimmed
  .clone()
  .resize(410, 410, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: maskableBackground,
  })
  .png()
  .toFile(icon512MaskablePath);

process.stdout.write(
  `Wrote:\n  ${favicon32Path}\n  ${icon192Path}\n  ${icon512Path}\n  ${icon512MaskablePath}\n`,
);
