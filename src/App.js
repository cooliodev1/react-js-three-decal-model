import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, ContactShadows, OrbitControls, Decal, useTexture } from "@react-three/drei"
import { HexColorPicker } from "react-colorful"
import { proxy, useSnapshot } from "valtio"
import { MOUSE } from "three"

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
  }
})

export default function App() {
  const snap = useSnapshot(state)

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 4], fov: 5 }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        <ambientLight intensity={snap.lights.ambient.intensity} />
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
          castShadow={snap.lights.directional.castShadow}
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
      <Picker />
      <DecalControls />
      <LightingControls />
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

  // Initialize state with dynamic materials when component mounts
  useEffect(() => {
    const materialEntries = Object.entries(materials).reduce((acc, [key, _]) => {
      acc[key] = "#ffffff"
      return acc
    }, {})
    
    // Update state with found materials
    state.items = materialEntries
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
              material-color={snap.items[materialKey]}>
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
