import fs from 'fs';

function inspectHierarchy(filePath) {
  try {
    console.log(`\n=== Inspecting Hierarchy: ${filePath} ===`);
    const data = fs.readFileSync(filePath);
    const magic = data.readUInt32LE(0);
    if (magic !== 0x46546C67) {
      console.log("Not a valid GLB file!");
      return;
    }
    
    const chunkLength = data.readUInt32LE(12);
    const jsonStr = data.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);

    console.log("Nodes count:", gltf.nodes ? gltf.nodes.length : 0);
    console.log("Meshes count:", gltf.meshes ? gltf.meshes.length : 0);

    if (!gltf.nodes) return;

    // Check if any meshes exist
    let totalMeshPointsCount = 0;
    if (gltf.meshes) {
      gltf.meshes.forEach((mesh, index) => {
        let primCount = mesh.primitives ? mesh.primitives.length : 0;
        console.log(`Mesh ${index} name: "${mesh.name || ''}", primitives: ${primCount}`);
      });
    }

    gltf.nodes.slice(0, 10).forEach((node, index) => {
      const isRoot = !gltf.nodes.some(n => n.children && n.children.includes(index));
      console.log(`Node ${index} (${node.name || 'unnamed'}):`);
      if (isRoot) console.log(`  * IS ROOT`);
      if (node.mesh !== undefined) console.log(`  * references mesh ${node.mesh}`);
      if (node.children) console.log(`  * children:`, node.children);
      if (node.translation) console.log(`  * translation:`, node.translation);
      if (node.rotation) console.log(`  * rotation:`, node.rotation);
      if (node.scale) console.log(`  * scale:`, node.scale);
      if (node.matrix) console.log(`  * matrix:`, node.matrix);
    });

  } catch (e) {
    console.error(e.message);
  }
}

inspectHierarchy('public/sthupa_srilanka.glb');
inspectHierarchy('public/voxel_tutorial_-_scene_2.glb');
