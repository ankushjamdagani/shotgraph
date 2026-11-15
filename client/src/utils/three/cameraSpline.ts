import * as THREE from 'three';
import { CameraKeyframe } from './coordinateAdapters.js';

export class CameraSplineTrajectory {
  keyframes: CameraKeyframe[];
  durationSec: number;

  constructor(keyframes: CameraKeyframe[], durationSec = 3.0) {
    this.keyframes = keyframes.sort((a, b) => a.timeSec - b.timeSec);
    this.durationSec = durationSec;
  }

  evaluate(timeSec: number, camera: THREE.PerspectiveCamera): void {
    const clampedTime = Math.max(0, Math.min(this.durationSec, timeSec));

    if (this.keyframes.length === 0) {
      camera.position.set(0, 1.4, 3);
      camera.lookAt(0, 1.2, 0);
      return;
    }

    if (this.keyframes.length === 1) {
      const kf = this.keyframes[0];
      camera.position.set(...kf.position);
      camera.lookAt(...kf.target);
      camera.fov = kf.fov;
      camera.updateProjectionMatrix();
      return;
    }

    // Find bounding keyframes
    let prev = this.keyframes[0];
    let next = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (clampedTime >= this.keyframes[i].timeSec && clampedTime <= this.keyframes[i + 1].timeSec) {
        prev = this.keyframes[i];
        next = this.keyframes[i + 1];
        break;
      }
    }

    const span = Math.max(0.0001, next.timeSec - prev.timeSec);
    const alpha = (clampedTime - prev.timeSec) / span;
    // Smooth cubic ease-in-out
    const t = alpha * alpha * (3 - 2 * alpha);

    const x = prev.position[0] + (next.position[0] - prev.position[0]) * t;
    const y = prev.position[1] + (next.position[1] - prev.position[1]) * t;
    const z = prev.position[2] + (next.position[2] - prev.position[2]) * t;

    const tx = prev.target[0] + (next.target[0] - prev.target[0]) * t;
    const ty = prev.target[1] + (next.target[1] - prev.target[1]) * t;
    const tz = prev.target[2] + (next.target[2] - prev.target[2]) * t;

    const fov = prev.fov + (next.fov - prev.fov) * t;

    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

/**
 * Creates standard camera move trajectories based on cinematic directives.
 */
export function createDefaultTrajectory(
  moveType: 'push_in' | 'orbit' | 'crane' | 'dolly_zoom' | 'static' = 'push_in',
  durationSec = 3.0
): CameraSplineTrajectory {
  switch (moveType) {
    case 'push_in':
      return new CameraSplineTrajectory(
        [
          { timeSec: 0, position: [0, 1.4, 3.2], target: [0, 1.2, 0], fov: 42.5 }, // 35mm
          { timeSec: durationSec, position: [0, 1.3, 1.6], target: [0, 1.2, 0], fov: 42.5 },
        ],
        durationSec
      );

    case 'orbit':
      return new CameraSplineTrajectory(
        [
          { timeSec: 0, position: [-2.2, 1.4, 2.0], target: [0, 1.1, 0], fov: 40 },
          { timeSec: durationSec * 0.5, position: [0, 1.4, 2.8], target: [0, 1.1, 0], fov: 40 },
          { timeSec: durationSec, position: [2.2, 1.4, 2.0], target: [0, 1.1, 0], fov: 40 },
        ],
        durationSec
      );

    case 'crane':
      return new CameraSplineTrajectory(
        [
          { timeSec: 0, position: [0, 2.8, 2.5], target: [0, 0.8, 0], fov: 45 },
          { timeSec: durationSec, position: [0, 0.9, 1.8], target: [0, 1.2, 0], fov: 45 },
        ],
        durationSec
      );

    case 'dolly_zoom': // Vertigo effect (camera pulls back while zooming in)
      return new CameraSplineTrajectory(
        [
          { timeSec: 0, position: [0, 1.3, 1.5], target: [0, 1.2, 0], fov: 55 },
          { timeSec: durationSec, position: [0, 1.3, 3.5], target: [0, 1.2, 0], fov: 24 },
        ],
        durationSec
      );

    case 'static':
    default:
      return new CameraSplineTrajectory(
        [
          { timeSec: 0, position: [0, 1.35, 2.4], target: [0, 1.2, 0], fov: 42.5 },
          { timeSec: durationSec, position: [0, 1.35, 2.4], target: [0, 1.2, 0], fov: 42.5 },
        ],
        durationSec
      );
  }
}

/**
 * Builds procedural low-poly staging proxies for director blocking.
 */
export function setupPrevisScene(scene: THREE.Scene): void {
  // Clear any existing children
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // 1. Studio Grid Floor
  const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x27272a);
  grid.position.y = 0;
  scene.add(grid);

  // 2. Three-Point Lighting Rig
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);

  // 3. Low-Poly Humanoid Mannequin Proxy
  const mannequinGroup = new THREE.Group();
  mannequinGroup.position.set(0, 0, 0);

  const mannequinMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.4,
    metalness: 0.2,
  });

  const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const head = new THREE.Mesh(headGeo, mannequinMat);
  head.position.y = 1.62;
  mannequinGroup.add(head);

  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.65, 12);
  const torso = new THREE.Mesh(torsoGeo, mannequinMat);
  torso.position.y = 1.22;
  mannequinGroup.add(torso);

  const legsGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.9, 12);
  const legs = new THREE.Mesh(legsGeo, mannequinMat);
  legs.position.y = 0.45;
  mannequinGroup.add(legs);

  scene.add(mannequinGroup);

  // 4. Hero Product Pedestal Proxy
  const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 16);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.3,
    metalness: 0.8,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0.65, 0.4, 0.3);
  scene.add(pedestal);

  const heroPropGeo = new THREE.TorusGeometry(0.1, 0.03, 16, 32);
  const heroPropMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.9,
  });
  const heroProp = new THREE.Mesh(heroPropGeo, heroPropMat);
  heroProp.position.set(0.65, 0.92, 0.3);
  heroProp.rotation.x = Math.PI / 3;
  scene.add(heroProp);
}
