import fs from 'fs';

function checkColors(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const magic = data.readUInt32LE(0);
    if (magic !== 0x46546C67) return;
    
    const chunkLength = data.readUInt32LE(12);
    const jsonStr = data.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);

    if (!gltf.accessors || !gltf.bufferViews) return;

    // We will parse the binary chunk (Chunk 1)
    const binHeaderOffset = 20 + chunkLength;
    const binLength = data.readUInt32LE(binHeaderOffset);
    const binType = data.readUInt32LE(binHeaderOffset + 4);
    if (binType !== 0x004E4942) {
      console.log('Second chunk is not BINARY');
      return;
    }
    const binBuffer = data.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength);

    let totalVertices = 0;
    let greaterThanOneCount = 0;
    let sampleValues = [];

    gltf.meshes.forEach((mesh, meshIdx) => {
      mesh.primitives.forEach((prim, primIdx) => {
        const colIdx = prim.attributes.COLOR_0 || prim.attributes.COLOR;
        if (colIdx === undefined) return;

        const accessor = gltf.accessors[colIdx];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const byteOffset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
        
        // componentType 5126 is FLOAT (4 bytes)
        // type is 'VEC4' (4 floats = 16 bytes per vertex)
        const stride = bufferView.byteStride || 16;
        const count = accessor.count;

        for (let i = 0; i < count; i++) {
          totalVertices++;
          const offset = byteOffset + i * stride;
          const r = binBuffer.readFloatLE(offset);
          const g = binBuffer.readFloatLE(offset + 4);
          const b = binBuffer.readFloatLE(offset + 8);
          const a = binBuffer.readFloatLE(offset + 12);

          if (r > 1.0 || g > 1.0 || b > 1.0) {
            greaterThanOneCount++;
            if (sampleValues.length < 5) {
              sampleValues.push({ r, g, b, a });
            }
          }
        }
      });
    });

    console.log(`Total color vertices checked: ${totalVertices}`);
    console.log(`Vertices with color component > 1.0: ${greaterThanOneCount}`);
    console.log(`Percentage: ${(greaterThanOneCount / totalVertices * 100).toFixed(4)}%`);
    if (sampleValues.length > 0) {
      console.log('Sample of values > 1.0:', sampleValues);
    }

  } catch (e) {
    console.error(e);
  }
}

checkColors('public/tikal.glb');
