// Optional neural voice print (decision 24 upgrade path): a speaker-embedding model run locally on the server's CPU
// through sherpa-onnx (Apache-2.0). Not installed by default, so the built-in spectral baseline stays the fallback.
//
// To enable:
//   npm install sherpa-onnx-node            (prebuilt binaries for Linux/macOS/Windows; API checked on v2.0.1)
//   download a speaker-embedding ONNX model, e.g. a CAM++ or ECAPA-TDNN model from the sherpa-onnx
//   "speaker recognition models" GitHub release (check the model's licence; VoxCeleb-trained weights are CC BY 4.0)
//   VOICE_EMBEDDER=sherpa VOICE_MODEL=/path/to/model.onnx npm start
// Then every senior re-records their voice once: prints from different methods are not comparable.
// Thresholds (VOICE_MATCH / VOICE_NONMATCH, cosine) MUST be calibrated on in-domain speakerphone trials.
import { createRequire } from 'node:module';

export function loadSherpaEmbedder({ model, threads = 1 } = {}) {
 if (!model) throw new Error('VOICE_MODEL must point to a speaker-embedding .onnx file.');
 let sherpa;
 try { sherpa = createRequire(import.meta.url)('sherpa-onnx-node'); } catch { throw new Error('VOICE_EMBEDDER=sherpa needs `npm install sherpa-onnx-node`.'); }
 const extractor = new sherpa.SpeakerEmbeddingExtractor({ model, numThreads: threads, debug: 0 });
 return async function embed(samples, sampleRate) {
  const stream = extractor.createStream();
  stream.acceptWaveform({ samples, sampleRate });
  stream.inputFinished();
  if (!extractor.isReady(stream)) throw new Error('Not enough audio for a voice print.');
  return Float32Array.from(extractor.compute(stream));
 };
}
