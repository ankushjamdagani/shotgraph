import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BlenderExportOptions {
  fps?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  resolutionWidth?: number;
  resolutionHeight?: number;
  cameraKeyframes?: Array<{
    timeSec: number;
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  }>;
}

export class BlenderBridge {
  /**
   * Generates a self-contained scene_assembly.py script for Blender.
   */
  static generateAssemblyScript(options: BlenderExportOptions = {}): string {
    const fps = options.fps || 30;
    const width = options.resolutionWidth || (options.aspectRatio === '16:9' ? 1920 : 1080);
    const height = options.resolutionHeight || (options.aspectRatio === '16:9' ? 1080 : 1920);

    const keyframes = options.cameraKeyframes || [
      { timeSec: 0, position: [0, -3.2, 1.4], target: [0, 0, 1.2], fov: 42.5 },
      { timeSec: 3.0, position: [0, -1.6, 1.3], target: [0, 0, 1.2], fov: 42.5 },
    ];

    const kfBlocks = keyframes
      .map((kf) => {
        const frame = Math.round(kf.timeSec * fps) + 1;
        // Transform Three.js Y-up to Blender Z-up: [x, -z, y]
        const bx = kf.position[0];
        const by = -kf.position[2];
        const bz = kf.position[1];
        const tx = kf.target[0];
        const ty = -kf.target[2];
        const tz = kf.target[1];

        return `    # Frame ${frame}
    cam.location = (${bx.toFixed(4)}, ${by.toFixed(4)}, ${bz.toFixed(4)})
    cam.keyframe_insert(data_path="location", frame=${frame})
    target.location = (${tx.toFixed(4)}, ${ty.toFixed(4)}, ${tz.toFixed(4)})
    target.keyframe_insert(data_path="location", frame=${frame})
    cam_data.lens = ${Math.round(50 * (45 / Math.max(20, kf.fov)))}
    cam_data.keyframe_insert(data_path="lens", frame=${frame})`;
      })
      .join('\n\n');

    return `"""
VS Studio Autonomous Blender Scene Assembly Script
Generated automatically by VS Studio Blender Bridge
"""

import bpy
import mathutils

def build_scene():
    scene = bpy.context.scene
    scene.render.fps = ${fps}
    scene.render.resolution_x = ${width}
    scene.render.resolution_y = ${height}
    scene.frame_start = 1
    scene.frame_end = ${Math.round(3.0 * fps)}

    # Configure Eevee / Cycles Engine
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'RenderEngine') else 'BLENDER_EEVEE'

    # Clear default cube
    if "Cube" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["Cube"], do_unlink=True)

    # 1. Target Tracking Empty
    if "VS_Target" in bpy.data.objects:
        target = bpy.data.objects["VS_Target"]
    else:
        target = bpy.data.objects.new("VS_Target", None)
        target.empty_display_type = 'SPHERE'
        target.empty_display_size = 0.2
        bpy.context.collection.objects.link(target)

    # 2. Main Cinema Camera
    if "VS_Camera" in bpy.data.objects:
        cam = bpy.data.objects["VS_Camera"]
    else:
        cam_data = bpy.data.cameras.new(name="VS_Camera")
        cam = bpy.data.objects.new("VS_Camera", cam_data)
        bpy.context.collection.objects.link(cam)
    
    cam_data = cam.data
    scene.camera = cam

    # Add Track-To constraint
    if not any(c.type == 'TRACK_TO' for c in cam.constraints):
        tt = cam.constraints.new(type='TRACK_TO')
        tt.target = target
        tt.track_axis = 'TRACK_NEGATIVE_Z'
        tt.up_axis = 'UP_Y'

    # 3. Studio 3-Point Lighting Rig
    def add_light(name, light_type, energy, location, color):
        if name in bpy.data.objects:
            return bpy.data.objects[name]
        l_data = bpy.data.lights.new(name=name, type=light_type)
        l_data.energy = energy
        l_data.color = color
        l_obj = bpy.data.objects.new(name=name, object_data=l_data)
        l_obj.location = location
        bpy.context.collection.objects.link(l_obj)
        return l_obj

    add_light("Key_Light", 'AREA', 800.0, (3.0, -3.0, 4.0), (1.0, 0.95, 0.9))
    add_light("Fill_Light", 'AREA', 300.0, (-3.0, -2.0, 2.5), (0.7, 0.85, 1.0))
    add_light("Rim_Light", 'POINT', 500.0, (0.0, 3.0, 3.0), (0.2, 0.7, 1.0))

    # 4. Animated Camera Keyframes
${kfBlocks}

    print("VS Studio: Blender Scene successfully configured.")

if __name__ == "__main__":
    build_scene()
`;
  }

  /**
   * Bundles the script and returns instructions.
   */
  static async exportBlenderBundle(
    projectRoot: string,
    options: BlenderExportOptions = {}
  ): Promise<{ bundleDir: string; scriptPath: string; scriptContent: string; cliCommand: string }> {
    const bundleDir = path.join(projectRoot, 'exports', 'blender_bundle');
    await fs.mkdir(bundleDir, { recursive: true });

    const script = this.generateAssemblyScript(options);
    const scriptPath = path.join(bundleDir, 'scene_assembly.py');
    await fs.writeFile(scriptPath, script, 'utf-8');

    const cliCommand = `blender -b -P "${scriptPath}"`;

    return {
      bundleDir,
      scriptPath,
      scriptContent: script,
      cliCommand,
    };
  }
}
