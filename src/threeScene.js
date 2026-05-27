/**
 * Wesak Kalapaya - Three.js Point Cloud & Exhibit Engine
 * Loads Tikal GLB point cloud, manages OrbitControls, raycasts hotspots,
 * projects 2D labels over 3D coordinates, and manages 3D exhibit fade-ins.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// Robust helper to get Float32 values from standard or interleaved attributes safely
function getVal(attr, index, channel) {
  if (!attr) return 0;
  if (typeof attr.getX === 'function') {
    if (channel === 0) return attr.getX(index);
    if (channel === 1) return attr.getY(index);
    if (channel === 2) return attr.getZ(index);
  }
  
  const itemSize = attr.itemSize || 3;
  const array = attr.array || (attr.data ? attr.data.array : null);
  if (!array) return 0;
  
  if (attr.isInterleavedBufferAttribute || attr.data) {
    const stride = attr.data.stride || itemSize;
    const offset = attr.offset || 0;
    return array[index * stride + offset + channel] || 0;
  }
  
  return array[index * itemSize + channel] || 0;
}

export class WesakThree {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.raycastMouse = new THREE.Vector2();

    // Load progress callback
    this.onLoadProgress = null;
    this.onExhibitLoaded = null; // callback to main for text & audio updates

    // Interaction states
    this.activeScene = 0; // 0: Overview, 1: Lanterns, 2: Colombo, 3: Ampara, 4: Lake
    this.isTransitioning = false;

    // Visual elements
    this.tikalPoints = null;
    this.sceneGroups = []; // Array of THREE.Group for each exhibit
    this.hangingLanterns = [];
    this.risingLanterns = [];
    this.fallingLeaves = [];
    this.fireflies = [];
    this.lanternTemplates = [];
    
    // Thorana elements
    this.thoranaBulbs = [];
    this.thoranaGroups = []; // [colombo, ampara]
    
    // Interactive Hotspots
    this.hotspots = [];
    
    this.time = 0;
  }

  // Set callbacks
  setCallbacks(progressCb, loadedCb) {
    this.onLoadProgress = progressCb;
    this.onExhibitLoaded = loadedCb;
  }

  init() {
    // 1. Create Scene, Camera, and WebGLRenderer
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050714, 0.035);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
    // Bird's eye starting position
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Setup OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // lock ground looking
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 26;
    this.controls.target.set(0, -1, 0);

    // 3. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xfffae0, 0.65);
    this.scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xffaa00, 1.8, 40);
    mainLight.position.set(0, 8, 5);
    this.scene.add(mainLight);

    // 4. Load Textures
    this.textureLoader = new THREE.TextureLoader();
    this.textures = {
      glow: this.createGlowTexture(),
      fog: this.createFogTexture(),
      leaf: this.createLeafTexture(),
      lanternPaper: this.createLanternPaperTexture(),
      particle: this.createParticleTexture(), // Smooth white-to-transparent particle gradient for the point cloud
      image1: this.textureLoader.load('/image_1.jpg'), // Colombo Thorana
      image2: this.textureLoader.load('/image_2.jpg'), // Ampara Thorana
      dharmaWheel: this.textureLoader.load('/dharma_wheel.jpg')
    };

    // 5. Set up Hotspot configuration and meshes
    this.setupHotspots();

    // 6. Setup Scene exhibit groups (Initially invisible)
    this.setupSceneGroups();

    // 7. Load GLB Tikal point cloud and FBX Lanterns
    this.loadModels();

    // 8. Setup Global Particles (ambient embers)
    this.setupGlobalParticles();

    // 9. Attach Click Listener for Raycasting
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('resize', () => this.onResize());
  }

  // ==========================================
  // MODELS & ASSET LOADERS
  // ==========================================

  loadModels() {
    let loadedCount = 0;
    const totalAssets = 4; // Tikal GLB + FBX Lanterns + Sthupa Srilanka + Mahaweli Sthupa

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === totalAssets && this.onLoadProgress) {
        this.onLoadProgress(100);
      }
    };

    // A. Load Tikal Guatemala GLB Point Cloud
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/tikal.glb',
      (gltf) => {
        const root = gltf.scene;
        
        // Ensure child matrixWorld values are fully computed
        root.updateMatrixWorld(true);

        // 1. Gather all points from all child point meshes in the GLTF scene
        const positions = [];
        const colors = [];
        
        root.traverse((child) => {
          // Robust check: match any child containing vertices in its geometry
          if (child.geometry && child.geometry.attributes.position) {
            const posAttr = child.geometry.attributes.position;
            const colAttr = child.geometry.attributes.color;
            if (posAttr) {
              const count = posAttr.count;
              // Decimation factor of 2 to achieve a highly dense, realistic mesh look
              const decimationFactor = 2;
              const localPt = new THREE.Vector3();
              for (let i = 0; i < count; i += decimationFactor) {
                localPt.set(
                  getVal(posAttr, i, 0),
                  getVal(posAttr, i, 1),
                  getVal(posAttr, i, 2)
                );
                // Bake child matrix transforms into the vertex coordinate
                localPt.applyMatrix4(child.matrixWorld);
                positions.push(localPt.x, localPt.y, localPt.z);
                
                if (colAttr) {
                  let r = getVal(colAttr, i, 0);
                  let g = getVal(colAttr, i, 1);
                  let b = getVal(colAttr, i, 2);
                  // Normalization helper: divide by 255 only if colors are in 0-255 range (max value > 2.0)
                  if (r > 2.0 || g > 2.0 || b > 2.0) {
                    r /= 255;
                    g /= 255;
                    b /= 255;
                  }
                  colors.push(r, g, b);
                } else {
                  colors.push(0.8, 0.7, 0.5); // Warm color fallback
                }
              }
            }
          }
        });

        if (positions.length === 0) {
          console.error("No points found in GLB!");
          checkComplete();
          return;
        }

        // 2. Build the optimized single BufferGeometry
        const mergedGeometry = new THREE.BufferGeometry();
        mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        if (colors.length > 0) {
          mergedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        }

        // Center the geometry directly so vertices are aligned at (0, 0, 0)
        mergedGeometry.computeBoundingBox();
        mergedGeometry.center();

        // 3. Create Points mesh and style with depthWrite: false to boost rendering
        const mergedMaterial = new THREE.PointsMaterial({
          size: 0.05, // Small point size to blend points smoothly into a solid-looking surface
          vertexColors: true,
          transparent: true,
          opacity: 0.90, // Slightly higher opacity for a more solid feel
          map: this.textures.particle, // Soft circular particle texture instead of squares
          blending: THREE.NormalBlending,
          sizeAttenuation: true,
          depthWrite: false
        });

        const mergedPoints = new THREE.Points(mergedGeometry, mergedMaterial);

        // 4. Scale and position the mergedPoints mesh directly
        const box = mergedGeometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const targetScale = 22.0 / maxDim; // scaled to fit beautifully in the view
          mergedPoints.scale.setScalar(targetScale);
        } else {
          mergedPoints.scale.setScalar(1.0);
        }

        // Position slightly downwards
        mergedPoints.position.set(0, -2.0, 0);

        this.scene.add(mergedPoints);
        this.tikalPoints = mergedPoints;

        checkComplete();
      },
      (xhr) => {
        const total = xhr.total || 40603288; // Fallback to Tikal GLB size if headers are missing
        const percent = Math.min(95, Math.round((xhr.loaded / total) * 90));
        if (this.onLoadProgress) {
          this.onLoadProgress(percent);
        }
      },
      (err) => {
        console.error('Failed to load Tikal point cloud:', err);
        checkComplete();
      }
    );

    // B. Load FBX Lanterns
    const fbxLoader = new FBXLoader();
    fbxLoader.load(
      '/vesak_lanterns.fbx',
      (fbx) => {
        this.extractFBXLanterns(fbx);
        checkComplete();
      },
      undefined,
      (err) => {
        console.error('Failed to load FBX model:', err);
        checkComplete();
      }
    );

    // C. Load Sthupa Srilanka GLB
    gltfLoader.load(
      '/sthupa_srilanka.glb',
      (gltf) => {
        this.setupSthupaSrilanka(gltf.scene);
        checkComplete();
      },
      undefined,
      (err) => {
        console.error('Failed to load Sthupa Srilanka model:', err);
        checkComplete();
      }
    );

    // D. Load Mahaweli Sthupa GLB
    gltfLoader.load(
      '/voxel_tutorial_-_scene_2.glb',
      (gltf) => {
        this.setupMahaweliSthupa(gltf.scene);
        checkComplete();
      },
      undefined,
      (err) => {
        console.error('Failed to load Voxel Tutorial model:', err);
        checkComplete();
      }
    );
  }

  extractFBXLanterns(fbx) {
    const mappings = [
      { body: 'Cube004', tails: ['Plane005', 'Plane006'], color: 0xffb703 }, // Yellow Octagonal
      { body: 'Cube002', tails: ['Plane004', 'Plane003'], color: 0xff4d6d }, // Pink
      { body: 'Cube001', tails: ['Plane001', 'Plane002'], color: 0x00f5d4 }, // Cyan
      { body: 'Cube003', tails: ['Plane007', 'Plane008'], color: 0xfb8500 }  // Orange
    ];

    this.lanternTemplates = [];

    mappings.forEach(map => {
      const bodyMesh = fbx.getObjectByName(map.body);
      if (!bodyMesh) return;

      const group = new THREE.Group();
      
      const bodyClone = bodyMesh.clone();
      const centerPos = bodyMesh.position.clone();
      bodyClone.position.set(0, 0, 0);

      // Preserve original materials and textures!
      if (bodyClone.material) {
        if (Array.isArray(bodyClone.material)) {
          bodyClone.material = bodyClone.material.map(mat => {
            const m = mat.clone();
            m.emissive = new THREE.Color(map.color);
            m.emissiveIntensity = 1.3;
            m.roughness = 0.25;
            m.metalness = 0.1;
            m.side = THREE.DoubleSide;
            return m;
          });
        } else {
          bodyClone.material = bodyClone.material.clone();
          bodyClone.material.emissive = new THREE.Color(map.color);
          bodyClone.material.emissiveIntensity = 1.3;
          bodyClone.material.roughness = 0.25;
          bodyClone.material.metalness = 0.1;
          bodyClone.material.side = THREE.DoubleSide;
        }
      }
      group.add(bodyClone);

      const tailClones = [];
      map.tails.forEach(tailName => {
        const tailMesh = fbx.getObjectByName(tailName);
        if (tailMesh) {
          const tailClone = tailMesh.clone();
          tailClone.position.sub(centerPos);
          
          // Preserve tail material!
          if (tailClone.material) {
            if (Array.isArray(tailClone.material)) {
              tailClone.material = tailClone.material.map(mat => {
                const m = mat.clone();
                m.transparent = true;
                m.opacity = 0.85;
                m.side = THREE.DoubleSide;
                return m;
              });
            } else {
              tailClone.material = tailClone.material.clone();
              tailClone.material.transparent = true;
              tailClone.material.opacity = 0.85;
              tailClone.material.side = THREE.DoubleSide;
            }
          }
          group.add(tailClone);
          tailClones.push(tailClone);
        }
      });

      this.lanternTemplates.push({
        group,
        tails: tailClones,
        color: map.color
      });
    });

    // Replace placeholders
    this.hangingLanterns.forEach(lan => {
      this.swapWithFBXLantern(lan);
    });
  }

  swapWithFBXLantern(lanternGroup) {
    const data = lanternGroup.userData;
    if (data.isFBX || !this.lanternTemplates || this.lanternTemplates.length === 0) return;

    const placeholder = lanternGroup.getObjectByName('placeholder');
    if (placeholder) lanternGroup.remove(placeholder);

    if (data.placeholderTails) {
      data.placeholderTails.forEach(tail => lanternGroup.remove(tail));
    }

    const template = this.lanternTemplates[data.templateIndex % this.lanternTemplates.length];
    const fbxClone = template.group.clone();
    fbxClone.scale.setScalar(data.scale * 0.95);
    fbxClone.rotation.y = Math.random() * Math.PI * 2;

    // Clone materials per instance to avoid sharing material settings (such as opacity during fades)
    fbxClone.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    const tails = [];
    fbxClone.traverse(child => {
      if (child.isMesh && child.name.includes('Plane')) {
        tails.push(child);
      }
    });

    lanternGroup.add(fbxClone);
    data.tails = tails;
    data.isFBX = true;
  }

  // ==========================================
  // PROCEDURAL TEXTURE GENERATION
  // ==========================================
  
  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 200, 50, 0.85)');
    grad.addColorStop(0.5, 'rgba(251, 133, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  createFogTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(150, 180, 220, 0.22)');
    grad.addColorStop(0.4, 'rgba(100, 120, 170, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  createLeafTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2c5e3b';
    ctx.strokeStyle = '#4e855c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.bezierCurveTo(48, 8, 56, 26, 32, 54);
    ctx.bezierCurveTo(8, 26, 16, 8, 32, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return new THREE.CanvasTexture(canvas);
  }

  createLanternPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  // ==========================================
  // HOTSPOTS SETUP
  // ==========================================

  setupHotspots() {
    // Configurations of Tikal 3D hotspots
    const hotspotsConfig = [
      {
        sceneIndex: 1, // Lantern path
        name: "Lanterns Path",
        labelId: "label-lanterns",
        position: new THREE.Vector3(-2.8, -0.4, 3.2),
        // Camera Preset look-at
        cameraPos: new THREE.Vector3(-2.8, 0.5, 5.0),
        lookAt: new THREE.Vector3(-2.8, -0.2, 1.0)
      },
      {
        sceneIndex: 2, // Colombo Thorana
        name: "Colombo Thorana",
        labelId: "label-thorana1",
        position: new THREE.Vector3(-6.2, 0.2, -4.5),
        cameraPos: new THREE.Vector3(-6.2, 1.4, -0.8),
        lookAt: new THREE.Vector3(-6.2, 1.0, -6.0)
      },
      {
        sceneIndex: 3, // Ampara Thorana
        name: "Ampara Thorana",
        labelId: "label-thorana2",
        position: new THREE.Vector3(6.2, 0.4, -4.5),
        cameraPos: new THREE.Vector3(6.2, 1.6, -0.8),
        lookAt: new THREE.Vector3(6.2, 1.2, -6.0)
      },
      {
        sceneIndex: 4, // Sri Lankan Sthupa
        name: "Sthupa Sri Lanka",
        labelId: "label-sthupa1",
        position: new THREE.Vector3(3.5, -1.8, 2.5),
        cameraPos: new THREE.Vector3(3.5, -0.7, 4.8),
        lookAt: new THREE.Vector3(3.5, -1.5, 0.5)
      },
      {
        sceneIndex: 5, // Mahaweli Sthupa
        name: "Mahaweli Sthupa",
        labelId: "label-mahaweli",
        position: new THREE.Vector3(0.0, -1.8, -6.5),
        cameraPos: new THREE.Vector3(0.0, -0.7, -3.0),
        lookAt: new THREE.Vector3(0.0, -1.2, -9.0)
      }
    ];

    const hotspotGeom = new THREE.SphereGeometry(0.24, 16, 16);

    hotspotsConfig.forEach(conf => {
      // Glow hotspot marker material
      const hotspotMat = new THREE.MeshBasicMaterial({
        color: 0xffd200,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(hotspotGeom, hotspotMat);
      mesh.position.copy(conf.position);
      mesh.userData = {
        sceneIndex: conf.sceneIndex,
        cameraPos: conf.cameraPos,
        lookAt: conf.lookAt,
        labelId: conf.labelId,
        isHotspot: true,
        loaded: false
      };
      
      // Floating ring around hotspot
      const ringGeom = new THREE.RingGeometry(0.35, 0.4, 32);
      ringGeom.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb703, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      mesh.add(ring);
      mesh.userData.ring = ring;

      this.scene.add(mesh);
      this.hotspots.push(mesh);
    });
  }

  // ==========================================
  // SCENE EXHIBITS CREATION
  // ==========================================

  setupSceneGroups() {
    // 5 groups corresponding to active exhibits
    // Group 0: Ruins Map overview (Empty overlay)
    const emptyGroup = new THREE.Group();
    this.sceneGroups.push(emptyGroup);
    this.scene.add(emptyGroup);

    // Group 1: Lantern Tunnel Exhibit (located at Vector3(-2.8, -0.4, 3.2))
    const group1 = new THREE.Group();
    group1.position.set(-2.8, -0.4, 3.2);
    group1.visible = false;
    group1.userData = { opacity: 0 };
    
    // Add hanging lanterns in row
    for (let i = 0; i < 6; i++) {
      const zOffset = i * -1.8;
      const xOffset = i % 2 === 0 ? -0.8 : 0.8;
      const yOffset = 1.0;
      this.createHangingLantern(group1, new THREE.Vector3(xOffset, yOffset, zOffset), 0.4, 0xffb703, i % 4);
    }
    this.createFogPuffs(group1, 8);
    this.sceneGroups.push(group1);
    this.scene.add(group1);

    // Group 2: Colombo Thorana Exhibit (located at Vector3(-6.2, 0.2, -4.5))
    const group2 = new THREE.Group();
    group2.position.set(-6.2, 0.2, -4.5);
    group2.visible = false;
    group2.userData = { opacity: 0 };
    this.build3DThoranaStructure(group2, this.textures.image1, 0xffb703); // Colombo Thorana
    this.createFogPuffs(group2, 6);
    this.sceneGroups.push(group2);
    this.scene.add(group2);

    // Group 3: Ampara Thorana Exhibit (located at Vector3(6.2, 0.4, -4.5))
    const group3 = new THREE.Group();
    group3.position.set(6.2, 0.4, -4.5);
    group3.visible = false;
    group3.userData = { opacity: 0 };
    // Ampara Thorana uses image2.jpg and a cyan/magenta bulb theme!
    this.build3DThoranaStructure(group3, this.textures.image2, 0x00f5d4); 
    this.createFogPuffs(group3, 6);
    this.sceneGroups.push(group3);
    this.scene.add(group3);

    // Group 4: Sri Lankan Sthupa Exhibit (located at Vector3(3.5, -1.8, 2.5))
    const group4 = new THREE.Group();
    group4.position.set(3.5, -1.8, 2.5);
    group4.visible = false;
    group4.userData = { opacity: 0 };
    this.createFogPuffs(group4, 6, 0.2);
    this.sceneGroups.push(group4);
    this.scene.add(group4);

    // Group 5: Mahaweli Sthupa Exhibit (located at Vector3(0.0, -1.8, -6.5))
    const group5 = new THREE.Group();
    group5.position.set(0.0, -1.8, -6.5);
    group5.visible = false;
    group5.userData = { opacity: 0 };
    this.createFogPuffs(group5, 6, 0.2);
    this.sceneGroups.push(group5);
    this.scene.add(group5);
  }

  setupSthupaSrilanka(model) {
    const group = this.sceneGroups[4];
    if (!group) return;

    // Create a local centering group to prevent coordinate offsets from shifting the model unscaled
    const centerGroup = new THREE.Group();
    group.add(centerGroup);

    // Center the model inside centerGroup
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.copy(center).negate(); // offset geometry translation
    centerGroup.add(model);

    // Scale centerGroup based on model size
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetScale = 3.5 / maxDim; // scale stupa to be about 3.5 units
      centerGroup.scale.setScalar(targetScale);
    }

    // Position centerGroup slightly above the ground plane
    centerGroup.position.set(0, 0.2, 0);

    // Override material to make it a beautiful, clean, traditional white plaster stupa with glowing night highlights
    model.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          metalness: 0.0,
          emissive: new THREE.Color(0x333333), // Spiritual white glow in the dark
          side: THREE.DoubleSide
        });
        child.userData.baseOpacity = 1.0;
        child.material.transparent = true;
        child.material.opacity = 0; // start hidden
      }
    });
  }

  setupMahaweliSthupa(model) {
    const group = this.sceneGroups[5];
    if (!group) return;

    // Create a local centering group to prevent coordinate offsets from shifting the model unscaled
    const centerGroup = new THREE.Group();
    group.add(centerGroup);

    // Center the model inside centerGroup
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.copy(center).negate(); // offset geometry translation
    centerGroup.add(model);

    // Scale centerGroup based on model size
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetScale = 3.5 / maxDim; // scale voxel stupa to be 3.5 units
      centerGroup.scale.setScalar(targetScale);
    }

    // Position centerGroup slightly above the ground plane
    centerGroup.position.set(0, 0.2, 0);

    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.userData.baseOpacity = child.material.opacity !== undefined ? child.material.opacity : 1.0;
        child.material.transparent = true;
        child.material.opacity = 0; // start hidden
      }
    });
  }

  build3DThoranaStructure(group, textureMap, primaryBulbColor) {
    const thoranaRoot = new THREE.Group();
    thoranaRoot.scale.setScalar(0.7); // scale down inside Tikal ruins
    group.add(thoranaRoot);

    // 1. Core Background Arch Plane
    const archGeom = new THREE.PlaneGeometry(8.5, 6.5);
    const archMat = new THREE.MeshBasicMaterial({
      map: textureMap,
      side: THREE.DoubleSide
    });
    const archMesh = new THREE.Mesh(archGeom, archMat);
    thoranaRoot.add(archMesh);

    // 2. Dharma Wheel in crown
    const wheelGeom = new THREE.CircleGeometry(0.65, 32);
    const wheelMat = new THREE.MeshBasicMaterial({
      map: this.textures.dharmaWheel,
      transparent: true,
      side: THREE.DoubleSide
    });
    const dharmaWheel = new THREE.Mesh(wheelGeom, wheelMat);
    dharmaWheel.position.set(0, 2.7, 0.12);
    dharmaWheel.name = 'dharmaWheel';
    thoranaRoot.add(dharmaWheel);

    // 3. Bulbs grid
    const colors = [
      primaryBulbColor,
      0xffffff,
      0xfb8500,
      0xffb703
    ].map(hex => new THREE.Color(hex));

    // Outer arch bulbs
    const outerRadius = 3.4;
    const bulbCountOuter = 18;
    for (let i = 0; i <= bulbCountOuter; i++) {
      const theta = Math.PI + (i / bulbCountOuter) * Math.PI;
      const x = Math.cos(theta) * outerRadius;
      const y = Math.sin(theta) * outerRadius * 0.7 + 0.3;
      
      const bulb = this.addBulbMesh(thoranaRoot, x, y, 0.1, colors[i % colors.length], i * 0.25, group);
      this.thoranaBulbs.push(bulb);
    }

    // Panel vertical separators
    const separatorsX = [-1.6, 0, 1.6];
    separatorsX.forEach((lx, idx) => {
      const numLinesBulbs = 8;
      for (let i = 0; i < numLinesBulbs; i++) {
        const y = -2.2 + (i / numLinesBulbs) * 3.6;
        const bulb = this.addBulbMesh(thoranaRoot, lx, y, 0.1, colors[(i + idx) % colors.length], i * 0.3, group);
        this.thoranaBulbs.push(bulb);
      }
    });

    // Store references to rotate the wheel
    this.thoranaGroups.push(dharmaWheel);
  }

  addBulbMesh(parentGroup, x, y, z, color, phase, exhibitGroup) {
    const meshMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const geom = new THREE.SphereGeometry(0.035, 4, 4);
    const mesh = new THREE.Mesh(geom, meshMat);
    mesh.position.set(x, y, z);
    parentGroup.add(mesh);

    return {
      mesh,
      material: meshMat,
      baseColor: color.clone(),
      phase: phase,
      exhibitGroup // Store exhibit group reference directly to prevent parent path crashes in render loop
    };
  }

  setupGlobalParticles() {
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 12;
      
      speeds.push({
        x: (Math.random() - 0.5) * 0.003,
        y: (Math.random() - 0.5) * 0.003 - 0.002,
        z: (Math.random() - 0.5) * 0.003
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size: 0.15,
      map: this.textures.glow,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      color: 0xffdb8b
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.ambientParticles.userData = { speeds };
    this.scene.add(this.ambientParticles);
  }

  // ==========================================
  // SCENE BUILDER HELPERS
  // ==========================================

  createHangingLantern(group, position, scale, colorHex, templateIndex = -1) {
    const lanternGroup = new THREE.Group();
    lanternGroup.position.copy(position);

    const tIndex = templateIndex >= 0 ? templateIndex : Math.floor(Math.random() * 4);

    lanternGroup.userData = {
      basePosition: position.clone(),
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 1.0 + Math.random() * 0.8,
      scale: scale,
      color: colorHex,
      templateIndex: tIndex,
      isFBX: false
    };

    const geom = new THREE.OctahedronGeometry(scale, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      map: this.textures.lanternPaper,
      emissive: colorHex,
      emissiveIntensity: 1.2,
      roughness: 0.4
    });
    const placeholderMesh = new THREE.Mesh(geom, mat);
    placeholderMesh.name = 'placeholder';
    lanternGroup.add(placeholderMesh);

    const light = new THREE.PointLight(colorHex, 1.2 * scale, 5);
    light.position.set(0, 0, 0);
    lanternGroup.add(light);
    lanternGroup.userData.light = light;

    const tailMaterial = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const tailGeom = new THREE.PlaneGeometry(0.08 * scale, 1.3 * scale);
    const placeholderTails = [];
    for (let i = 0; i < 4; i++) {
      const tail = new THREE.Mesh(tailGeom, tailMaterial);
      const angle = (i / 4) * Math.PI * 2;
      tail.position.set(Math.cos(angle) * 0.15 * scale, -scale * 0.9, Math.sin(angle) * 0.15 * scale);
      tail.rotation.y = angle;
      tail.rotation.x = 0.05;
      lanternGroup.add(tail);
      placeholderTails.push(tail);
    }
    lanternGroup.userData.placeholderTails = placeholderTails;

    group.add(lanternGroup);

    if (this.lanternTemplates && this.lanternTemplates.length > 0) {
      this.swapWithFBXLantern(lanternGroup);
    }

    this.hangingLanterns.push(lanternGroup);
    return lanternGroup;
  }

  createFogPuffs(group, count, yOffset = 0) {
    const fogMaterial = new THREE.MeshBasicMaterial({
      map: this.textures.fog,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const geom = new THREE.PlaneGeometry(6, 6);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, fogMaterial);
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        yOffset + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 16 - 5
      );
      mesh.rotation.z = Math.random() * Math.PI * 2;
      
      mesh.userData = {
        driftX: (Math.random() - 0.5) * 0.003,
        driftZ: (Math.random() - 0.5) * 0.003,
        baseRotation: mesh.rotation.z,
        rotSpeed: (Math.random() - 0.5) * 0.002
      };
      
      if (!group.userData.fogPuffs) group.userData.fogPuffs = [];
      group.userData.fogPuffs.push(mesh);
      group.add(mesh);
    }
  }

  createLightRays(group) {
    const rayGeom = new THREE.ConeGeometry(3, 10, 16, 1, true);
    rayGeom.translate(0, -5, 0);

    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xffba08,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const raysGroup = new THREE.Group();
    raysGroup.position.set(0, 4, -4);
    raysGroup.rotation.x = Math.PI * 0.9;

    for (let i = 0; i < 3; i++) {
      const ray = new THREE.Mesh(rayGeom, rayMat);
      ray.rotation.z = (i - 1) * 0.22;
      ray.scale.set(1 - i * 0.15, 1, 1 - i * 0.15);
      raysGroup.add(ray);
    }

    group.add(raysGroup);
    group.userData.rays = raysGroup;
  }

  createSparks(group) {
    const count = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = -4 + Math.random() * 2;
      positions[i + 2] = -5 + (Math.random() - 0.5) * 4;

      speeds.push({
        x: (Math.random() - 0.5) * 0.01,
        y: 0.018 + Math.random() * 0.018,
        z: (Math.random() - 0.5) * 0.005
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: this.textures.glow,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      color: 0xff6b35
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { speeds };
    group.add(points);
    group.userData.sparks = points;
  }

  createFallingLeaves(group) {
    const leafMat = new THREE.MeshBasicMaterial({
      map: this.textures.leaf,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });

    const leafGeom = new THREE.PlaneGeometry(0.18, 0.18);

    for (let i = 0; i < 30; i++) {
      const mesh = new THREE.Mesh(leafGeom, leafMat);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 8
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      mesh.userData = {
        speedY: -0.01 - Math.random() * 0.012,
        speedRotX: 0.01 + Math.random() * 0.02,
        speedRotY: 0.01 + Math.random() * 0.02,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1 + Math.random() * 2
      };

      this.fallingLeaves.push(mesh);
      group.add(mesh);
    }
  }

  createFireflies(group) {
    const count = 25;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = [];

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = -1.5 + Math.random() * 3.5;
      positions[i + 2] = (Math.random() - 0.5) * 6;

      phases.push({
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.0,
        glowPhase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size: 0.18,
      map: this.textures.glow,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      color: 0xccff33
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { phases };
    group.add(points);
    this.fireflies = points;
  }

  createRisingSkyLanterns(group) {
    const lanternCount = 20;
    const cylinderGeom = new THREE.CylinderGeometry(0.16, 0.19, 0.42, 8, 1, true);
    const capGeom = new THREE.CircleGeometry(0.19, 8);
    capGeom.rotateX(Math.PI / 2);
    capGeom.translate(0, -0.21, 0);

    const paperMat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      map: this.textures.lanternPaper,
      side: THREE.DoubleSide
    });

    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < lanternCount; i++) {
      const lanGroup = new THREE.Group();
      
      const paperCyl = new THREE.Mesh(cylinderGeom, paperMat);
      const bottomFire = new THREE.Mesh(capGeom, fireMat);
      
      lanGroup.add(paperCyl);
      lanGroup.add(bottomFire);

      lanGroup.position.set(
        (Math.random() - 0.5) * 12,
        -3.5 + Math.random() * 5.5,
        -2 - Math.random() * 8
      );

      lanGroup.scale.setScalar(0.55 + Math.random() * 0.65);

      lanGroup.userData = {
        speedY: 0.005 + Math.random() * 0.007,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.8 + Math.random() * 0.6
      };

      this.risingLanterns.push(lanGroup);
      group.add(lanGroup);
    }
  }

  // ==========================================
  // RAYCASTING & INTERACTION
  // ==========================================

  onPointerDown(event) {
    if (this.isTransitioning || this.activeScene !== 0) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycastMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.raycastMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast against hotspots
    this.raycaster.setFromCamera(this.raycastMouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspots);

    if (intersects.length > 0) {
      const clickedHotspot = intersects[0].object;
      this.triggerLoadExhibit(clickedHotspot);
    }
  }

  // Called when a hotspot mesh OR HTML label is clicked
  triggerLoadExhibit(hotspotMesh) {
    if (this.isTransitioning) return;

    const data = hotspotMesh.userData;
    
    // Zoom/Fly camera to target preset
    this.isTransitioning = true;
    
    // Disable OrbitControls briefly
    this.controls.enabled = false;

    // Fade HTML labels out
    document.getElementById('hotspot-labels').classList.add('hidden');

    // 1. Camera Zoom Transition
    gsap.to(this.camera.position, {
      x: data.cameraPos.x,
      y: data.cameraPos.y,
      z: data.cameraPos.z,
      duration: 2.2,
      ease: 'power3.inOut'
    });

    gsap.to(this.controls.target, {
      x: data.lookAt.x,
      y: data.lookAt.y,
      z: data.lookAt.z,
      duration: 2.2,
      ease: 'power3.inOut',
      onComplete: () => {
        this.controls.enabled = true;
        this.isTransitioning = false;
        
        // Show Reset/Back button on UI
        document.getElementById('reset-view-btn').classList.remove('hidden');
      }
    });

    // 2. Load & Fade-in Exhibit Group
    const exhibitGroup = this.sceneGroups[data.sceneIndex];
    
    // Fade in animation
    exhibitGroup.visible = true;
    gsap.to(exhibitGroup.userData, {
      opacity: 1,
      duration: 1.5,
      onUpdate: () => {
        // Apply opacity fade to all children meshes recursively
        exhibitGroup.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = (child.userData.baseOpacity || 0.85) * exhibitGroup.userData.opacity;
          }
        });
      }
    });

    // Set loaded state on hotspot and hide it
    hotspotMesh.visible = false;
    data.loaded = true;

    this.activeScene = data.sceneIndex;

    // Trigger callback to main entry (to mix audio and update description)
    if (this.onExhibitLoaded) {
      this.onExhibitLoaded(data.sceneIndex);
    }
  }

  // Camera Reset: returns camera to overview map
  resetToOverview() {
    if (this.isTransitioning || this.activeScene === 0) return;

    this.isTransitioning = true;
    this.controls.enabled = false;

    // Hide Back button on UI
    document.getElementById('reset-view-btn').classList.add('hidden');

    // Collapse currently active exhibit group (fade out opacity back to 0)
    const activeGroup = this.sceneGroups[this.activeScene];
    if (activeGroup) {
      gsap.to(activeGroup.userData, {
        opacity: 0,
        duration: 1.0,
        ease: 'power2.out',
        onUpdate: () => {
          activeGroup.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = (child.userData.baseOpacity || 0.85) * activeGroup.userData.opacity;
            }
          });
        },
        onComplete: () => {
          activeGroup.visible = false;
        }
      });
    }

    // Reset active hotspot loaded state so it collapses and is expandable again
    const activeHotspot = this.hotspots.find(h => h.userData.sceneIndex === this.activeScene);
    if (activeHotspot) {
      activeHotspot.userData.loaded = false;
      activeHotspot.visible = true;
    }

    // Smoothly fly camera back to Bird's eye preset
    gsap.to(this.camera.position, {
      x: 0,
      y: 8,
      z: 14,
      duration: 2.0,
      ease: 'power2.inOut'
    });

    gsap.to(this.controls.target, {
      x: 0,
      y: -1,
      z: 0,
      duration: 2.0,
      ease: 'power2.inOut',
      onComplete: () => {
        this.controls.enabled = true;
        this.isTransitioning = false;
        this.activeScene = 0;
        
        // Restore hotspot visibility for unloaded hotspots
        this.hotspots.forEach(hotspot => {
          if (!hotspot.userData.loaded) {
            hotspot.visible = true;
          }
        });

        // Show HTML labels container again
        document.getElementById('hotspot-labels').classList.remove('hidden');

        // Notify main
        if (this.onExhibitLoaded) {
          this.onExhibitLoaded(0);
        }
      }
    });
  }

  // Updates HTML label coordinates on screen space
  updateHTMLHotspotLabels() {
    if (this.activeScene !== 0 || this.isTransitioning) {
      document.getElementById('hotspot-labels').classList.add('hidden');
      return;
    }

    const tempV = new THREE.Vector3();

    this.hotspots.forEach(hotspot => {
      const data = hotspot.userData;
      const el = document.getElementById(data.labelId);

      if (!el) return;

      if (data.loaded) {
        el.classList.add('hidden');
        return;
      }

      tempV.copy(hotspot.position);
      tempV.project(this.camera);

      // Convert normalized coordinates to screen pixel positions
      const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      // Hide if behind camera clip plane
      if (tempV.z > 1) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });

    document.getElementById('hotspot-labels').classList.remove('hidden');
  }

  // ==========================================
  // GENERAL RENDER ANIMATIONS
  // ==========================================

  animate() {
    this.time += 0.016;

    // Update OrbitControls
    if (this.controls) {
      this.controls.update();
    }

    // 1. Projects HTML Labels in Real-time
    this.updateHTMLHotspotLabels();

    // 2. Hotspots rotation & float animation
    this.hotspots.forEach(hotspot => {
      if (hotspot.visible) {
        // Pulsing scale
        const scale = 1.0 + Math.sin(this.time * 4) * 0.08;
        hotspot.scale.setScalar(scale);

        // Spin the outer indicator ring
        const ring = hotspot.userData.ring;
        if (ring) {
          ring.rotation.y = this.time * 1.5;
        }
      }
    });

    // 3. Animate Global Ambient Particles
    if (this.ambientParticles) {
      const posArr = this.ambientParticles.geometry.attributes.position.array;
      const speeds = this.ambientParticles.userData.speeds;
      for (let i = 0; i < posArr.length; i += 3) {
        const idx = i / 3;
        posArr[i] += speeds[idx].x;
        posArr[i + 1] += speeds[idx].y;
        posArr[i + 2] += speeds[idx].z;

        if (Math.abs(posArr[i]) > 10) posArr[i] = (Math.random() - 0.5) * 20;
        if (posArr[i + 1] < -6) posArr[i + 1] = 6;
        if (Math.abs(posArr[i + 2]) > 10) posArr[i + 2] = (Math.random() - 0.5) * 16;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Fog Puffs drift
    this.sceneGroups.forEach(group => {
      if (group.visible && group.userData.fogPuffs) {
        group.userData.fogPuffs.forEach(puff => {
          puff.position.x += puff.userData.driftX;
          puff.position.z += puff.userData.driftZ;
          puff.rotation.z = puff.userData.baseRotation + Math.sin(this.time * 0.08) * 0.15;

          if (Math.abs(puff.position.x) > 10) puff.position.x = (Math.random() - 0.5) * 10;
          if (puff.position.z > 6) puff.position.z = -10;
        });
      }
    });

    // 5. Hanging Lanterns sway (Group 1 & 4)
    this.sceneGroups.forEach((group, idx) => {
      if (group.visible) {
        group.traverse(child => {
          if (child.userData && child.userData.basePosition) {
            const data = child.userData;
            const angleX = Math.sin(this.time * data.swaySpeed + data.swayPhase) * 0.06;
            const angleZ = Math.cos(this.time * data.swaySpeed * 0.82 + data.swayPhase) * 0.04;
            child.rotation.set(angleX, child.rotation.y, angleZ);

            if (data.light) {
              data.light.intensity = (1.2 + Math.sin(this.time * 18 + data.swayPhase) * 0.2) * data.scale;
            }

            if (data.tails) {
              data.tails.forEach((tail, tIdx) => {
                tail.rotation.x = 0.05 + Math.sin(this.time * 4.0 + data.swayPhase + tIdx) * 0.08;
              });
            }
          }
        });
      }
    });

    // 6. Thoranas light patterns and crown spins (Group 2 & 3)
    // Colombo (Index 2) and Ampara (Index 3)
    [2, 3].forEach(idx => {
      const group = this.sceneGroups[idx];
      if (group.visible) {
        // Spin crown wheels
        const wheel = this.thoranaGroups[idx - 2];
        if (wheel) {
          wheel.rotation.z += 0.005;
        }

        // Chasing light sequence
        const sequence = Math.floor(this.time * 1.5) % 3;
        this.thoranaBulbs.forEach(bulb => {
          // Verify bulb belongs to this group using robust reference comparison
          if (bulb.exhibitGroup === group) {
            let brightness = 0.25;
            
            if (sequence === 0) {
              brightness = (Math.sin(this.time * 10 - bulb.mesh.position.y * 3) > 0) ? 1.0 : 0.25;
            } else if (sequence === 1) {
              brightness = (Math.sin(this.time * 8 - bulb.mesh.position.x * 2.5) > 0) ? 1.0 : 0.25;
            } else {
              brightness = 0.5 + Math.sin(this.time * 25 + bulb.phase) * 0.5;
            }

            bulb.material.color.copy(bulb.baseColor).multiplyScalar(brightness);
          }
        });
      }
    });

    // 7. Group 4: Rising sky lanterns
    if (this.sceneGroups[4].visible) {
      this.risingLanterns.forEach(lan => {
        lan.position.y += lan.userData.speedY;
        lan.position.x += Math.sin(this.time * lan.userData.swaySpeed + lan.userData.swayPhase) * 0.004;
        lan.rotation.y += 0.004;

        if (lan.position.y > 6.0) {
          lan.position.y = -3.5;
          lan.position.x = (Math.random() - 0.5) * 8;
        }
      });
    }

    // Render WebGL
    this.renderer.render(this.scene, this.camera);
  }
}
