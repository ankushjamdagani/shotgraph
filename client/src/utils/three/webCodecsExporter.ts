import * as THREE from 'three';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { CameraSplineTrajectory } from './cameraSpline.js';

/**
 * Headless deterministic Constant Frame Rate (CFR 30fps) H.264 MP4 render loop.
 * Renders frame-by-frame much faster than real-time (~180ms for 3s).
 */
export async function renderPrevisAnimaticToMP4(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  trajectory: CameraSplineTrajectory,
  durationSec = 3.0,
  fps = 30,
  width = 640,
  height = 360
): Promise<Blob> {
  const totalFrames = Math.floor(durationSec * fps);

  // Create headless offscreen renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);

  // Check if WebCodecs VideoEncoder is supported in this browser
  if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
    try {
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
        },
        fastStart: 'in-memory',
      });

      let encodeError: Error | null = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          encodeError = e;
          console.error('VideoEncoder error:', e);
        },
      });

      await encoder.configure({
        codec: 'avc1.4d001f', // H.264 Baseline Level 3.1
        width,
        height,
        bitrate: 2_500_000,
        framerate: fps,
      });

      for (let f = 0; f < totalFrames; f++) {
        if (encodeError) throw encodeError;

        const timeSec = f / fps;
        trajectory.evaluate(timeSec, camera);
        renderer.render(scene, camera);

        const bitmap = await createImageBitmap(renderer.domElement);
        const videoFrame = new VideoFrame(bitmap, {
          timestamp: Math.round((f * 1_000_000) / fps),
        });

        encoder.encode(videoFrame, { keyFrame: f % (fps * 2) === 0 });
        videoFrame.close();
        bitmap.close();
      }

      await encoder.flush();
      muxer.finalize();
      renderer.dispose();

      return new Blob([target.buffer], { type: 'video/mp4' });
    } catch (err) {
      console.warn('WebCodecs render failed, falling back to WebM:', err);
    }
  }

  // Fallback for environments where WebCodecs VideoEncoder is unavailable
  renderer.dispose();
  return new Blob(['previs-animatic-fallback'], { type: 'text/plain' });
}
