import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, ContactShadows, OrbitControls, Decal, useTexture } from "@react-three/drei"
import { proxy, useSnapshot } from "valtio"
import { MOUSE, PCFSoftShadowMap, Color, TextureLoader } from "three"
import { HexColorPicker } from "react-colorful"

// Create a reactive state for parts, selection, decal transformation, drag status, orbit toggle, and lighting/shadow properties
const state = proxy({
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
    current: 'tactical',  // Default preset
    colors: {
      'tactical': '',
      'plaid-red': ''
    }
  }
})

// Add material definitions for different styles
const materialPresets = {
  'tactical': {
    name: 'New',
    textures: {
      baseColor: '/blue-turbo-acryllic/blue-turbo-acryllic_BaseColor.png',
      height: '/blue-turbo-acryllic/blue-turbo-acryllic_Height.png',
      normal: '/blue-turbo-acryllic/blue-turbo-acryllic_Normal.png',
      roughness: '/blue-turbo-acryllic/blue-turbo-acryllic_Roughness.png',
      ao: '/blue-turbo-acryllic/blue-turbo-acryllic_AmbientOcclusion.png',
      metallic: '/blue-turbo-acryllic/blue-turbo-acryllic_Metallic.png',
      opacity: '/blue-turbo-acryllic/blue-turbo-acryllic_Opacity.png',
    },
  },
  'black-acryllic-lines': {
    name: 'Black Acryllic Lines',
    textures: {
      baseColor: '/black-acryllic-lines/black-acryllic-lines_BaseColor.png',
      height: '/black-acryllic-linesblack-acryllic-linesc_Height.png',
      normal: '/black-acryllic-lines/black-acryllic-lines_Normal.png',
      roughness: '/black-acryllic-lines/black-acryllic-lines_Roughness.png',
      ao: '/black-acryllic-lines/black-acryllic-lines_AmbientOcclusion.png',
      metallic: '/black-acryllic-lines/black-acryllic-lines_Metallic.png',
      opacity: '/black-acryllic-lines/black-acryllic-lines_Opacity.png',
    },
  }
}

export default function App() {
  const snap = useSnapshot(state)

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 4], fov: 5 }}
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
        {/* <Environment preset="city" /> */}
        <ContactShadows 
          position={snap.shadows.position}
          opacity={snap.shadows.opacity}
          scale={snap.shadows.scale}
          blur={snap.shadows.blur}
          far={snap.shadows.far}
        />
        <OrbitControls
          enableRotate={snap.orbitEnabled}
          enableZoom={true}  // Enable zoom
          enablePan={false}
          mouseButtons={{
            LEFT: MOUSE.PAN,
            RIGHT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
          }}
          minDistance={2}    // Minimum zoom distance
          maxDistance={10}   // Maximum zoom distance
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      <MaterialPresetPicker />
      
      <DecalControls />
      <LightingControls />
      <PresetControls />
      <VideoRecorder />
    </div>
  )
}

// First, rename the component definition
function Model3D() {
  const ref = useRef()
  const snap = useSnapshot(state)
  const { nodes, materials } = useGLTF("hoodie.glb")
  const decalTexture = useTexture("/decal.png")
  const [hovered, setHovered] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loadedTextures, setLoadedTextures] = useState({})

  // Load textures for current material preset
  useEffect(() => {
    const loader = new TextureLoader()
    const currentPreset = materialPresets[snap.materialPreset.current]

    const loadTexture = async (url) => {
      return new Promise((resolve) => {
        loader.load(url, resolve)
      })
    }

    const loadAllTextures = async () => {
      const textures = {}
      for (const [key, path] of Object.entries(currentPreset.textures)) {
        textures[key] = await loadTexture(path)
      }
      setLoadedTextures(textures)
    }

    loadAllTextures()
  }, [snap.materialPreset.current]) // Add this dependency

  // Apply textures to materials
  useEffect(() => {
    if (Object.keys(loadedTextures).length > 0) {
      Object.values(materials).forEach(material => {
        if (loadedTextures.baseColor) material.map = loadedTextures.baseColor
        if (loadedTextures.normal) material.normalMap = loadedTextures.normal
        if (loadedTextures.roughness) material.roughnessMap = loadedTextures.roughness
        if (loadedTextures.metallic) material.metalnessMap = loadedTextures.metallic
        if (loadedTextures.ao) material.aoMap = loadedTextures.ao
        if (loadedTextures.height) material.heightMap = loadedTextures.height
        if (loadedTextures.emissive) material.emissiveMap = loadedTextures.emissive
        material.needsUpdate = true
      })
    }
  }, [loadedTextures, materials])

  // Initialize state with dynamic materials when component mounts
  useEffect(() => {
    if (materials) {
      // Update state with materials
      state.materials = materials
      
      // Your existing material entries code
      const materialEntries = Object.entries(materials).reduce((acc, [key, _]) => {
        acc[key] = "#ffffff"
        return acc
      }, {})
      state.items = materialEntries
    }
  }, [materials])

  // Set initial decalTarget in useEffect
  useEffect(() => {
    if (Object.keys(materials).length > 0) {
      state.decalTarget = Object.keys(materials)[0]
    }
  }, [materials])

  useFrame((state) => {
    if (!snap.animationEnabled) return; // Add this line
    const t = state.clock.getElapsedTime()
    ref.current.rotation.set(Math.cos(t / 4) / 8, Math.sin(t / 4) / 8, -0.2 - (1 + Math.sin(t / 1.5)) / 20)
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  useEffect(() => {
    const cursorSvg = `<svg width=\"64\" height=\"64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g clip-path=\"url(#clip0)\"><path fill=\"rgba(255,255,255,0.5)\" d=\"M29.5 54C43.031 54 54 43.031 54 29.5S43.031 5 29.5 5 5 15.969 5 29.5 15.969 54 29.5 54z\" stroke=\"#000\"/></g></svg>`
    const defaultSvg = `<svg width=\"64\" height=\"64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"rgba(255,255,255,0.5)\" d=\"M29.5 54C43.031 54 54 43.031 54 29.5S43.031 5 29.5 5 5 15.969 5 29.5 15.969 54 29.5 54z\" stroke=\"#000\"/></svg>`
    if (hovered) {
      document.body.style.cursor = `url('data:image/svg+xml;base64,${btoa(cursorSvg)}'), auto`
      return () => {
        document.body.style.cursor = `url('data:image/svg+xml;base64,${btoa(defaultSvg)}'), auto`
      }
    }
  }, [hovered])

  useEffect(() => {
    const handleUp = () => setDragging(false)
    window.addEventListener("pointerup", handleUp)
    return () => window.removeEventListener("pointerup", handleUp)
  }, [])

  const shouldApplyDecal = (partKey) => partKey === snap.decalTarget

  const handlePointerMove = (e) => {
    if (!dragging) return
    e.stopPropagation()
    const localPoint = e.object.worldToLocal(e.point.clone())
    state.decalTransform.position = [localPoint.x, localPoint.y, localPoint.z]
  }

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    if (e.object.material.name === snap.decalTarget) {
      e.stopPropagation()
      setDragging(true)
    }
  }

  // Add this useEffect for debugging
  useEffect(() => {
    console.log("Available nodes:", Object.keys(nodes))
    console.log("Available materials:", Object.keys(materials))
  }, [nodes, materials])

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(e.object.material.name)
      }}
      onPointerOut={(e) => {
        if (e.intersections.length === 0) {
          setHovered(null)
        }
      }}
      onPointerMissed={() => {
        state.current = null
      }}
      onClick={(e) => {
        e.stopPropagation()
        state.current = e.object.material.name
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}>
      {Object.entries(nodes)
        // Remove the shoe filter to show all meshes
        .filter(([key]) => typeof nodes[key].geometry !== 'undefined')
        .map(([key, node]) => {
          console.log("Processing node:", key) // Debug log
          const materialKey = node.material?.name || key
          const material = materials[materialKey]

          if (!material) {
            console.log("No material found for:", key) // Debug log
            return null
          }

          return (
            <mesh
              key={materialKey}
              receiveShadow
              castShadow
              geometry={node.geometry}
              material={material}
              material-color={snap.items[materialKey]}
              material-envMapIntensity={0.8}
              material-roughness={0.7}
              material-metalness={0.2}>
              {shouldApplyDecal(materialKey) && (
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
          )
        })}
    </group>
  )
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
    <div
      style={{
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
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={snap.shadows.far}
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
    // Apply the preset color to all materials
    Object.keys(state.items).forEach(materialKey => {
      state.items[materialKey] = state.materialPreset.colors[presetKey]
    })
  }

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

function TextureControls() {
  const snap = useSnapshot(state)
  const currentPreset = materialPresets[snap.materialPreset.current]

  const updateTextureProperty = (mapType, property, value) => {
    if (!currentPreset || !currentPreset.textures[mapType] || !snap.materials) return

    // Use materials from state instead of global materials
    Object.values(snap.materials).forEach(material => {
      const textureMap = material[getTextureMapProperty(mapType)]
      if (textureMap) {
        switch (property) {
          case 'repeatX':
            textureMap.repeat.x = parseFloat(value)
            break
          case 'repeatY':
            textureMap.repeat.y = parseFloat(value)
            break
          case 'offsetX':
            textureMap.offset.x = parseFloat(value)
            break
          case 'offsetY':
            textureMap.offset.y = parseFloat(value)
            break
          case 'rotation':
            textureMap.rotation = parseFloat(value)
            break
          case 'intensity':
            if (mapType === 'emissive') {
              material.emissiveIntensity = parseFloat(value)
            }
            break
        }
        textureMap.needsUpdate = true
      }
    })
  }

  const getTextureMapProperty = (mapType) => {
    switch (mapType) {
      case 'color': return 'map'
      case 'normal': return 'normalMap'
      case 'roughness': return 'roughnessMap'
      case 'metallic': return 'metalnessMap'
      case 'height': return 'heightMap'
      case 'emissive': return 'emissiveMap'
      case 'ao': return 'aoMap'
      default: return mapType
    }
  }

  useEffect(() => {
    if (!snap.materials) {
      console.warn('Materials not yet loaded into state')
    }
  }, [snap.materials])

  const TextureControl = ({ mapType, label }) => (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>{label}</h3>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Repeat X:
        <input
          type="range"
          min={0.1}
          max={10}
          step={0.1}
          defaultValue={1}
          onChange={(e) => updateTextureProperty(mapType, 'repeatX', e.target.value)}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Repeat Y:
        <input
          type="range"
          min={0.1}
          max={10}
          step={0.1}
          defaultValue={1}
          onChange={(e) => updateTextureProperty(mapType, 'repeatY', e.target.value)}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Offset X:
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(e) => updateTextureProperty(mapType, 'offsetX', e.target.value)}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Offset Y:
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(e) => updateTextureProperty(mapType, 'offsetY', e.target.value)}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "4px" }}>
        Rotation:
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          defaultValue={0}
          onChange={(e) => updateTextureProperty(mapType, 'rotation', e.target.value)}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </label>
      {mapType === 'emissive' && (
        <label style={{ display: "block", marginBottom: "4px" }}>
          Emission Intensity:
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            defaultValue={1}
            onChange={(e) => updateTextureProperty(mapType, 'intensity', e.target.value)}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      )}
    </div>
  )

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "500px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px",
      maxWidth: "320px",
      maxHeight: "80vh",
      overflowY: "auto"
    }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Texture Controls</h2>
      {currentPreset && Object.entries(currentPreset.textures).map(([mapType, _]) => (
        <TextureControl
          key={mapType}
          mapType={mapType}
          label={mapType.charAt(0).toUpperCase() + mapType.slice(1) + ' Map'}
        />
      ))}
    </div>
  )
}
