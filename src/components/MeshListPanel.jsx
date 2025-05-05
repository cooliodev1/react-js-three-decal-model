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

const Accordion = AccordionPrimitive.Root
const AccordionItem = AccordionPrimitive.Item
const AccordionTrigger = React.forwardRef(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={`
        flex flex-1 items-center justify-between py-4 font-medium transition-all 
        hover:underline [&[data-state=open]>svg]:rotate-180
      `}
      {...props}>
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}>
    <div className="pb-4 pt-0">{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = "AccordionContent"

export function MeshListPanel() {
  const snap = useSnapshot(state)

  const handleMeshClick = (meshKey) => {
    state.selectedMesh = meshKey
    state.current = meshKey
    state.decalTarget = meshKey
    // Add outline effect flag
    state.outlinedMesh = meshKey
  }

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      right: "350px",
      background: "rgba(255,255,255,0.9)",
      padding: "10px",
      borderRadius: "4px",
      width: "250px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <Accordion type="single" collapsible className="w-full" defaultValue="meshes">
        <AccordionItem value="meshes">
          <AccordionTrigger>Available Meshes</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {Object.keys(snap.items).map((meshKey) => (
                <div
                  key={meshKey}
                  onClick={() => handleMeshClick(meshKey)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: snap.selectedMesh === meshKey ? "#2196F3" : "transparent",
                    color: snap.selectedMesh === meshKey ? "white" : "black",
                    transition: "all 0.2s ease",
                    border: `1px solid ${snap.selectedMesh === meshKey ? "#1976D2" : "#e0e0e0"}`,
                    fontWeight: snap.selectedMesh === meshKey ? "500" : "normal"
                  }}
                  onMouseEnter={(e) => {
                    if (snap.selectedMesh !== meshKey) {
                      e.currentTarget.style.backgroundColor = "#f5f5f5"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (snap.selectedMesh !== meshKey) {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }
                  }}>
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

  return (
    <Effects disableGamma>
      {selectedMesh && (
        <outlinePass 
          args={[
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            scene,
            camera
          ]}
          selectedObjects={[selectedMesh]}
          visibleEdgeColor={new THREE.Color(0x00ffff)}
          hiddenEdgeColor={new THREE.Color(0x00ffff)}
          edgeStrength={5}
          edgeThickness={2}
          edgeGlow={1}
          pulsePeriod={0}
        />
      )}
    </Effects>
  )
}