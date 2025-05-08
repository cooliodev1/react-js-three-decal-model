import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber" // added useThree
import { useGLTF, ContactShadows, OrbitControls, Decal, useTexture } from "@react-three/drei"
import { proxy, useSnapshot } from "valtio"
import { MOUSE, PCFSoftShadowMap, Color, TextureLoader, RepeatWrapping } from "three"
import { HexColorPicker } from "react-colorful"
import { MeshListPanel, OutlineEffect } from "./components/MeshListPanel" // Add this import

// Change the state declaration to export it
export const state = proxy({
  textureScale: 1, // Add this line - default scale is 1
  displacementFactor: 0, // Add this line - default displacement is 0
  current: null,
  items: {}, // Will be populated with materials from GLB
  decalTransform: {
    position: [0, 0.1, 0.5],
    rotation: [0, 0, 0],
    scale: 0.3,
  },
  decalTarget: "", // Will be set to first material found
  orbitEnabled: true,
  animationEnabled: true, // Add this line
  lights: {
    ambient: {
      intensity: 0.07,
      position: [0, 5, 0] // Add ambient light position
    },
    spot: {
      intensity: 0.5,
      angle: 0.1,
      penumbra: 1,
      position: [10, 15, 10]
    },
    hemisphere: {
      intensity: 0.5,
      skyColor: "#ffffff",
      groundColor: "#444444"
    },
    point: {
      intensity: 0.5,
      distance: 10,
      decay: 2,
      position: [5, 5, 5]
    },
    directional: {
      intensity: 0.5,
      position: [5, 5, 5],
      castShadow: true
    }
  },
  shadows: {
    position: [0, -0.8, 0],
    opacity: 0.25,
    scale: 10,
    blur: 1.5,
    far: 0.8
  },
  presets: {
    saved: [], // Will store saved presets
    current: null // Currently selected preset
  },
  video: {
    recordings: [],
    isRecording: false
  },
  materials: null, // Add this line
  materialPreset: {
    current: 'cotton-jersey-grey',  // Default preset
    colors: {
      'cotton-jersey-grey': '',
      'cotton-tricotine': '',  // Added new preset placeholder
      'nylon-webbing': ''  // Added new preset placeholder
    },
    applyToTargetOnly: false  // Add this line
  },
  cameraDistance: 4,  // new state for camera zoom
  decalMovementEnabled: true,  // new property to control decal movement
  selectedMesh: null, // Add this line
  outlinedMesh: null, // Add this line
  currentModel: "hoodie2.glb", // Default model
})

const materialPresets = {
  'leather-quilted': {
    name: 'Leather Quilted',
    textures: {
      baseColor: '/leather-quilted/col.png',
      normal: '/leather-quilted/normals.png',
      height: '/leather-quilted/displacement.png',
    },
  },
  'cotton-tricotine': {
    name: 'Cotton Tricotine',
    textures: {
      baseColor: '/cotton-tricotine/cotton-tricotine_BaseColor.png',
      // height: '/cotton-tricotine/cotton-tricotine_Height.png',
      normal: '/cotton-tricotine/cotton-tricotine_Normal.png',
      // roughness: '/cotton-tricotine/cotton-tricotine_Roughness.png',
      // ao: '/cotton-tricotine/cotton-tricotine_AmbientOcclusion.png',
      // metallic: '/cotton-tricotine/cotton-tricotine_Metallic.png',
      // opacity: '/cotton-tricotine/cotton-tricotine_Opacity.png',
    },
  },
  'blue-turbo': {
    name: 'Blue Turbo',
    textures: {
      baseColor: '/blue-turbo-acryllic/blue-turbo-acryllic_BaseColor.png',
      // height: '/blue-turbo-acryllic/blue-turbo-acryllic_Height.png',
      normal: '/blue-turbo-acryllic/blue-turbo-acryllic_Normal.png',
      // roughness: '/blue-turbo-acryllic/blue-turbo-acryllic_Roughness.png',
      // ao: '/blue-turbo-acryllic/blue-turbo-acryllic_AmbientOcclusion.png',
      // metallic: '/blue-turbo-acryllic/blue-turbo-acryllic_Metallic.png',
      // opacity: '/blue-turbo-acryllic/blue-turbo-acryllic_Opacity.png',
    },
  },
  'cotton-jersey-grey': {
    name: 'Cotton Jersey Grey',
    textures: {
      baseColor: '/cotton-jersey-grey/col.png',
      // height: '/cotton-jersey-grey/height.png',
      normal: '/cotton-jersey-grey/normal.png',
      // roughness: '/cotton-jersey-grey/roughness.png',
      // ao: '/cotton-jersey-grey/ao.png',
      // metallic: '/cotton-jersey-grey/metallic.png',
      // opacity: '/cotton-jersey-grey/opacity.png',
    },
  },
  'nylon-webbing': {
    name: 'Nylon Webbing',
    textures: {
      baseColor: '/nylon-webbing/nylon-webbing_BaseColor.png',
      // height: '/nylon-webbing/nylon-webbing_Height.png',
      normal: '/nylon-webbing/nylon-webbing_Normal.png',
      // roughness: '/nylon-webbing/nylon-webbing_Roughness.png',
      // ao: '/nylon-webbing/nylon-webbing_AmbientOcclusion.png',
      // metallic: '/nylon-webbing/nylon-webbing_Metallic.png',
      // opacity: '/nylon-webbing/nylon-webbing_Opacity.png',
    },
  }
}

export default function App() {
  const snap = useSnapshot(state)

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 0, snap.cameraDistance], fov: 5 }}
        gl={{ 
          alpha: false,
          antialias: true,
          logarithmicDepthBuffer: true,
          shadowMap: {
            enabled: true,
            type: PCFSoftShadowMap
          }
        }}
        scene={{
          background: new Color('#000000')
        }}
        style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          width: "100%", 
          height: "100%" 
        }}>
          
        <ambientLight 
          intensity={snap.lights.ambient.intensity} 
          position={snap.lights.ambient.position} 
        />
        <spotLight 
          intensity={snap.lights.spot.intensity} 
          angle={snap.lights.spot.angle} 
          penumbra={snap.lights.spot.penumbra} 
          position={snap.lights.spot.position} 
          castShadow 
        />
        <hemisphereLight 
          intensity={snap.lights.hemisphere.intensity}
          color={snap.lights.hemisphere.skyColor}
          groundColor={snap.lights.hemisphere.groundColor}
        />
        <pointLight 
          intensity={snap.lights.point.intensity}
          distance={snap.lights.point.distance}
          decay={snap.lights.point.decay}
          position={snap.lights.point.position}
        />
        <directionalLight 
          intensity={snap.lights.directional.intensity}
          position={snap.lights.directional.position}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0001}
        />
        <Model3D />
        <ContactShadows 
          position={snap.shadows.position}
          opacity={snap.shadows.opacity}
          scale={snap.shadows.scale}
          blur={snap.shadows.blur}
          far={snap.shadows.far}
        />
        <OrbitControls
          enableRotate={snap.orbitEnabled}
          enableZoom={true}
          enablePan={false}
          mouseButtons={{
            LEFT: MOUSE.PAN,
            RIGHT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
          }}
          minDistance={2}
          maxDistance={10}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
        <CameraController />
        <OutlineEffect />
       
      </Canvas>
      <MaterialPresetPicker />
      <ZoomControls />
      <DecalControls />
      <LightingControls />
      <PresetControls />
      <VideoRecorder />
      <MeshListPanel />
      <ModelSwitcher />
    </>
  )
}

// Add a new floating panel with a button to switch models
function ModelSwitcher() {
  const snap = useSnapshot(state);

  function switchModel() {
    console.log("Current model:", state.currentModel);
    // Make sure the path to new_model.glb is correct
    const newModelPath = "/new_model.glb"; // Adjust this path to where your model is actually located
    console.log("Switching to:", newModelPath);
    state.currentModel = newModelPath;
  }

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "800px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px"
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Model Switcher</h2>
      <button
        onClick={switchModel}
        style={{
          padding: "8px 16px",
          borderRadius: "4px",
          border: "none",
          background: "#4CAF50",
          color: "white",
          cursor: "pointer"
        }}>
        Switch to New Model
      </button>
      <div style={{ fontSize: "12px", marginTop: "4px", color: "#666" }}>
        Current: {snap.currentModel}
      </div>
    </div>
  );
}

// First, rename the component definition
function Model3D() {
  const ref = useRef();
  const snap = useSnapshot(state);
  const [currentLoadedModel, setCurrentLoadedModel] = useState(null);

  // Clear the GLTF cache and dispose of previous model
  useEffect(() => {
    console.log("Model change detected:", snap.currentModel);
    
    // Cleanup previous model
    if (currentLoadedModel) {
      console.log("Cleaning up previous model");
      currentLoadedModel.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    // Clear the cache
    useGLTF.clear(snap.currentModel);
    
    // Load new model
    const loadModel = async () => {
      try {
        const gltf = await useGLTF(snap.currentModel);
        console.log("New model loaded:", gltf);
        setCurrentLoadedModel(gltf.scene);
      } catch (error) {
        console.error("Error loading model:", error);
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      useGLTF.clear(snap.currentModel);
    };
  }, [snap.currentModel]);

  const { nodes, materials } = useGLTF(snap.currentModel);
  console.log("Current nodes:", nodes);
  console.log("Current materials:", materials);

  const decalTexture = useTexture("/decal.png");
  const [hovered, setHovered] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loadedTextures, setLoadedTextures] = useState({});

  // Load textures for current material preset
  useEffect(() => {
    const loader = new TextureLoader();
    const currentPreset = materialPresets[snap.materialPreset.current];

    const loadTexture = async (url) => {
      return new Promise((resolve) => {
        loader.load(url, resolve);
      });
    };

    const loadAllTextures = async () => {
      const textures = {};
      for (const [key, path] of Object.entries(currentPreset.textures)) {
        textures[key] = await loadTexture(path);
      }
      setLoadedTextures(textures);
    };

    loadAllTextures();
  }, [snap.materialPreset.current]); // Add this dependency

  // Apply textures to materials
  useEffect(() => {
    if (Object.keys(loadedTextures).length > 0) {
      if (snap.materialPreset.applyToTargetOnly && snap.decalTarget) {
        // Find the node that matches the selected target
        const targetNode = nodes[snap.decalTarget];
        if (targetNode) {
          const materialKey = targetNode.material?.name || snap.decalTarget;
          const sharedMaterial = materials[materialKey];
          if (sharedMaterial) {
            // Clone the material so that changes affect only this mesh
            const targetMaterial = sharedMaterial.clone();
            Object.values(loadedTextures).forEach(texture => {
              if (texture) {
                texture.repeat.setScalar(snap.textureScale);
                texture.wrapS = texture.wrapT = RepeatWrapping;
                texture.needsUpdate = true;
              }
            });
            if (loadedTextures.baseColor)
              targetMaterial.map = loadedTextures.baseColor;
            if (loadedTextures.normal)
              targetMaterial.normalMap = loadedTextures.normal;
            if (loadedTextures.roughness)
              targetMaterial.roughnessMap = loadedTextures.roughness;
            if (loadedTextures.metallic)
              targetMaterial.metalnessMap = loadedTextures.metallic;
            if (loadedTextures.ao)
              targetMaterial.aoMap = loadedTextures.ao;
            if (loadedTextures.height) {
              targetMaterial.displacementMap = loadedTextures.height;
              targetMaterial.displacementScale = snap.displacementFactor;
              targetMaterial.displacementBias = 0;
            }
            if (loadedTextures.emissive)
              targetMaterial.emissiveMap = loadedTextures.emissive;
            targetMaterial.needsUpdate = true;
            
            // Assign the cloned material only to the target node
            targetNode.material = targetMaterial;
          }
        }
      } else {
        // Apply to all materials
        Object.values(materials).forEach(material => {
          Object.values(loadedTextures).forEach(texture => {
            if (texture) {
              texture.repeat.setScalar(snap.textureScale);
              texture.wrapS = texture.wrapT = RepeatWrapping;
              texture.needsUpdate = true;
            }
          });
          if (loadedTextures.baseColor)
            material.map = loadedTextures.baseColor;
          if (loadedTextures.normal)
            material.normalMap = loadedTextures.normal;
          if (loadedTextures.roughness)
            material.roughnessMap = loadedTextures.roughness;
          if (loadedTextures.metallic)
            material.metalnessMap = loadedTextures.metallic;
          if (loadedTextures.ao)
            material.aoMap = loadedTextures.ao;
          if (loadedTextures.height) {
            material.displacementMap = loadedTextures.height;
            material.displacementScale = snap.displacementFactor;
            material.displacementBias = 0;
          }
          if (loadedTextures.emissive)
            material.emissiveMap = loadedTextures.emissive;
          material.needsUpdate = true;
        });
      }
    }
  }, [loadedTextures, materials, nodes, snap.materialPreset.applyToTargetOnly, snap.decalTarget]);

  // Initialize state with dynamic materials when component mounts
  useEffect(() => {
    if (nodes) {
      const nodeEntries = Object.entries(nodes)
        .filter(([key, node]) => node.geometry)
        .reduce((acc, [key, node]) => {
          acc[key] = "#ffffff";
          return acc;
        }, {});
      state.items = nodeEntries;

      // Set the initial decalTarget to the first unique node key
      const firstMeshKey = Object.keys(nodeEntries)[0];
      if (firstMeshKey) {
        state.decalTarget = firstMeshKey;
      }
    }
  }, [nodes]);

  useFrame((state) => {
    if (!snap.animationEnabled) return; // Add this line
    const t = state.clock.getElapsedTime();
    ref.current.rotation.set(
      Math.cos(t / 4) / 8,
      Math.sin(t / 4) / 8,
      -0.2 - (1 + Math.sin(t / 1.5)) / 20
    );
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10;
  });

  useEffect(() => {
    const cursorSvg = `<svg width=\"64\" height=\"64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g clip-path=\"url(#clip0)\"><path fill=\"rgba(255,255,255,0.5)\" d=\"M29.5 54C43.031 54 54 43.031 54 29.5S43.031 5 29.5 5 5 15.969 5 29.5 15.969 54 29.5 54z\" stroke=\"#000\"/></g></svg>`;
    const defaultSvg = `<svg width=\"64\" height=\"64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"rgba(255,255,255,0.5)\" d=\"M29.5 54C43.031 54 54 43.031 54 29.5S43.031 5 29.5 5 5 15.969 5 29.5 15.969 54 29.5 54z\" stroke=\"#000\"/></svg>`;
    if (hovered) {
      document.body.style.cursor = `url('data:image/svg+xml;base64,${btoa(
        cursorSvg
      )}'), auto`;
      return () => {
        document.body.style.cursor = `url('data:image/svg+xml;base64,${btoa(
          defaultSvg
        )}'), auto`;
      };
    }
  }, [hovered]);

  useEffect(() => {
    const handleUp = () => setDragging(false);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);

  const shouldApplyDecal = (partKey) => partKey === snap.decalTarget;

  const handlePointerMove = (e) => {
    if (!dragging || !snap.decalMovementEnabled) return; // Check if decal movement is enabled
    e.stopPropagation();
    const localPoint = e.object.worldToLocal(e.point.clone());
    state.decalTransform.position = [localPoint.x, localPoint.y, localPoint.z];
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.object.name === snap.decalTarget) {
      // Check the mesh's name
      e.stopPropagation();
      setDragging(true);
    }
  };

  // Add this useEffect for debugging
  useEffect(() => {
    console.log("Available nodes:", Object.keys(nodes));
    console.log("Available materials:", Object.keys(materials));
  }, [nodes, materials]);

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(e.object.name || e.object.material.name);
      }}
      onPointerOut={(e) => {
        if (e.intersections.length === 0) {
          setHovered(null);
        }
      }}
      onPointerMissed={() => {
        state.current = null;
        state.outlinedMesh = null; // Clear the outline when clicking outside
      }}
      onClick={(e) => {
        e.stopPropagation();
        const meshName = e.object.name || e.object.material.name;
        state.current = meshName;
        state.selectedMesh = meshName;
        state.outlinedMesh = meshName; // Set the outlined mesh
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {Object.entries(nodes)
        .filter(([key]) => typeof nodes[key].geometry !== "undefined")
        .map(([key, node]) => {
          const material =
            key === snap.decalTarget && node.material
              ? node.material
              : materials[node.material?.name || key];

          if (!material) {
            return null;
          }

          return (
            <mesh
              key={key}
              name={key}
              receiveShadow
              castShadow
              geometry={node.geometry}
              material={material}
              material-color={snap.items[key]}
              material-envMapIntensity={0.8}
              material-roughness={0.7}
              material-metalness={0.2}
              segments={32}
              subdivisions={3}
            >
              {key === snap.decalTarget && (
                <Decal
                  mesh={node}
                  position={snap.decalTransform.position}
                  rotation={snap.decalTransform.rotation}
                  scale={snap.decalTransform.scale}
                  map={decalTexture}
                  flat
                />
              )}
            </mesh>
          );
        })}
    </group>
  );
}

function Picker() {
  const snap = useSnapshot(state)
  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        display: snap.current ? "block" : "none",
        background: "rgba(255,255,255,0.9)",
        padding: "10px",
        borderRadius: "4px",
      }}>
      <HexColorPicker
        className="picker"
        color={snap.items[snap.current]}
        onChange={(color) => {
          state.items[snap.current] = color
        }}
      />
      <h1 style={{ margin: "8px 0 0 0", fontSize: "16px" }}>{snap.current}</h1>
    </div>
  )
}

function DecalControls() {
  const snap = useSnapshot(state)

  function updatePosition(axis, value) {
    const newPos = [...snap.decalTransform.position]
    newPos[axis] = value
    state.decalTransform.position = newPos
  }

  function toggleFlipY(e) {
    const newRot = [...snap.decalTransform.rotation]
    newRot[1] = e.target.checked ? Math.PI : 0
    state.decalTransform.rotation = newRot
  }

  function updateTarget(e) {
    state.decalTarget = e.target.value
  }

  function toggleOrbit(e) {
    state.orbitEnabled = e.target.checked
  }

  function toggleAnimation(e) {
    state.animationEnabled = e.target.checked
  }

  return (
    <div style={{
      position: "absolute",
      bottom: "20px",
      left: "20px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px",
      maxWidth: "320px",
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Decal Transform Controls</h2>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Enable Bouncing Animation:
        <input 
          type="checkbox" 
          checked={snap.animationEnabled} 
          onChange={toggleAnimation} 
          style={{ marginLeft: "8px" }} 
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Enable Decal Movement:
        <input 
          type="checkbox" 
          checked={snap.decalMovementEnabled} 
          onChange={(e) => { state.decalMovementEnabled = e.target.checked }} 
          style={{ marginLeft: "8px" }} 
        />
      </label>
      <label style={{ display: "block", marginBottom: "8px" }}>
        Select Target Mesh:
        <select 
          value={snap.decalTarget} 
          onChange={updateTarget} 
          style={{ display: "block", marginTop: "4px", width: "100%" }}
        >
          {Object.keys(snap.items).map((materialKey) => (
            <option key={materialKey} value={materialKey}>
              {materialKey}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Flip Decal Horizontally:
        <input type="checkbox" checked={snap.decalTransform.rotation[1] === Math.PI} onChange={toggleFlipY} style={{ marginLeft: "8px" }} />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Enable Orbit Rotation:
        <input type="checkbox" checked={snap.orbitEnabled} onChange={toggleOrbit} style={{ marginLeft: "8px" }} />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Position X:
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={snap.decalTransform.position[0]}
          onChange={(e) => updatePosition(0, parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Position Y:
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={snap.decalTransform.position[1]}
          onChange={(e) => updatePosition(1, parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Position Z:
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={snap.decalTransform.position[2]}
          onChange={(e) => updatePosition(2, parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Scale:
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.01}
          value={snap.decalTransform.scale}
          onChange={(e) => {
            state.decalTransform.scale = parseFloat(e.target.value)
          }}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
    </div>
  )
}

function LightingControls() {
  const snap = useSnapshot(state)

  function updateLightPosition(lightType, axis, value) {
    const newPos = [...snap.lights[lightType].position]
    newPos[axis] = parseFloat(value)
    state.lights[lightType].position = newPos
  }

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      right: "20px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px",
      maxWidth: "320px",
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Lighting Controls</h2>
      
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Ambient Light</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Intensity:
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snap.lights.ambient.intensity}
            onChange={(e) => {
              state.lights.ambient.intensity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <div style={{ marginTop: "8px" }}>
          <h4 style={{ fontSize: "14px", margin: "8px 0" }}>Position:</h4>
          <label style={{ display: "block", marginBottom: "4px" }}>
            X:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[0]}
              onChange={(e) => updateLightPosition('ambient', 0, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Y:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[1]}
              onChange={(e) => updateLightPosition('ambient', 1, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Z:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[2]}
              onChange={(e) => updateLightPosition('ambient', 2, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Spot Light</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Intensity:
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={snap.lights.spot.intensity}
            onChange={(e) => {
              state.lights.spot.intensity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Angle:
          <input
            type="range"
            min={0}
            max={Math.PI/2}
            step={0.01}
            value={snap.lights.spot.angle}
            onChange={(e) => {
              state.lights.spot.angle = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Penumbra:
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snap.lights.spot.penumbra}
            onChange={(e) => {
              state.lights.spot.penumbra = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <div style={{ marginTop: "8px" }}>
          <h4 style={{ fontSize: "14px", margin: "8px 0" }}>Position:</h4>
          <label style={{ display: "block", marginBottom: "4px" }}>
            X:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[0]}
              onChange={(e) => updateLightPosition('spot', 0, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Y:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[1]}
              onChange={(e) => updateLightPosition('spot', 1, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Z:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[2]}
              onChange={(e) => updateLightPosition('spot', 2, e.target.value)}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Hemisphere Light</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Intensity:
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={snap.lights.hemisphere.intensity}
            onChange={(e) => {
              state.lights.hemisphere.intensity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Sky Color:
          <input
            type="color"
            value={snap.lights.hemisphere.skyColor}
            onChange={(e) => {
              state.lights.hemisphere.skyColor = e.target.value
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Ground Color:
          <input
            type="color"
            value={snap.lights.hemisphere.groundColor}
            onChange={(e) => {
              state.lights.hemisphere.groundColor = e.target.value
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Point Light</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Intensity:
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={snap.lights.point.intensity}
            onChange={(e) => {
              state.lights.point.intensity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Distance:
          <input
            type="range"
            min={0}
            max={50}
            step={0.1}
            value={snap.lights.point.distance}
            onChange={(e) => {
              state.lights.point.distance = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Decay:
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={snap.lights.point.decay}
            onChange={(e) => {
              state.lights.point.decay = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Directional Light</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Intensity:
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={snap.lights.directional.intensity}
            onChange={(e) => {
              state.lights.directional.intensity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Cast Shadow:
          <input
            type="checkbox"
            checked={snap.lights.directional.castShadow}
            onChange={(e) => {
              state.lights.directional.castShadow = e.target.checked
            }}
            style={{ marginLeft: "8px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Contact Shadows</h3>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Opacity:
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snap.shadows.opacity}
            onChange={(e) => {
              state.shadows.opacity = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Scale:
          <input
            type="range"
            min={1}
            max={20}
            step={0.1}
            value={snap.shadows.scale}
            onChange={(e) => {
              state.shadows.scale = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Blur:
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={snap.shadows.blur}
            onChange={(e) => {
              state.shadows.blur = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Far:
          <input
            onChange={(e) => {
              state.shadows.far = parseFloat(e.target.value)
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>
    </div>
  )
}

function PresetControls() {
  const snap = useSnapshot(state)

  useEffect(() => {
    // Load saved presets from localStorage on mount
    const savedPresets = localStorage.getItem('lightingPresets')
    if (savedPresets) {
      state.presets.saved = JSON.parse(savedPresets)
    }
  }, [])

  function saveCurrentSettings() {
    const preset = {
      id: Date.now(),
      name: `Preset ${snap.presets.saved.length + 1}`,
      settings: {
        lights: JSON.parse(JSON.stringify(snap.lights)),
        shadows: JSON.parse(JSON.stringify(snap.shadows)),
        decalTransform: JSON.parse(JSON.stringify(snap.decalTransform))
      }
    }
    const newPresets = [...snap.presets.saved, preset]
    state.presets.saved = newPresets
    localStorage.setItem('lightingPresets', JSON.stringify(newPresets))
  }

  function loadPreset(preset) {
    state.lights = JSON.parse(JSON.stringify(preset.settings.lights))
    state.shadows = JSON.parse(JSON.stringify(preset.settings.shadows))
    state.decalTransform = JSON.parse(JSON.stringify(preset.settings.decalTransform))
    state.presets.current = preset.id
  }

  function deletePreset(id) {
    state.presets.saved = snap.presets.saved.filter(p => p.id !== id)
    if (snap.presets.current === id) {
      state.presets.current = null
    }
  }

  return (
    <div style={{
      position: "absolute",
      top: "50%",
      right: "20px",
      transform: "translateY(-50%)",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px",
      maxWidth: "200px",
      maxHeight: "400px",
      overflowY: "auto"
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Presets</h2>
      <button
        onClick={saveCurrentSettings}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "8px",
          background: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
        Save Current Settings
      </button>
      
      <div style={{ borderTop: "1px solid #ccc", paddingTop: "8px" }}>
        {snap.presets.saved.map((preset) => (
          <div
            key={preset.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
              padding: "4px",
              background: snap.presets.current === preset.id ? "#e0e0e0" : "transparent",
              borderRadius: "4px"
            }}>
            <button
              onClick={() => loadPreset(preset)}
              style={{
                flex: 1,
                padding: "4px 8px",
                marginRight: "4px",
                background: "none",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer"
              }}>
              {preset.name}
            </button>
            <button
              onClick={() => deletePreset(preset.id)}
              style={{
                padding: "4px 8px",
                background: "#ff4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoRecorder() {
  const snap = useSnapshot(state)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Get the canvas element from Three.js
    const canvas = document.querySelector('canvas')
    canvasRef.current = canvas
  }, [])

  const startRecording = async () => {
    if (!canvasRef.current) return
    
    const stream = canvasRef.current.captureStream(60) // 60fps
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000
    })

    const chunks = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString()
      const newRecording = {
        id: Date.now(),
        name: `Recording ${snap.video.recordings.length + 1}`,
        url,
        timestamp
      }
      state.video.recordings = [...snap.video.recordings, newRecording]
      localStorage.setItem('videoRecordings', JSON.stringify(state.video.recordings))
      state.video.isRecording = false
    }

    setMediaRecorder(recorder)
    recorder.start()
    state.video.isRecording = true

    // Stop recording after 8 seconds
    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, 8000)
  }

  useEffect(() => {
    // Load saved recordings from localStorage
    const savedRecordings = localStorage.getItem('videoRecordings')
    if (savedRecordings) {
      state.video.recordings = JSON.parse(savedRecordings)
    }
  }, [])

  const deleteRecording = (id) => {
    state.video.recordings = snap.video.recordings.filter(r => r.id !== id)
    localStorage.setItem('videoRecordings', JSON.stringify(state.video.recordings))
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      background: 'rgba(255,255,255,0.9)',
      padding: '10px',
      borderRadius: '4px',
      maxWidth: '320px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Video Recorder</h2>
      <button
        onClick={startRecording}
        disabled={snap.video.isRecording}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          background: snap.video.isRecording ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: snap.video.isRecording ? 'default' : 'pointer'
        }}>
        {snap.video.isRecording ? 'Recording... (8s)' : 'Start Recording'}
      </button>

      <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px' }}>
        {snap.video.recordings.map((recording) => (
          <div
            key={recording.id}
            style={{
              marginBottom: '8px',
              padding: '8px',
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
            <div style={{ marginBottom: '4px' }}>{recording.name}</div>
            <video
              controls
              style={{
                width: '100%',
                marginBottom: '4px',
                borderRadius: '2px'
              }}
              src={recording.url}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              <a
                href={recording.url}
                download={`${recording.name}.webm`}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: '#2196F3',
                  color: 'white',
                  textDecoration: 'none',
                  textAlign: 'center',
                  borderRadius: '4px'
                }}>
                Download
              </a>
              <button
                onClick={() => deleteRecording(recording.id)}
                style={{
                  padding: '4px 8px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MaterialPresetPicker() {
  const snap = useSnapshot(state)
  
  const switchMaterialPreset = (presetKey) => {
    state.materialPreset.current = presetKey
    
    if (snap.materialPreset.applyToTargetOnly) {
      // Apply only to target mesh
      if (snap.decalTarget) {
        state.items[snap.decalTarget] = state.materialPreset.colors[presetKey]
      }
    } else {
      // Apply to all materials
      Object.keys(state.items).forEach(materialKey => {
        state.items[materialKey] = state.materialPreset.colors[presetKey]
      })
    }
  }

  const toggleApplyToTarget = (e) => {
    state.materialPreset.applyToTargetOnly = e.target.checked
  }

  const updateTextureScale = (e) => {
    const newScale = parseFloat(e.target.value);
    state.textureScale = newScale;
  };

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "300px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px"
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Material Presets</h2>
      <label style={{ 
        display: "block", 
        marginBottom: "12px",
        fontSize: "14px"
      }}>
        <input 
          type="checkbox"
          checked={snap.materialPreset.applyToTargetOnly}
          onChange={toggleApplyToTarget}
          style={{ marginRight: "8px" }}
        />
        Apply to target mesh only
      </label>
      <div style={{
        display: "flex",
        gap: "16px",
        marginBottom: "12px"
      }}>
        <label style={{ 
          flex: 1,
          fontSize: "14px"
        }}>
          Texture Scale (x):
          <input 
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={snap.textureScale}
            onChange={updateTextureScale}
            style={{ 
              width: "100%", 
              marginTop: "8px"
            }}
          />
          <span style={{ 
            display: "block", 
            textAlign: "center", 
            fontSize: "12px" 
          }}>
            {snap.textureScale}x
          </span>
        </label>

        <label style={{ 
          flex: 1,
          fontSize: "14px"
        }}>
          Displacement:
          <input 
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snap.displacementFactor}
            onChange={(e) => {
              state.displacementFactor = parseFloat(e.target.value);
            }}
            style={{ 
              width: "100%", 
              marginTop: "8px"
            }}
          />
          <span style={{ 
            display: "block", 
            textAlign: "center", 
            fontSize: "12px" 
          }}>
            {snap.displacementFactor.toFixed(2)}
          </span>
        </label>
      </div>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        {Object.entries(materialPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => switchMaterialPreset(key)}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              background: snap.materialPreset.current === key ? "#2196F3" : "#4CAF50",
              color: "white",
              cursor: "pointer"
            }}>
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  )
}



function CameraController() {
  const { camera } = useThree()
  const snap = useSnapshot(state)
  useEffect(() => {
    camera.position.set(0, 0, snap.cameraDistance)
  }, [snap.cameraDistance, camera])
  return null
}

function ZoomControls() {
  const snap = useSnapshot(state)
  function updateZoom(e) {
    state.cameraDistance = parseFloat(e.target.value)
  }
  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "520px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px"
    }}>
      <label>
        Camera Zoom:
        <input 
          type="range" 
          min="2" 
          max="10" 
          step="0.1" 
          value={snap.cameraDistance} 
          onChange={updateZoom}
          style={{ width: "100%", marginLeft: "8px" }}
        />
      </label>
    </div>
  )
}
