import fs from 'fs';

function checkExtensions(filePath) {
  try {
    console.log(`\n=== Checking Extensions: ${filePath} ===`);
    const data = fs.readFileSync(filePath);
    const magic = data.readUInt32LE(0);
    if (magic !== 0x46546C67) return;
    
    const chunkLength = data.readUInt32LE(12);
    const jsonStr = data.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);

    console.log("extensionsUsed:", gltf.extensionsUsed);
    console.log("extensionsRequired:", gltf.extensionsRequired);

  } catch (e) {
    console.error(e.message);
  }
}

checkExtensions('public/sthupa_srilanka.glb');
checkExtensions('public/voxel_tutorial_-_scene_2.glb');
