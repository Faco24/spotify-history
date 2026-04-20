import { processData } from '../utils/dataProcessor';

self.onmessage = (e) => {
  try {
    const result = processData(e.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
};
