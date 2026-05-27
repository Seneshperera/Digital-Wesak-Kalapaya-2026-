import fs from 'fs';
import path from 'path';

function inspectGLTF(filePath) {
  try {
    console.log(`\n=== Inspecting: ${filePath} ===`);
    const content = fs.readFileSync(filePath, 'utf8');
    const gltf = JSON.parse(content);
    console.log(`Asset details:`, gltf.asset);
    console.log(`Nodes count:`, gltf.nodes ? gltf.nodes.length : 0);
    console.log(`Meshes count:`, gltf.meshes ? gltf.meshes.length : 0);
    
    if (gltf.meshes && gltf.meshes.length > 0) {
      let totalPoints = 0;
      let primitiveModes = {};
      gltf.meshes.forEach(mesh => {
        mesh.primitives.forEach(prim => {
          primitiveModes[prim.mode] = (primitiveModes[prim.mode] || 0) + 1;
          const posAccessorIndex = prim.attributes.POSITION;
          const accessor = gltf.accessors[posAccessorIndex];
          if (accessor) {
            totalOriginalPoints += accessor.count;
          }
        });
      });
      console.log(`Primitive Modes (0=POINTS, 4=TRIANGLES):`, primitiveModes);
      console.log(`Total Points (estimated):`, totalOriginalPoints);
    }
  } catch (e) {
    console.error(`Error inspecting GLTF ${filePath}:`, e.message);
  }
}

function inspectGLB(filePath) {
  try {
    console.log(`\n=== Inspecting: ${filePath} ===`);
    const data = fs.readFileSync(filePath);
    const magic = data.readUInt32LE(0);
    if (magic !== 0x46546C67) {
      console.log('Not a GLB file');
      return;
    }
    const version = data.readUInt32LE(4);
    const length = data.readUInt32LE(8);
    console.log(`GLB Version: ${version}, Length: ${length}`);

    // Chunk 0: JSON
    const chunkLength = data.readUInt32LE(12);
    const chunkType = data.readUInt32LE(16);
    if (chunkType !== 0x4E4F534A) {
      console.log('First chunk is not JSON');
      return;
    }

    const jsonStr = data.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);
    console.log(`Asset details:`, gltf.asset);
    console.log(`Nodes count:`, gltf.nodes ? gltf.nodes.length : 0);
    console.log(`Meshes count:`, gltf.meshes ? gltf.meshes.length : 0);
    
    if (gltf.meshes && gltf.meshes.length > 0) {
      let totalOriginalPoints = 0;
      let primitiveModes = {};
      gltf.meshes.forEach(mesh => {
        mesh.primitives.forEach(prim => {
          primitiveModes[prim.mode] = (primitiveModes[prim.mode] || 0) + 1;
          const posAccessorIndex = prim.attributes.POSITION;
          const accessor = gltf.accessors[posAccessorIndex];
          if (accessor) {
            totalOriginalPoints += accessor.count;
          }
        });
      });
      console.log(`Primitive Modes (0=POINTS, 4=TRIANGLES):`, primitiveModes);
      console.log(`Total Points (estimated):`, totalOriginalPoints);
    }
  } catch (e) {
    console.error(`Error inspecting GLB ${filePath}:`, e.message);
  }
}

inspectGLB('tikal_guatemala_point_cloud.glb');
inspectGLTF('tikal_guatemala_point_cloud/scene.gltf');
inspectGLB('public/tikal.glb');
