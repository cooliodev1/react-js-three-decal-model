import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { useSnapshot } from "valtio"
import { Effects } from "@react-three/drei"
import { state } from "../App"
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass"
import { useThree, extend } from "@react-three/fiber"
import * as THREE from 'three'  // Add this import

// Extend THREE with OutlinePass
extend({ OutlinePass })

// Exporting Accordion components for reuse
export const Accordion = AccordionPrimitive.Root
export const AccordionItem = AccordionPrimitive.Item
export const AccordionTrigger = React.forwardRef(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={`accordion-trigger ${className || ""}`} 
      {...props}>
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = "AccordionTrigger"

export const AccordionContent = React.forwardRef(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={`accordion-content ${className || ""}`} 
    {...props}>
    {children}
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = "AccordionContent"

export function MeshListPanel() {
  const snap = useSnapshot(state)

  const handleMeshClick = (meshKey) => {
    state.selectedMesh = meshKey
    state.current = meshKey
    state.decalTarget = meshKey
    state.outlinedMesh = meshKey
  }

  return (
    <div 
      className="control-panel" 
      style={{
        top: "20px",
        right: "350px", // This specific positioning will be handled later
        width: "250px" // This specific width will be handled later
    }}>
      <Accordion type="single" collapsible className="w-full" defaultValue="meshes">
        <AccordionItem value="meshes">
          <AccordionTrigger>Available Meshes</AccordionTrigger>
          <AccordionContent>
            <div className="flex-column" style={{ gap: "4px" }}> {/* Using flex-column for spacing */}
              {Object.keys(snap.items).map((meshKey) => (
                <div
                  key={meshKey}
                  onClick={() => handleMeshClick(meshKey)}
                  className={`mesh-list-item ${snap.selectedMesh === meshKey ? "selected" : ""}`}
                  // Removed inline styles, hover effects are now in CSS
                >
                  {meshKey}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function OutlineEffect() {
  const snap = useSnapshot(state)
  const { scene, camera } = useThree()

  // Find the selected mesh in the scene
  const selectedMesh = React.useMemo(() => {
    if (!snap.outlinedMesh) return null
    let mesh = null
    scene.traverse((object) => {
      if (object.name === snap.outlinedMesh) {
        mesh = object
      }
    })
    return mesh
  }, [scene, snap.outlinedMesh])

  // Only render the OutlinePass if the selectedMesh is valid
  if (!selectedMesh) {
    return null
  }

  return (
    <Effects disableGamma>
      <outlinePass
        args={[
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          scene,
          camera,
        ]}
        selectedObjects={[selectedMesh]}
        visibleEdgeColor={new THREE.Color(0x00ffff)}
        hiddenEdgeColor={new THREE.Color(0x00ffff)}
        edgeStrength={5}
        edgeThickness={2}
        edgeGlow={1}
        pulsePeriod={0}
      />
    </Effects>
  )
}