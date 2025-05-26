import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, ContactShadows, OrbitControls, Decal, useTexture } from "@react-three/drei"
import { proxy, useSnapshot } from "valtio"
import { MOUSE, PCFSoftShadowMap, Color, TextureLoader, Vector3, RepeatWrapping } from "three"
import { HexColorPicker } from "react-colorful"
import { 
  MeshListPanel, 
  OutlineEffect, 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "./components/MeshListPanel"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { useSpring, a } from "@react-spring/three" // Add this import

// Preload all LOD models at startup 
useGLTF.preload("/hoodie-lod0.gltf")
useGLTF.preload("/hoodie-lod1.gltf")
useGLTF.preload("/hoodie-lod2.gltf")

export const state = proxy({
  textureScale: 1,
  displacementFactor: 0,
  current: null,
  items: {},
  decalTransform: {
    position: [0, 0.1, 0.5],
    rotation: [0, 0, 0],
    scale: 0.3,
    polygonOffset: 0,
    roughness: 0.5,
    opacity: 0.95
  },
  decalTarget: "",
  orbitEnabled: true,
  animationEnabled: true,
  lights: {
    ambient: {
      intensity: 0.07,
      position: [0, 5, 0]
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
    saved: [],
    current: null
  },
  video: {
    recordings: [],
    isRecording: false
  },
  materials: null,
  materialPreset: {
    current: 'cotton-jersey-grey',
    colors: {
      'cotton-jersey-grey': '#ff0000',
      'cotton-tricotine': '',
      'nylon-webbing': ''
    },
    applyToTargetOnly: false
  },
  cameraDistance: 4,
  decalMovementEnabled: true,
  selectedMesh: null,
  outlinedMesh: null,
  currentModel: {
    name: "hoodie0",
    lod: 0,
    paths: {
      lod0: "/hoodie-lod0.gltf",
      lod1: "/hoodie-lod1.gltf",
      lod2: "/hoodie-lod2.gltf",
      lod3: "/hoodie-lod2.gltf"
    },
    lodThresholds: {
      lod0: 15,
      lod1: 44,
      lod2: 55,
      lod3: 66
    }
  }
})

function Model({ url }) {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')

  const { scene } = useGLTF(
    url,
    loader => loader.setDRACOLoader(dracoLoader)
  )

  return <primitive object={scene} />
}

function CameraDistanceOverlay() {
  const snap = useSnapshot(state);
  return (
    // Positioned top-right, remains absolute for now
    <div className="camera-distance-overlay" style={{ top: "10px", right: "10px" }}> 
      Distance: {snap.cameraDistance.toFixed(2)}
    </div>
  );
}

function LODController() {
  const { camera } = useThree();
  const snap = useSnapshot(state);

  useFrame(() => {
    const distance = camera.position.distanceTo(new Vector3(0, 0, 0));
    let newLOD = 3;

    if (distance <= snap.currentModel.lodThresholds.lod0) {
      newLOD = 0;
    } else if (distance <= snap.currentModel.lodThresholds.lod1) {
      newLOD = 1;
    } else if (distance <= snap.currentModel.lodThresholds.lod2) {
      newLOD = 2;
    } else if (distance > snap.currentModel.lodThresholds.lod3) {
      newLOD = 3;
    }

    if (newLOD !== snap.currentModel.lod) {
      state.currentModel.lod = newLOD;
      console.log(`Switching to LOD ${newLOD} at distance ${distance.toFixed(2)}`);
    }
  });

  return null;
}

function LODControls() {
  const snap = useSnapshot(state);
  const [autoLOD, setAutoLOD] = useState(true);

  const handleLODChange = (level) => {
    if (!autoLOD) {
      state.currentModel.lod = level;
    }
  };

  const toggleAutoLOD = () => {
    setAutoLOD(!autoLOD);
  };

  return (
    // Removed style prop, will flow in sidebar
    <div className="control-panel"> 
      <h2 className="panel-title">LOD Controls</h2>
      <label className="compact-label">
        <input
          type="checkbox"
          checked={autoLOD}
          onChange={toggleAutoLOD}
          className="compact-checkbox"
        />
        Automatic LOD
      </label>
      <div 
        className="flex-column"
        style={{ 
          opacity: autoLOD ? 0.5 : 1,
          pointerEvents: autoLOD ? "none" : "auto"
      }}>
        {[0, 1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => handleLODChange(level)}
            className={`compact-button ${snap.currentModel.lod === level ? "compact-button-secondary" : ""}`}
            style={{ background: snap.currentModel.lod === level ? "#2196F3" : "#4CAF50" }}
            >
            LOD {level} ({level === 0 ? "Highest" : level === 3 ? "Lowest" : "Medium"})
          </button>
        ))}
      </div>
      <div className="text-xs">
        Current: LOD {snap.currentModel.lod}
      </div>
    </div>
  );
}

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
      normal: '/cotton-tricotine/cotton-tricotine_Normal.png',
    },
  },
  'blue-turbo': {
    name: 'Blue Turbo',
    textures: {
      baseColor: '/blue-turbo-acryllic/blue-turbo-acryllic_BaseColor.png',
      normal: '/blue-turbo-acryllic/blue-turbo-acryllic_Normal.png',
    },
  },
  'cotton-jersey-grey': {
    name: 'Cotton Jersey Grey',
    textures: {
      baseColor: '/cotton-jersey-grey/col.png',
      normal: '/cotton-jersey-grey/normal.png',
    },
  },
  'nylon-webbing': {
    name: 'Nylon Webbing',
    textures: {
      baseColor: '/nylon-webbing/nylon-webbing_BaseColor.png',
      normal: '/nylon-webbing/nylon-webbing_Normal.png',
    },
  }
}

export default function App() {
  const snap = useSnapshot(state)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <button className="sidebar-toggle-button" onClick={toggleSidebar}>
        ☰
      </button>
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
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
          
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
        <LODController />

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
            RIGHT:  MOUSE.ROTATE,
            MIDDLE:MOUSE.DOLLY,
          }}
          minDistance={2}
          maxDistance={999}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          onChange={e => {
            const cam = e.target.object
            state.cameraDistance = cam.position.distanceTo(new Vector3(0, 0, 0))
          }}
        />
        <OutlineEffect />
       
      </Canvas>

      {/* Sidebar Container - Assuming it will be on the left */}
      <div className={`ui-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <Picker /> {/* Moved Picker into the sidebar */}
        <ZoomControls />
        <LODControls />
        <ModelSwitcher />
        <MeshListPanel />
        <MaterialPresetPicker />
        <DecalControls />
        <LightingControls />
        <PresetControls />
        <VideoRecorder />
      </div>

      {/* Components that remain outside the sidebar */}
      {/* <Picker /> Picker is now in sidebar */}
      <CameraDistanceOverlay /> 

    </>
  )
}

function ModelSwitcher() {
  const snap = useSnapshot(state);

  function switchModel() {
    const isFlat = snap.currentModel.name === "flat_hoodie";
    
    // Save current selections
    const currentSelections = {
      target: snap.decalTarget,
      selected: snap.selectedMesh,
      outlined: snap.outlinedMesh
    };
    
    if (isFlat) {
      // Switch back to original model
      const originalModel = {
        name: "hoodie0",
        lod: 0,
        paths: {
          lod0: "/hoodie-lod0.gltf",
          lod1: "/hoodie-lod1.gltf",
          lod2: "/hoodie-lod2.gltf",
          lod3: "/hoodie-lod2.gltf"
        },
        lodThresholds: {
          lod0: 15,
          lod1: 44,
          lod2: 55,
          lod3: 66
        },
        decalTransform: {
          position: [0, 0.1, 0.5],
          rotation: [0, 0, 0],
          scale: 0.3
        }
      };
      
      state.currentModel = originalModel;
      
      // Apply original decal transform
      if (originalModel.decalTransform) {
        state.decalTransform = {
          ...state.decalTransform,
          position: originalModel.decalTransform.position,
          rotation: originalModel.decalTransform.rotation,
          scale: originalModel.decalTransform.scale
        };
      }
    } else {
      // Switch to flat model
      const flatModel = {
        name: "new",
        lod: 0,
        paths: {
          lod0: "/merch-wall.glb",
          lod1: "/merch-wall.glb",
          lod2: "/merch-wall.glb",
          lod3: "/merch-wall.glb"        },
        lodThresholds: {
          lod0: 15,
          lod1: 44,
          lod2: 55,
          lod3: 66
        },
        decalTransform: {
          position: [0, 0, 0.1],
          rotation: [Math.PI/2, 0, 0],
          scale: 0.2
        }
      };
      
      state.currentModel = flatModel;
      
      // Apply flat model decal transform
      if (flatModel.decalTransform) {
        state.decalTransform = {
          ...state.decalTransform,
          position: flatModel.decalTransform.position,
          rotation: flatModel.decalTransform.rotation,
          scale: flatModel.decalTransform.scale
        };
      }
    }
    
    // Create a delayed function to restore selections after model loads
    setTimeout(() => {
      // Check if the previously selected mesh names still exist in the new model
      // If mesh names are the same across models, we can restore selections
      // You might need to map mesh names between models if they differ
      if (currentSelections.target) {
        state.decalTarget = currentSelections.target;
      }
      if (currentSelections.selected) {
        state.selectedMesh = currentSelections.selected;
      }
      if (currentSelections.outlined) {
        state.outlinedMesh = currentSelections.outlined;
      }
    }, 500); // Allow time for model to load
  }

  return (
    // Removed style prop
    <div className="control-panel"> 
      <h2 className="panel-title">Model Switcher</h2>
      <button
        onClick={switchModel}
        className="compact-button"
      >
        Switch to {snap.currentModel.name === "flat_hoodie" ? "Standing Hoodie" : "Flat Hoodie"}
      </button>
      <div className="text-xs">
        Current: {snap.currentModel.name} (LOD {snap.currentModel.lod})
      </div>
    </div>
  );
}

function Model3D() {
  const ref = useRef();
  const snap = useSnapshot(state);
  const [currentLoadedModel, setCurrentLoadedModel] = useState(null);
  const [previousLOD, setPreviousLOD] = useState(snap.currentModel.lod);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { opacity } = useSpring({
    opacity: isTransitioning ? 0 : 1,
    config: { duration: 300 }
  });

  const getCurrentModelPath = () => {
    const lodLevel = `lod${snap.currentModel.lod}`;
    return snap.currentModel.paths[lodLevel];
  };

  useEffect(() => {
    if (previousLOD !== snap.currentModel.lod) {
      setIsTransitioning(true);
      
      // Save the current selection before changing LOD
      const currentSelection = {
        target: snap.decalTarget,
        selected: snap.selectedMesh,
        outlined: snap.outlinedMesh
      };
      
      const timer = setTimeout(() => {
        const currentPath = getCurrentModelPath();
        
        if (currentLoadedModel) {
          console.log("Cleaning up previous model");
          currentLoadedModel.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
        }

        const loadModel = async () => {
          try {
            const gltf = await useGLTF(currentPath);
            setCurrentLoadedModel(gltf.scene);
            setPreviousLOD(snap.currentModel.lod);
            
            // After model loads, restore the selection
            setTimeout(() => {
              setIsTransitioning(false);
              
              // Restore selection if the mesh still exists in new LOD model
              if (currentSelection.target) {
                state.decalTarget = currentSelection.target;
              }
              if (currentSelection.selected) {
                state.selectedMesh = currentSelection.selected;
              }
              if (currentSelection.outlined) {
                state.outlinedMesh = currentSelection.outlined;
              }
            }, 50);
          } catch (error) {
            console.error("Error loading model:", error);
            setIsTransitioning(false);
          }
        };

        loadModel();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [snap.currentModel.lod]);

  const { nodes, materials } = useGLTF(getCurrentModelPath());
  console.log("Current nodes:", nodes);
  console.log("Current materials:", materials);

  const decalTexture = useTexture("/decal.png");
  const [hovered, setHovered] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loadedTextures, setLoadedTextures] = useState({});

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
  }, [snap.materialPreset.current]);

  useEffect(() => {
    if (Object.keys(loadedTextures).length > 0) {
      if (snap.materialPreset.applyToTargetOnly && snap.decalTarget) {
        const targetNode = nodes[snap.decalTarget];
        if (targetNode) {
          const materialKey = targetNode.material?.name || snap.decalTarget;
          const sharedMaterial = materials[materialKey];
          if (sharedMaterial) {
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
            
            targetNode.material = targetMaterial;
          }
        }
      } else {
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

  useEffect(() => {
    if (nodes) {
      const nodeEntries = Object.entries(nodes)
        .filter(([key, node]) => node.geometry)
        .reduce((acc, [key, node]) => {
          acc[key] = "#ffffff";
          return acc;
        }, {});
      state.items = nodeEntries;

      const firstMeshKey = Object.keys(nodeEntries)[0];
      if (firstMeshKey) {
        state.decalTarget = firstMeshKey;
      }
    }
  }, [nodes]);

  useFrame((state) => {
    if (!snap.animationEnabled) return;
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
    if (!dragging || !snap.decalMovementEnabled) return;
    e.stopPropagation();
    const localPoint = e.object.worldToLocal(e.point.clone());
    state.decalTransform.position = [localPoint.x, localPoint.y, localPoint.z];
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.object.name === snap.decalTarget) {
      e.stopPropagation();
      setDragging(true);
    }
  };

  useEffect(() => {
    console.log("Available nodes:", Object.keys(nodes));
    console.log("Available materials:", Object.keys(materials));
  }, [nodes, materials]);

  return (
    <a.group
      ref={ref}
      opacity={opacity}
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
        state.outlinedMesh = null;
      }}
      onClick={(e) => {
        e.stopPropagation();
        const meshName = e.object.name || e.object.material.name;
        state.current = meshName;
        state.selectedMesh = meshName;
        state.outlinedMesh = meshName;
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
                  map-anisotropy={16}
                  renderOrder={10}
                  depthTest={true}
                  depthWrite={false}
                  polygonOffset={snap.currentModel.name === "flat_hoodie"}
                  meshPhysicalMaterial={{
                    transparent: true,
                    opacity: snap.decalTransform.opacity,
                    roughness: snap.decalTransform.roughness,
                    polygonOffset: true,
                    polygonOffsetFactor: -snap.decalTransform.polygonOffset,
                    polygonOffsetUnits: -1,
                    side: 2
                  }}
                />
              )}
            </mesh>
          );
        })}
    </a.group>
  );
}

function Picker() {
  const snap = useSnapshot(state)
  return (
    // Removed inline style for positioning, will flow in sidebar. Conditional display kept.
    <div className="picker-container" style={{ display: snap.current ? "block" : "none" }}>
      <HexColorPicker
        className="picker" 
        color={snap.items[snap.current]}
        onChange={(color) => {
          state.items[snap.current] = color
        }}
      />
      <h1>{snap.current}</h1>
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
    <div className="control-panel"> 
      <h2 className="panel-title">Decal Transform Controls</h2>
      <Accordion type="multiple" collapsible className="w-full" defaultValue={['general', 'position']}>
        <AccordionItem value="general">
          <AccordionTrigger>General Settings</AccordionTrigger>
          <AccordionContent>
            <div className="flex-column" style={{paddingTop: '4px'}}> {/* Added paddingTop for spacing after trigger */}
              <label className="compact-label">
                Enable Bouncing Animation:
                <input 
                  type="checkbox" 
                  checked={snap.animationEnabled} 
                  onChange={toggleAnimation} 
                  className="compact-checkbox" 
                />
              </label>
              <label className="compact-label">
                Enable Decal Movement:
                <input 
                  type="checkbox" 
                  checked={snap.decalMovementEnabled} 
                  onChange={(e) => { state.decalMovementEnabled = e.target.checked }} 
                  className="compact-checkbox"
                />
              </label>
              <label className="compact-label">
                Select Target Mesh:
                <select 
                  value={snap.decalTarget} 
                  onChange={updateTarget} 
                  className="compact-select"
                >
                  {Object.keys(snap.items).map((materialKey) => (
                    <option key={materialKey} value={materialKey}>
                      {materialKey}
                    </option>
                  ))}
                </select>
              </label>
              <label className="compact-label">
                Flip Decal Horizontally:
                <input type="checkbox" checked={snap.decalTransform.rotation[1] === Math.PI} onChange={toggleFlipY} className="compact-checkbox" />
              </label>
              <label className="compact-label">
                Enable Orbit Rotation:
                <input type="checkbox" checked={snap.orbitEnabled} onChange={toggleOrbit} className="compact-checkbox" />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="position">
          <AccordionTrigger>Position</AccordionTrigger>
          <AccordionContent>
            <div className="flex-column" style={{paddingTop: '4px'}}>
              <label className="compact-label">
                Position X:
                <input
                  type="range" min={-1} max={1} step={0.01}
                  value={snap.decalTransform.position[0]}
                  onChange={(e) => updatePosition(0, parseFloat(e.target.value))}
                  className="compact-input" />
              </label>
              <label className="compact-label">
                Position Y:
                <input
                  type="range" min={-1} max={1} step={0.01}
                  value={snap.decalTransform.position[1]}
                  onChange={(e) => updatePosition(1, parseFloat(e.target.value))}
                  className="compact-input" />
              </label>
              <label className="compact-label">
                Position Z:
                <input
                  type="range" min={-1} max={1} step={0.01}
                  value={snap.decalTransform.position[2]}
                  onChange={(e) => updatePosition(2, parseFloat(e.target.value))}
                  className="compact-input" />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attributes">
          <AccordionTrigger>Attributes</AccordionTrigger>
          <AccordionContent>
            <div className="flex-column" style={{paddingTop: '4px'}}>
              <label className="compact-label">
                Scale:
                <input
                  type="range" min={0.1} max={2} step={0.01}
                  value={snap.decalTransform.scale}
                  onChange={(e) => { state.decalTransform.scale = parseFloat(e.target.value) }}
                  className="compact-input" />
              </label>
              <label className="compact-label">
                Decal Height Offset:
                <input
                  type="range" min={-50} max={50} step={0.1}
                  value={snap.decalTransform.polygonOffset}
                  onChange={(e) => { state.decalTransform.polygonOffset = parseFloat(e.target.value) }}
                  className="compact-input" />
              </label>
              <label className="compact-label">
                Decal Roughness:
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={snap.decalTransform.roughness}
                  onChange={(e) => { state.decalTransform.roughness = parseFloat(e.target.value) }}
                  className="compact-input" />
              </label>
              <label className="compact-label">
                Decal Opacity:
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={snap.decalTransform.opacity || 0.95}
                  onChange={(e) => { state.decalTransform.opacity = parseFloat(e.target.value) }}
                  className="compact-input" />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
    // Removed style prop
    <div className="control-panel"> 
      <h2 className="panel-title">Lighting Controls</h2>
      <Accordion type="multiple" collapsible className="w-full" defaultValue={['ambient']}>
        <AccordionItem value="ambient">
          <AccordionTrigger>Ambient Light</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}> {/* Existing wrapper div, can be adjusted/removed */}
              {/* <h3 className="panel-subtitle">Ambient Light</h3> Already in Trigger */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <div style={{ marginTop: "6px" }}> {/* Reduced margin */}
          <h4 style={{ fontSize: "13px", margin: "6px 0 4px 0" }}>Position:</h4> {/* Compact heading */}
          <label className="compact-label">
            X:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[0]}
              onChange={(e) => updateLightPosition('ambient', 0, e.target.value)}
              className="compact-input"
            />
          </label>
          <label className="compact-label">
            Y:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[1]}
              onChange={(e) => updateLightPosition('ambient', 1, e.target.value)}
              className="compact-input"
            />
          </label>
          <label className="compact-label">
            Z:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.ambient.position[2]}
              onChange={(e) => updateLightPosition('ambient', 2, e.target.value)}
              className="compact-input"
            />
          </label>
        </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="spot">
          <AccordionTrigger>Spot Light</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}>
              {/* <h3 className="panel-subtitle">Spot Light</h3> */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <div style={{ marginTop: "6px" }}>
          <h4 style={{ fontSize: "13px", margin: "6px 0 4px 0" }}>Position:</h4>
          <label className="compact-label">
            X:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[0]}
              onChange={(e) => updateLightPosition('spot', 0, e.target.value)}
              className="compact-input"
            />
          </label>
          <label className="compact-label">
            Y:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[1]}
              onChange={(e) => updateLightPosition('spot', 1, e.target.value)}
              className="compact-input"
            />
          </label>
          <label className="compact-label">
            Z:
            <input
              type="range"
              min={-20}
              max={20}
              step={0.1}
              value={snap.lights.spot.position[2]}
              onChange={(e) => updateLightPosition('spot', 2, e.target.value)}
              className="compact-input"
            />
          </label>
        </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hemisphere">
          <AccordionTrigger>Hemisphere Light</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}>
              {/* <h3 className="panel-subtitle">Hemisphere Light</h3> */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
          Sky Color:
          <input
            type="color"
            value={snap.lights.hemisphere.skyColor}
            onChange={(e) => {
              state.lights.hemisphere.skyColor = e.target.value
            }}
            className="compact-input"
          />
        </label>
        <label className="compact-label">
          Ground Color:
          <input
            type="color"
            value={snap.lights.hemisphere.groundColor}
            onChange={(e) => {
              state.lights.hemisphere.groundColor = e.target.value
            }}
            className="compact-input"
          />
        </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="point">
          <AccordionTrigger>Point Light</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}>
              {/* <h3 className="panel-subtitle">Point Light</h3> */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="directional">
          <AccordionTrigger>Directional Light</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}>
              {/* <h3 className="panel-subtitle">Directional Light</h3> */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
          Cast Shadow:
          <input
            type="checkbox"
            checked={snap.lights.directional.castShadow}
            onChange={(e) => {
              state.lights.directional.castShadow = e.target.checked
            }}
            className="compact-checkbox"
          />
        </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contactShadows">
          <AccordionTrigger>Contact Shadows</AccordionTrigger>
          <AccordionContent>
            <div style={{ marginBottom: "12px" }}>
              {/* <h3 className="panel-subtitle">Contact Shadows</h3> */}
              <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
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
            className="compact-input"
          />
        </label>
        <label className="compact-label">
          Far:
          <input
            type="number" // Changed to number for better input control
            step={0.1}
            value={snap.shadows.far}
            onChange={(e) => {
              state.shadows.far = parseFloat(e.target.value)
            }}
            className="compact-input"
          />
        </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function PresetControls() {
  const snap = useSnapshot(state)

  useEffect(() => {
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
    // Removed style prop, max-height and overflow are good for sidebar
    <div 
      className="control-panel" 
      style={{
        maxHeight: "300px",
        overflowY: "auto"
      }}>
      <h2 className="panel-title">Presets</h2>
      <button
        onClick={saveCurrentSettings}
        className="compact-button full-width"
        style={{ marginBottom: "6px" }} /* Reduced margin */
      >
        Save Current Settings
      </button>
      
      <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px" }}> {/* Reduced padding */}
        {snap.presets.saved.map((preset) => (
          <div
            key={preset.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px", /* Consistent small margin */
              padding: "2px", /* Reduced padding */
              background: snap.presets.current === preset.id ? "#e0e0e0" : "transparent",
              borderRadius: "3px" /* Slightly smaller radius */
            }}>
            <button
              onClick={() => loadPreset(preset)}
              className="compact-button compact-button-secondary"
              style={{
                flex: 1,
                marginRight: "4px",
                background: "none", // Overriding default button background
                border: "1px solid #ccc",
                color: "#333" // Ensure text is visible on light background
              }}>
              {preset.name}
            </button>
            <button
              onClick={() => deletePreset(preset.id)}
              className="compact-button compact-button-danger"
            >
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
    const canvas = document.querySelector('canvas')
    canvasRef.current = canvas
  }, [])

  const startRecording = async () => {
    if (!canvasRef.current) return
    
    const stream = canvasRef.current.captureStream(60)
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

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, 8000)
  }

  useEffect(() => {
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
    // Removed style prop, max-height and overflow are good for sidebar
    <div 
      className="control-panel" 
      style={{
        maxHeight: '350px', 
        overflowY: 'auto'
      }}>
      <h2 className="panel-title">Video Recorder</h2>
      <button
        onClick={startRecording}
        disabled={snap.video.isRecording}
        className="compact-button full-width"
        style={{ 
          marginBottom: '6px',  /* Reduced margin */
          backgroundColor: snap.video.isRecording ? '#ccc' : '#4CAF50' /* Keep dynamic background */
        }}
      >
        {snap.video.isRecording ? 'Recording... (8s)' : 'Start Recording'}
      </button>

      <div style={{ borderTop: '1px solid #ccc', paddingTop: '6px' }}> {/* Reduced padding */}
        {snap.video.recordings.map((recording) => (
          <div
            key={recording.id}
            style={{
              marginBottom: '6px', /* Reduced margin */
              padding: '6px', /* Reduced padding */
              background: '#f5f5f5',
              borderRadius: '3px' /* Slightly smaller radius */
            }}>
            <div style={{ marginBottom: '4px', fontSize: '13px' }}>{recording.name}</div> {/* Smaller font */}
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
                className="compact-button compact-button-secondary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
              >
                Download
              </a>
              <button
                onClick={() => deleteRecording(recording.id)}
                className="compact-button compact-button-danger"
              >
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
      if (snap.decalTarget) {
        state.items[snap.decalTarget] = state.materialPreset.colors[presetKey]
      }
    } else {
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
    // Removed style prop
    <div className="control-panel"> 
      <h2 className="panel-title">Material Presets</h2>
      <label className="compact-label" style={{ marginBottom: "8px" }}>
        <input 
          type="checkbox"
          checked={snap.materialPreset.applyToTargetOnly}
          onChange={toggleApplyToTarget}
          className="compact-checkbox"
        />
        Apply to target mesh only
      </label>
      <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}> {/* Reduced gap and margin */}
        <label className="compact-label" style={{ flex: 1 }}>
          Texture Scale (x):
          <input 
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={snap.textureScale}
            onChange={updateTextureScale}
            className="compact-input"
          />
          <span className="text-xs" style={{ textAlign: "center", display: "block", marginTop: "2px" }}>
            {snap.textureScale}x
          </span>
        </label>

        <label className="compact-label" style={{ flex: 1 }}>
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
            className="compact-input"
          />
          <span className="text-xs" style={{ textAlign: "center", display: "block", marginTop: "2px" }}>
            {snap.displacementFactor.toFixed(2)}
          </span>
        </label>
      </div>
      <div className="flex-column">
        {Object.entries(materialPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => switchMaterialPreset(key)}
            className="compact-button"
            style={{ background: snap.materialPreset.current === key ? "#2196F3" : "#4CAF50" }}
          >
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
    // Removed style prop
    <div className="control-panel"> 
      <label className="compact-label">
        Camera Zoom:
        <input 
          type="range" 
          min="2" 
          max="10" 
          step="0.1" 
          value={snap.cameraDistance} 
          onChange={updateZoom}
          className="compact-input"
          style={{ marginLeft: "0" }} /* Override default input margin if any */
        />
      </label>
    </div>
  )
}
