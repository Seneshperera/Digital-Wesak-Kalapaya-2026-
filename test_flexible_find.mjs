import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.self = global;
global.TextDecoder = TextDecoder;

const fbxPath = 'public/vesak_lanterns.fbx';
const buffer = fs.readFileSync(fbxPath);

const loader = new FBXLoader();
try {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const fbx = loader.parse(arrayBuffer, '');

  const findMeshFlexibly = (name) => {
    let mesh = fbx.getObjectByName(name);
    if (mesh) return mesh;

    const underName = name.replace(/\./g, '_');
    mesh = fbx.getObjectByName(underName);
    if (mesh) return mesh;

    const plainName = name.replace(/[\._]/g, '');
    mesh = fbx.getObjectByName(plainName);
    if (mesh) return mesh;

    let foundChild = null;
    fbx.traverse(child => {
      if (!foundChild && child.isMesh) {
        const cleanChild = child.name.toLowerCase().replace(/[\._]/g, '');
        const cleanTarget = name.toLowerCase().replace(/[\._]/g, '');
        if (cleanChild === cleanTarget) {
          foundChild = child;
        }
      }
    });
    return foundChild;
  };

  const mappings = [
    { body: 'Cube.004', tails: ['Plane.005', 'Plane.006'], color: 0xffb703 }, // Yellow Octagonal
    { body: 'Cube.002', tails: ['Plane.004', 'Plane.003'], color: 0xff4d6d }, // Pink
    { body: 'Cube.001', tails: ['Plane.001', 'Plane.002'], color: 0x00f5d4 }, // Cyan
    { body: 'Cube.003', tails: ['Plane.007', 'Plane.008'], color: 0xfb8500 }, // Orange
    { body: 'Cube.005', tails: ['Plane.009', 'Plane.010'], color: 0xe0aaff }, // Lavender
    { body: 'Cube.006', tails: ['Plane.011', 'Plane.012', 'Plane.013', 'Plane.014'], color: 0xffffff } // White
  ];

  const lanternTemplates = [];

  mappings.forEach(map => {
    const bodyMesh = findMeshFlexibly(map.body);
    if (!bodyMesh) {
      console.log(`Could not find body mesh: ${map.body}`);
      return;
    }
    console.log(`Found body mesh: "${map.body}" matched to "${bodyMesh.name}"`);

    const tailsFound = [];
    map.tails.forEach(tailName => {
      const tailMesh = findMeshFlexibly(tailName);
      if (tailMesh) {
        tailsFound.push(tailMesh.name);
      } else {
        console.log(`  Could not find tail: ${tailName}`);
      }
    });
    console.log(`  Tails matched: ${tailsFound.join(', ')}`);
  });

} catch (e) {
  console.error("Error:", e);
}
