import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Setup basic global mock for FBXLoader
global.self = global;
global.TextDecoder = TextDecoder;

const fbxPath = 'public/vesak_lanterns.fbx';
const buffer = fs.readFileSync(fbxPath);

const loader = new FBXLoader();
try {
  // ArrayBuffer representation
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const fbx = loader.parse(arrayBuffer, '');

  console.log("FBX parsed successfully!");
  console.log("Root Children count:", fbx.children.length);

  function dumpObject(obj, indent = 0) {
    const pad = ' '.repeat(indent);
    console.log(`${pad}- Name: "${obj.name}", Type: "${obj.type}", Pos: (${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}), Rot: (${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}), Scale: (${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`);
    if (obj.children) {
      obj.children.forEach(c => dumpObject(c, indent + 2));
    }
  }

  fbx.children.forEach(c => dumpObject(c, 2));

} catch (e) {
  console.error("Error parsing FBX:", e);
}
