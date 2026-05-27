import fs from 'fs';

function inspectAccessors(filePath) {
  try {
    console.log(`\n=== Inspecting Accessors: ${filePath} ===`);
    const data = fs.readFileSync(filePath);
    const magic = data.readUInt32LE(0);
    if (magic !== 0x46546C67) return;
    
    const chunkLength = data.readUInt32LE(12);
    const jsonStr = data.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);

    console.log('Accessors count:', gltf.accessors ? gltf.accessors.length : 0);

    // Let's find some POSITION and COLOR accessors
    if (gltf.meshes && gltf.meshes.length > 0) {
      const mesh = gltf.meshes[0];
      const prim = mesh.primitives[0];
      console.log('First Mesh Primitives attributes:', prim.attributes);
      
      const posIdx = prim.attributes.POSITION;
      const colIdx = prim.attributes.COLOR_0 || prim.attributes.COLOR;
      
      if (posIdx !== undefined) {
        console.log(`POSITION Accessor ${posIdx}:`, gltf.accessors[posIdx]);
      }
      if (colIdx !== undefined) {
        console.log(`COLOR Accessor ${colIdx}:`, gltf.accessors[colIdx]);
      }
    }

    // Let's find min and max color values across ALL color accessors
    let colorMinGlobal = [Infinity, Infinity, Infinity];
    let colorMaxGlobal = [-Infinity, -Infinity, -Infinity];
    let hasColor = false;

    gltf.meshes.forEach((mesh, mIdx) => {
      mesh.primitives.forEach((prim, pIdx) => {
        const colIdx = prim.attributes.COLOR_0 || prim.attributes.COLOR;
        if (colIdx !== undefined) {
          hasColor = true;
          const acc = gltf.accessors[colIdx];
          if (acc && acc.min && acc.max) {
            for (let i = 0; i < 3; i++) {
              if (acc.min[i] < colorMinGlobal[i]) colorMinGlobal[i] = acc.min[i];
              if (acc.max[i] > colorMaxGlobal[i]) colorMaxGlobal[i] = acc.max[i];
            }
          }
        }
      });
    });

    if (hasColor) {
      console.log('Global COLOR min values across all meshes:', colorMinGlobal);
      console.log('Global COLOR max values across all meshes:', colorMaxGlobal);
    } else {
      console.log('No color attributes found in any mesh primitives.');
    }

    // Let's do the same for positions
    let posMinGlobal = [Infinity, Infinity, Infinity];
    let posMaxGlobal = [-Infinity, -Infinity, -Infinity];
    gltf.meshes.forEach((mesh) => {
      mesh.primitives.forEach((prim) => {
        const posIdx = prim.attributes.POSITION;
        if (posIdx !== undefined) {
          const acc = gltf.accessors[posIdx];
          if (acc && acc.min && acc.max) {
            for (let i = 0; i < 3; i++) {
              if (acc.min[i] < posMinGlobal[i]) posMinGlobal[i] = acc.min[i];
              if (acc.max[i] > posMaxGlobal[i]) posMaxGlobal[i] = acc.max[i];
            }
          }
        }
      });
    });
    console.log('Global POSITION min values (local):', posMinGlobal);
    console.log('Global POSITION max values (local):', posMaxGlobal);

  } catch (e) {
    console.error(e.message);
  }
}

inspectAccessors('public/tikal.glb');
