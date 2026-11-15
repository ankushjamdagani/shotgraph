/**
 * Mathematical Coordinate System Adapters for VS Studio.
 * Canonical Source: Three.js (Right-Handed, Y-Up).
 */

export interface CameraKeyframe {
  timeSec: number;
  position: [number, number, number]; // [x, y, z] in Three.js coordinates
  target: [number, number, number];   // [tx, ty, tz] look-at target
  fov: number;                       // Field of View in degrees (e.g. 35mm ~ 42.5°)
}

/**
 * Transforms Three.js (Right-Handed, Y-Up) coordinates to Blender (Right-Handed, Z-Up).
 * Three.js: +X = Right, +Y = Up, +Z = Out/Back
 * Blender:  +X = Right, +Y = Forward, +Z = Up
 */
export function threeToBlenderVector(x: number, y: number, z: number): [number, number, number] {
  return [x, -z, y];
}

/**
 * Generates an executable Blender Python script to set up this exact camera trajectory.
 */
export function generateBlenderCameraScript(keyframes: CameraKeyframe[], fps = 30): string {
  const kfLines = keyframes
    .map((kf) => {
      const frameNum = Math.round(kf.timeSec * fps) + 1;
      const [bx, by, bz] = threeToBlenderVector(...kf.position);
      const [tx, ty, tz] = threeToBlenderVector(...kf.target);
      return `    # Frame ${frameNum}
    cam.location = (${bx.toFixed(4)}, ${by.toFixed(4)}, ${bz.toFixed(4)})
    cam.keyframe_insert(data_path="location", frame=${frameNum})
    target_obj.location = (${tx.toFixed(4)}, ${ty.toFixed(4)}, ${tz.toFixed(4)})
    target_obj.keyframe_insert(data_path="location", frame=${frameNum})
    cam_data.lens = ${Math.round(50 * (45 / Math.max(20, kf.fov)))}
    cam_data.keyframe_insert(data_path="lens", frame=${frameNum})`;
    })
    .join('\n\n');

  return `import bpy
import mathutils

def setup_camera():
    scene = bpy.context.scene
    scene.render.fps = ${fps}
    
    # Target empty for look-at tracking
    if "VS_Target" in bpy.data.objects:
        target_obj = bpy.data.objects["VS_Target"]
    else:
        target_obj = bpy.data.objects.new("VS_Target", None)
        bpy.context.collection.objects.link(target_obj)

    # Camera setup
    if "VS_Camera" in bpy.data.objects:
        cam = bpy.data.objects["VS_Camera"]
    else:
        cam_data = bpy.data.cameras.new(name="VS_Camera")
        cam = bpy.data.objects.new("VS_Camera", cam_data)
        bpy.context.collection.objects.link(cam)
    
    cam_data = cam.data
    scene.camera = cam

    # Add Track-To constraint if not present
    if not any(c.type == 'TRACK_TO' for c in cam.constraints):
        tt = cam.constraints.new(type='TRACK_TO')
        tt.target = target_obj
        tt.track_axis = 'TRACK_NEGATIVE_Z'
        tt.up_axis = 'UP_Y'

    # Set animated keyframes
${kfLines}

setup_camera()
`;
}

/**
 * Converts Three.js absolute keyframes into normalized delta camera movements
 * expected by generative video models like Kling 1.5 and Runway Gen-3.
 * Returns [dx, dy, dz, dPitch, dYaw, dRoll].
 */
export function threeToKlingDelta(
  current: CameraKeyframe,
  previous: CameraKeyframe
): {
  dx: number;
  dy: number;
  dz: number;
  dPitch: number;
  dYaw: number;
  dRoll: number;
} {
  const dt = Math.max(0.001, current.timeSec - previous.timeSec);
  const dx = (current.position[0] - previous.position[0]) / dt;
  const dy = (current.position[1] - previous.position[1]) / dt;
  const dz = (current.position[2] - previous.position[2]) / dt;

  // Normalized relative camera deltas (-10 to +10 range)
  return {
    dx: Number(Math.max(-10, Math.min(10, dx * 2)).toFixed(2)),
    dy: Number(Math.max(-10, Math.min(10, dy * 2)).toFixed(2)),
    dz: Number(Math.max(-10, Math.min(10, dz * 2)).toFixed(2)),
    dPitch: 0,
    dYaw: 0,
    dRoll: 0,
  };
}
