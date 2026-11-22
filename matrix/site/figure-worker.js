// Works out the stars of a figure picture away from the page (see figure-math.js), so
// the page keeps moving smoothly while a person's figure is prepared.
const S = 512;
const math = import(`./figure-math.js${self.location.search}`);

self.onmessage = async ({ data: { id, url, count, size } }) => {
  try {
    const { figureFromPixels } = await math;
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(S, S);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(bitmap, 0, 0, S, S);
    bitmap.close();
    const result = figureFromPixels(g.getImageData(0, 0, S, S).data, S, count, size);
    self.postMessage({ id, ...result }, [result.pos.buffer, result.col.buffer, result.matte.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
