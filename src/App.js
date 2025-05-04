import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, ContactShadows, Environment, OrbitControls, Decal, useTexture } from "@react-three/drei"
import { HexColorPicker } from "react-colorful"
import { proxy, useSnapshot } from "valtio"
import { MOUSE } from "three"

// Create a reactive state for parts, selection, decal transformation, drag status, and orbit toggle
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
})

export default function App() {
  const snap = useSnapshot(state)

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 4], fov: 5 }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        <ambientLight intensity={0.7} />
        <spotLight intensity={0.5} angle={0.1} penumbra={1} position={[10, 15, 10]} castShadow />
        <Shoe />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.8, 0]} opacity={0.25} scale={10} blur={1.5} far={0.8} />
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
    </div>
  )
}

function Shoe() {
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
