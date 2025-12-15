import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  TextShape,
  Billboard,
  PointerEvents,
  PointerEventType,
  inputSystem,
  InputAction,
  Schemas,
  TriggerArea,
  triggerAreaEventsSystem,
  MaterialTransparencyMode,
  Entity,
  ColliderLayer,
  Tween,
  EasingFunction,
  TweenSequence,
  TweenLoop,
  TextureWrapMode,
  tweenSystem
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion, Color3, Vector2 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { setupUI } from './ui'

// ============================================================================
// CONTROL MAPPING TYPES AND CONSTANTS
// ============================================================================

type InputActionInfo = {
  action: InputAction
  name: string
  key: string
  color: Color4
}

const INPUT_ACTIONS: InputActionInfo[] = [
  { action: InputAction.IA_POINTER, name: 'POINTER', key: 'Left Click', color: Color4.Red() },
  { action: InputAction.IA_PRIMARY, name: 'PRIMARY', key: 'E Key', color: Color4.Green() },
  { action: InputAction.IA_SECONDARY, name: 'SECONDARY', key: 'F Key', color: Color4.Blue() },
  { action: InputAction.IA_ACTION_3, name: 'ACTION_3', key: '1 Key', color: Color4.Yellow() },
  { action: InputAction.IA_ACTION_4, name: 'ACTION_4', key: '2 Key', color: Color4.create(0, 1, 1, 1) },
  { action: InputAction.IA_ACTION_5, name: 'ACTION_5', key: '3 Key', color: Color4.Magenta() },
  { action: InputAction.IA_ACTION_6, name: 'ACTION_6', key: '4 Key', color: Color4.create(1, 0.5, 0, 1) },
  { action: InputAction.IA_JUMP, name: 'JUMP', key: 'Space', color: Color4.Purple() },
  { action: InputAction.IA_FORWARD, name: 'FORWARD', key: 'W Key', color: Color4.White() },
  { action: InputAction.IA_BACKWARD, name: 'BACKWARD', key: 'S Key', color: Color4.Gray() },
  { action: InputAction.IA_LEFT, name: 'LEFT', key: 'A Key', color: Color4.create(1, 0.75, 0.8, 1) },
  { action: InputAction.IA_RIGHT, name: 'RIGHT', key: 'D Key', color: Color4.create(0, 0.5, 0.5, 1) }
]

const DEFAULT_COLOR = Color4.create(0.5, 0.5, 0.5, 1)

// Custom components for control mapping
const CubeInputState = engine.defineComponent('CubeInputState', {
  actions: Schemas.Array(Schemas.Int),
  currentColor: Schemas.Int,
  isPressed: Schemas.Boolean,
  isMasterCube: Schemas.Boolean
})

const HoverState = engine.defineComponent('HoverState', {
  isHovered: Schemas.Boolean,
  lastAction: Schemas.String
})

// ============================================================================
// TRIGGER AREA COMPONENTS
// ============================================================================

const TriggerVisual = engine.defineComponent('TriggerVisual', {
  isPlayerInside: Schemas.Boolean
})

const RotatingTrigger = engine.defineComponent('RotatingTrigger', {
  speed: Schemas.Float
})

// Axis constants: 0 = X, 1 = Y, 2 = Z
const AXIS_X = 0
const AXIS_Y = 1
const AXIS_Z = 2

const MovingTrigger = engine.defineComponent('MovingTrigger', {
  startPos: Schemas.Float,
  endPos: Schemas.Float,
  speed: Schemas.Float,
  direction: Schemas.Float,  // 1 or -1
  axis: Schemas.Float        // 0=X, 1=Y, 2=Z
})

const ScalingTrigger = engine.defineComponent('ScalingTrigger', {
  minScale: Schemas.Float,
  maxScale: Schemas.Float,
  speed: Schemas.Float,
  direction: Schemas.Float,  // 1 or -1
  currentScale: Schemas.Float
})

// Colors for trigger areas
const TRIGGER_COLOR_OUTSIDE = Color4.create(1.0, 0.0, 0.0, 0.2)  // Red, low opacity
const TRIGGER_COLOR_INSIDE = Color4.create(0.0, 1.0, 0.0, 0.2)   // Green, low opacity

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a platform cube with collider and material
 */
function createPlatform(
  position: Vector3,
  scale: Vector3,
  color: Color4
): number {
  const platform = engine.addEntity()

  Transform.create(platform, {
    position: position,
    scale: scale
  })

  MeshRenderer.setBox(platform)
  MeshCollider.setBox(platform)

  Material.setPbrMaterial(platform, {
    albedoColor: color
  })

  return platform
}

/**
 * Creates a ramp with rotation
 */
function createRamp(
  position: Vector3,
  scale: Vector3,
  rotationDegrees: number,
  color: Color4
): number {
  const ramp = engine.addEntity()

  Transform.create(ramp, {
    position: position,
    scale: scale,
    rotation: Quaternion.fromEulerDegrees(rotationDegrees, 0, 0)
  })

  MeshRenderer.setBox(ramp)
  MeshCollider.setBox(ramp)

  Material.setPbrMaterial(ramp, {
    albedoColor: color
  })

  return ramp
}

/**
 * Creates a 3D text label that always faces the player
 */
function createLabel(text: string, position: Vector3, fontSize: number = 2): number {
  const label = engine.addEntity()

  Transform.create(label, {
    position: position
  })

  TextShape.create(label, {
    text: text,
    fontSize: fontSize,
    textColor: Color4.White(),
    outlineWidth: 0.2,
    outlineColor: Color3.Black()
  })

  Billboard.create(label)

  return label
}

/**
 * Helper to get key name for an action
 */
function getActionKey(action: InputAction): string {
  const info = INPUT_ACTIONS.find(a => a.action === action)
  return info ? info.key : 'Unknown'
}

/**
 * Helper to get color for an action
 */
function getActionColor(action: InputAction): Color4 {
  const info = INPUT_ACTIONS.find(a => a.action === action)
  return info ? info.color : DEFAULT_COLOR
}

/**
 * Helper to get name for an action
 */
function getActionName(action: InputAction): string {
  const info = INPUT_ACTIONS.find(a => a.action === action)
  return info ? info.name : 'UNKNOWN'
}

/**
 * Creates an input-responsive cube for control mapping test
 */
function createInputCube(
  position: Vector3,
  scale: Vector3,
  actions: InputAction[],
  isMasterCube: boolean = false
): number {
  const cube = engine.addEntity()

  Transform.create(cube, {
    position: position,
    scale: scale
  })

  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube)

  Material.setPbrMaterial(cube, {
    albedoColor: DEFAULT_COLOR
  })

  CubeInputState.create(cube, {
    actions: actions,
    currentColor: -1,
    isPressed: false,
    isMasterCube: isMasterCube
  })

  HoverState.create(cube, {
    isHovered: false,
    lastAction: ''
  })

  const pointerEvents: any[] = []
  for (const action of actions) {
    pointerEvents.push(
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: action,
          hoverText: isMasterCube ? 'Press any key' : `Press ${getActionKey(action)}`
        }
      },
      {
        eventType: PointerEventType.PET_UP,
        eventInfo: {
          button: action,
          hoverText: ''
        }
      }
    )
  }

  PointerEvents.create(cube, {
    pointerEvents: pointerEvents
  })

  return cube
}

/**
 * Updates hover text dynamically based on state
 */
function updateHoverText(
  entity: any,
  isMasterCube: boolean,
  actionName: string,
  isPressed: boolean
): void {
  const pointerEvents = PointerEvents.getMutable(entity as any)

  if (!pointerEvents || !pointerEvents.pointerEvents) return

  for (let i = 0; i < pointerEvents.pointerEvents.length; i++) {
    const event = pointerEvents.pointerEvents[i]

    if (event.eventType === PointerEventType.PET_DOWN && event.eventInfo) {
      if (isPressed) {
        event.eventInfo.hoverText = `Pressed: ${actionName}`
      } else {
        if (isMasterCube) {
          event.eventInfo.hoverText = 'Press any key'
        } else {
          const action = event.eventInfo.button
          if (action !== undefined) {
            event.eventInfo.hoverText = `Press ${getActionKey(action)}`
          }
        }
      }
    }
  }
}

// ============================================================================
// MAIN SCENE
// ============================================================================

export function main() {
  setupUI()

  console.log('🦘 Jump Height Test Scene Initialized')

  // -------------------------------------------------------------------------
  // GROUND PLATFORM (Starting area)
  // -------------------------------------------------------------------------
  createPlatform(
    Vector3.create(8, 0.1, 2),
    Vector3.create(6, 0.2, 4),
    Color4.create(0.3, 0.3, 0.3, 1)
  )
  createLabel('START\nGround Level', Vector3.create(8, 1.5, 2), 1.5)

  // -------------------------------------------------------------------------
  // TEST 1: FINE SCALE STAIRCASE - 2.0m to 2.5m in 0.05m increments
  // Solid pillars from floor, testing exact jump height limit
  // -------------------------------------------------------------------------
  const fineScaleHeights = [2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5]
  const fineScaleStartX = 2
  const fineScaleZ = 6

  createLabel('FINE SCALE STAIRCASE\n(2.0m - 2.5m)', Vector3.create(8, 4, fineScaleZ), 1.2)

  fineScaleHeights.forEach((height, index) => {
    const x = fineScaleStartX + index * 1.3

    // Solid pillar from floor (top surface at 'height')
    createPlatform(
      Vector3.create(x, height / 2, fineScaleZ),
      Vector3.create(1.2, height, 1.2),
      Color4.create(0.2 + (index * 0.07), 0.8 - (index * 0.05), 0.2, 1)
    )

    // Height label
    createLabel(
      `${height.toFixed(2)}m`,
      Vector3.create(x, height + 0.5, fineScaleZ),
      0.9
    )
  })

  // -------------------------------------------------------------------------
  // TEST 2: RUNNING JUMP DISTANCE - Long runway with increasing gaps
  // Testing horizontal jump distance while running
  // -------------------------------------------------------------------------
  const runwayZ = 10

  // Long runway to build up speed
  createPlatform(
    Vector3.create(4, 0.5, runwayZ),
    Vector3.create(6, 1, 3),
    Color4.create(0.4, 0.4, 0.4, 1)
  )
  createLabel('RUNWAY\n(build speed)', Vector3.create(2, 1.5, runwayZ), 1)

  // Gap test platforms with fine increments
  const gapSizes = [12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0]
  let currentX = 7  // Start after runway

  createLabel('RUNNING JUMP TEST\n(horizontal distance)', Vector3.create(12, 2.5, runwayZ - 2), 1.2)

  gapSizes.forEach((gap, index) => {
    // Landing platform (longer for easier landing)
    createPlatform(
      Vector3.create(currentX + gap + 1.5, 0.5, runwayZ),
      Vector3.create(3, 1, 3),
      Color4.create(0.5, 0.3 + (index * 0.05), 0.2, 1)
    )

    // Gap label
    createLabel(
      `${gap.toFixed(1)}m`,
      Vector3.create(currentX + gap / 2, 1.5, runwayZ),
      1
    )

    currentX = currentX + gap + 3
  })

  // -------------------------------------------------------------------------
  // TEST 3: DESCENDING PLATFORMS - Test fall & jump recovery
  // -------------------------------------------------------------------------
  const descendHeights = [3, 2.5, 2, 1.5, 1, 0.5]
  const descendZ = 4
  const descendStartX = 12

  createLabel('DESCEND TEST\n(can you jump back up?)', Vector3.create(13, 4.5, descendZ), 1.2)

  descendHeights.forEach((height, index) => {
    const x = descendStartX + index * 1.5

    createPlatform(
      Vector3.create(x, height / 2, descendZ),
      Vector3.create(1.2, height, 1.2),
      Color4.create(0.3, 0.3, 0.6 + (index * 0.05), 1)
    )

    createLabel(
      `${height}m`,
      Vector3.create(x, height + 0.5, descendZ),
      0.8
    )
  })

  // -------------------------------------------------------------------------
  // TEST 4: STEP HEIGHT STAIRCASE - Fine scale 0.4m to 0.5m
  // Testing exact step height limit
  // -------------------------------------------------------------------------
  const stepHeights = [0.40, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.50]
  const stepZ = 0
  let stepCurrentHeight = 0

  createLabel('STEP HEIGHT TEST\n(0.4m - 0.5m)', Vector3.create(8, 3, stepZ + 2), 1.2)

  // Starting platform
  createPlatform(
    Vector3.create(2, 0.1, stepZ + 1),
    Vector3.create(3, 0.2, 2),
    Color4.create(0.3, 0.3, 0.3, 1)
  )
  createLabel('START', Vector3.create(2, 0.8, stepZ + 1), 0.8)

  stepHeights.forEach((stepHeight, index) => {
    const x = 4 + index * 1.2
    stepCurrentHeight += stepHeight

    // Each step rises by stepHeight from the previous
    createPlatform(
      Vector3.create(x, stepCurrentHeight / 2, stepZ + 1),
      Vector3.create(1, stepCurrentHeight, 2),
      Color4.create(0.6, 0.4 + (index * 0.05), 0.2, 1)
    )

    // Label showing the step increment
    createLabel(
      `+${stepHeight.toFixed(2)}m`,
      Vector3.create(x, stepCurrentHeight + 0.5, stepZ + 1),
      0.7
    )
  })

  // -------------------------------------------------------------------------
  // TEST 5: INCLINED RAMPS - Testing climbable angles
  // Located in parcels 1,0 to 4,0 (X = 16 to 80)
  // -------------------------------------------------------------------------
  const rampAngles = [45, 50, 55, 60, 65, 70]
  const rampBaseZ = 4
  const rampLength = 6

  createLabel('RAMP ANGLE TEST\n(climb without jumping)', Vector3.create(40, 4, rampBaseZ - 2), 1.2)

  rampAngles.forEach((angle, index) => {
    const x = 24 + index * 8  // Start at X=24, space 8m apart

    const radians = (angle * Math.PI) / 180
    const halfDepth = 1.5  // Half of ramp depth (3m along Z)
    const halfThickness = 0.1  // Half of ramp thickness (0.2)

    // X-axis rotation: Y and Z are affected, X stays fixed
    // Position so bottom edge touches floor
    const centerX = x
    const centerY = Math.sin(radians) * halfDepth + Math.cos(radians) * halfThickness - 0.2
    const centerZ = rampBaseZ + Math.cos(radians) * halfDepth

    createRamp(
      Vector3.create(centerX, centerY, centerZ),
      Vector3.create(rampLength, 0.2, 3),
      -angle,
      Color4.create(0.3, 0.5 + (index * 0.06), 0.7, 1)
    )

    // Angle label higher up
    createLabel(
      `${angle}°`,
      Vector3.create(x, 3, rampBaseZ),
      1.5
    )
  })

// -------------------------------------------------------------------------
  // TEST 6: CORRIDOR WIDTH TEST - Testing player collision width
  // Located in parcels 0,1, 1,1, 1,2 (Z = 16 to 48)
  // -------------------------------------------------------------------------
  const corridorBaseZ = 20
  const corridorBaseX = 4
  const columnHeight = 3
  const columnWidth = 0.5

  createLabel('CORRIDOR WIDTH TEST\n(can you fit through?)', Vector3.create(12, 4, corridorBaseZ - 2), 1.2)

  // Gap widths to test (in meters) - fine scale around player width
  const gapWidths = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5]

  gapWidths.forEach((gap, index) => {
    const z = corridorBaseZ + index * 3  // Space corridors 3m apart along Z

    // Left column
    createPlatform(
      Vector3.create(corridorBaseX - gap / 2 - columnWidth / 2, columnHeight / 2, z),
      Vector3.create(columnWidth, columnHeight, columnWidth),
      Color4.create(0.8, 0.3, 0.3, 1)
    )

    // Right column
    createPlatform(
      Vector3.create(corridorBaseX + gap / 2 + columnWidth / 2, columnHeight / 2, z),
      Vector3.create(columnWidth, columnHeight, columnWidth),
      Color4.create(0.8, 0.3, 0.3, 1)
    )

    // Gap label above
    createLabel(
      `${gap.toFixed(2)}m`,
      Vector3.create(corridorBaseX, columnHeight + 0.5, z),
      1
    )

    // Floor marker to show the gap
    createPlatform(
      Vector3.create(corridorBaseX, 0.02, z),
      Vector3.create(gap, 0.04, 2),
      Color4.create(0.2, 0.8, 0.2, 1)
    )
  })

  // Guide walls on the sides to keep player aligned
  createPlatform(
    Vector3.create(corridorBaseX - 2, 0.5, corridorBaseZ + 12),
    Vector3.create(0.2, 1, 28),
    Color4.create(0.4, 0.4, 0.4, 1)
  )
  createPlatform(
    Vector3.create(corridorBaseX + 2, 0.5, corridorBaseZ + 12),
    Vector3.create(0.2, 1, 28),
    Color4.create(0.4, 0.4, 0.4, 1)
  )

// -------------------------------------------------------------------------
  // TEST 7: CONTROL MAPPING TEST - Testing input actions
  // Located in parcel 2,1 (X = 32 to 48, Z = 16 to 32)
  // -------------------------------------------------------------------------
  const controlCenterX = 40  // Center of parcel 2,1
  const controlCenterZ = 24

  createLabel('CONTROL MAPPING TEST\n(test all input actions)', Vector3.create(controlCenterX, 4, controlCenterZ - 6), 1.2)

  // Master cube - responds to ALL input actions
  createInputCube(
    Vector3.create(controlCenterX, 1.5, controlCenterZ),
    Vector3.create(2, 2, 2),
    INPUT_ACTIONS.map(a => a.action),
    true
  )
  createLabel('ALL ACTIONS', Vector3.create(controlCenterX, 4, controlCenterZ), 1.5)

  // Individual action cubes arranged in a circle
  const radius = 5
  const angleStep = (Math.PI * 2) / INPUT_ACTIONS.length

  INPUT_ACTIONS.forEach((actionInfo, index) => {
    const angle = index * angleStep
    const x = controlCenterX + Math.cos(angle) * radius
    const z = controlCenterZ + Math.sin(angle) * radius

    createInputCube(
      Vector3.create(x, 0.5, z),
      Vector3.create(1, 1, 1),
      [actionInfo.action],
      false
    )

    createLabel(
      `${actionInfo.name}\n${actionInfo.key}`,
      Vector3.create(x, 2, z),
      0.7
    )
  })

  // -------------------------------------------------------------------------
  // TEST 8: TRIGGER AREAS - Testing TriggerArea feature (ADR-258)
  // Located in negative X parcels - comprehensive test of all use cases
  // -------------------------------------------------------------------------
  const triggerBaseX = -40
  const triggerBaseZ = 8
  const triggerSpacing = 10

  createLabel('TRIGGER AREA TEST (ADR-258)\nComprehensive Test Suite', Vector3.create(triggerBaseX, 8, triggerBaseZ - 12), 1.5)

  // Platform floor for trigger area test (covers all 6 rows)
  // Parcels -1,-1 to -4,3 → X: -64 to 0, Z: -16 to 64
  createPlatform(
    Vector3.create(-32, 0.05, 24),
    Vector3.create(64, 0.1, 80),
    Color4.create(0.2, 0.2, 0.2, 1)
  )

  // =========================================================================
  // ROW 1: Basic Shape Tests (CL_PLAYER - default)
  // =========================================================================
  const row1Z = triggerBaseZ

  // 1. Box Trigger (CL_PLAYER) - Basic box shape test
  const boxTrigger = engine.addEntity()
  Transform.create(boxTrigger, {
    position: Vector3.create(triggerBaseX + 30, 2, row1Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(boxTrigger)
  Material.setPbrMaterial(boxTrigger, {
    albedoColor: TRIGGER_COLOR_OUTSIDE,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(boxTrigger)  // Default CL_PLAYER
  TriggerVisual.create(boxTrigger, { isPlayerInside: false })
  triggerAreaEventsSystem.onTriggerEnter(boxTrigger, () => {
    TriggerVisual.getMutable(boxTrigger).isPlayerInside = true
    Material.setPbrMaterial(boxTrigger, {
      albedoColor: TRIGGER_COLOR_INSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('BOX (CL_PLAYER): Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(boxTrigger, () => {
    TriggerVisual.getMutable(boxTrigger).isPlayerInside = false
    Material.setPbrMaterial(boxTrigger, {
      albedoColor: TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('BOX (CL_PLAYER): Exit')
  })
  createLabel('BOX\n(CL_PLAYER)', Vector3.create(triggerBaseX + 30, 5, row1Z), 1)

  // 2. Sphere Trigger (CL_PLAYER) - Basic sphere shape test
  const sphereTrigger = engine.addEntity()
  Transform.create(sphereTrigger, {
    position: Vector3.create(triggerBaseX + 20, 2, row1Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setSphere(sphereTrigger)
  Material.setPbrMaterial(sphereTrigger, {
    albedoColor: TRIGGER_COLOR_OUTSIDE,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setSphere(sphereTrigger)  // Default CL_PLAYER
  TriggerVisual.create(sphereTrigger, { isPlayerInside: false })
  triggerAreaEventsSystem.onTriggerEnter(sphereTrigger, () => {
    TriggerVisual.getMutable(sphereTrigger).isPlayerInside = true
    Material.setPbrMaterial(sphereTrigger, {
      albedoColor: TRIGGER_COLOR_INSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('SPHERE (CL_PLAYER): Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(sphereTrigger, () => {
    TriggerVisual.getMutable(sphereTrigger).isPlayerInside = false
    Material.setPbrMaterial(sphereTrigger, {
      albedoColor: TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('SPHERE (CL_PLAYER): Exit')
  })
  createLabel('SPHERE\n(CL_PLAYER)', Vector3.create(triggerBaseX + 20, 5, row1Z), 1)

  // =========================================================================
  // ROW 2: Collision Layer Tests
  // =========================================================================
  const row2Z = triggerBaseZ - 10

  // 3. Pointer Hover Trigger (CL_POINTER) - Triggers on mouse hover
  const pointerTrigger = engine.addEntity()
  Transform.create(pointerTrigger, {
    position: Vector3.create(triggerBaseX + 30, 2, row2Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(pointerTrigger)
  Material.setPbrMaterial(pointerTrigger, {
    albedoColor: Color4.create(0.0, 0.0, 1.0, 0.3),  // Blue
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(pointerTrigger, ColliderLayer.CL_POINTER)
  triggerAreaEventsSystem.onTriggerEnter(pointerTrigger, () => {
    Material.setPbrMaterial(pointerTrigger, {
      albedoColor: Color4.create(0.0, 1.0, 1.0, 0.3),  // Cyan when hovered
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('POINTER TRIGGER: Hover Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(pointerTrigger, () => {
    Material.setPbrMaterial(pointerTrigger, {
      albedoColor: Color4.create(0.0, 0.0, 1.0, 0.3),  // Blue
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('POINTER TRIGGER: Hover Exit')
  })
  createLabel('POINTER HOVER\n(CL_POINTER)', Vector3.create(triggerBaseX + 30, 5, row2Z), 1)

  // 4. Multiple Layers Trigger (CL_PLAYER | CL_POINTER)
  const multiLayerTrigger = engine.addEntity()
  Transform.create(multiLayerTrigger, {
    position: Vector3.create(triggerBaseX + 20, 2, row2Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(multiLayerTrigger)
  Material.setPbrMaterial(multiLayerTrigger, {
    albedoColor: Color4.create(1.0, 0.5, 0.0, 0.3),  // Orange
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(multiLayerTrigger, [ColliderLayer.CL_PLAYER, ColliderLayer.CL_POINTER])
  triggerAreaEventsSystem.onTriggerEnter(multiLayerTrigger, (result) => {
    Material.setPbrMaterial(multiLayerTrigger, {
      albedoColor: Color4.create(1.0, 1.0, 0.0, 0.3),  // Yellow when triggered
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MULTI-LAYER: Enter - layers:', result.trigger?.layers)
  })
  triggerAreaEventsSystem.onTriggerExit(multiLayerTrigger, () => {
    Material.setPbrMaterial(multiLayerTrigger, {
      albedoColor: Color4.create(1.0, 0.5, 0.0, 0.3),  // Orange
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MULTI-LAYER: Exit')
  })
  createLabel('MULTI-LAYER\n(PLAYER|POINTER)', Vector3.create(triggerBaseX + 20, 5, row2Z), 1)

  // 5. Physics Layer Trigger (CL_PHYSICS) - For physics objects
  const physicsTrigger = engine.addEntity()
  Transform.create(physicsTrigger, {
    position: Vector3.create(triggerBaseX + 10, 2, row2Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(physicsTrigger)
  Material.setPbrMaterial(physicsTrigger, {
    albedoColor: Color4.create(0.5, 0.0, 0.5, 0.3),  // Purple
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(physicsTrigger, ColliderLayer.CL_PHYSICS)
  triggerAreaEventsSystem.onTriggerEnter(physicsTrigger, () => {
    Material.setPbrMaterial(physicsTrigger, {
      albedoColor: Color4.create(1.0, 0.0, 1.0, 0.3),  // Magenta when triggered
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('PHYSICS TRIGGER: Physics object entered')
  })
  triggerAreaEventsSystem.onTriggerExit(physicsTrigger, () => {
    Material.setPbrMaterial(physicsTrigger, {
      albedoColor: Color4.create(0.5, 0.0, 0.5, 0.3),  // Purple
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('PHYSICS TRIGGER: Physics object exited')
  })
  createLabel('PHYSICS\n(CL_PHYSICS)', Vector3.create(triggerBaseX + 10, 5, row2Z), 1)

  // =========================================================================
  // ROW 3: Event Type Tests
  // =========================================================================
  const row3Z = triggerBaseZ + 10

  // 6. onTriggerStay Test - Counter increments while inside
  const stayTrigger = engine.addEntity()
  Transform.create(stayTrigger, {
    position: Vector3.create(triggerBaseX + 30, 2, row3Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(stayTrigger)
  Material.setPbrMaterial(stayTrigger, {
    albedoColor: Color4.create(0.0, 0.5, 0.5, 0.3),  // Teal
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(stayTrigger)

  // Counter label for stay events
  const stayCounterLabel = engine.addEntity()
  Transform.create(stayCounterLabel, {
    position: Vector3.create(triggerBaseX + 30, 6, row3Z)
  })
  TextShape.create(stayCounterLabel, {
    text: 'Stay: 0',
    fontSize: 2,
    textColor: Color4.White(),
    outlineWidth: 0.2,
    outlineColor: Color3.Black()
  })
  Billboard.create(stayCounterLabel)

  let stayCounter = 0
  triggerAreaEventsSystem.onTriggerEnter(stayTrigger, () => {
    stayCounter = 0
    Material.setPbrMaterial(stayTrigger, {
      albedoColor: Color4.create(0.0, 1.0, 0.5, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('STAY TRIGGER: Enter')
  })
  triggerAreaEventsSystem.onTriggerStay(stayTrigger, () => {
    stayCounter++
    TextShape.getMutable(stayCounterLabel).text = `Stay: ${stayCounter}`
  })
  triggerAreaEventsSystem.onTriggerExit(stayTrigger, () => {
    Material.setPbrMaterial(stayTrigger, {
      albedoColor: Color4.create(0.0, 0.5, 0.5, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log(`STAY TRIGGER: Exit after ${stayCounter} frames`)
  })
  createLabel('onTriggerStay\n(counter)', Vector3.create(triggerBaseX + 30, 5, row3Z), 1)

  // =========================================================================
  // ROW 4: Special Cases from ADR
  // =========================================================================
  const row4Z = triggerBaseZ + 20

  // 7. Blocked Trigger Test - Same collider blocks entry (should NOT trigger on contact)
  // Per ADR: "If a collider with the same shape blocks a player from entering..."
  const blockedTrigger = engine.addEntity()
  Transform.create(blockedTrigger, {
    position: Vector3.create(triggerBaseX + 30, 2, row4Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(blockedTrigger)
  MeshCollider.setBox(blockedTrigger)  // Physics collider blocks entry
  Material.setPbrMaterial(blockedTrigger, {
    albedoColor: Color4.create(0.5, 0.5, 0.5, 0.5),  // Gray - solid
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(blockedTrigger)  // Same shape as collider
  triggerAreaEventsSystem.onTriggerEnter(blockedTrigger, () => {
    // This should NOT fire since collider blocks entry
    Material.setPbrMaterial(blockedTrigger, {
      albedoColor: Color4.create(0.0, 1.0, 0.0, 0.5),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('BLOCKED TRIGGER: Entered (unexpected!)')
  })
  triggerAreaEventsSystem.onTriggerExit(blockedTrigger, () => {
    Material.setPbrMaterial(blockedTrigger, {
      albedoColor: Color4.create(0.5, 0.5, 0.5, 0.5),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('BLOCKED TRIGGER: Exit')
  })
  createLabel('BLOCKED\n(collider same shape)', Vector3.create(triggerBaseX + 30, 5, row4Z), 0.9)

  // 8. Rotating Trigger Box - Test trigger area that rotates - Using Tween
  const rotatingTrigger = engine.addEntity()
  Transform.create(rotatingTrigger, {
    position: Vector3.create(triggerBaseX + 20, 2, row4Z),
    scale: Vector3.create(4, 2, 6)  // Non-uniform to show rotation
  })
  MeshRenderer.setBox(rotatingTrigger)
  Material.setPbrMaterial(rotatingTrigger, {
    albedoColor: TRIGGER_COLOR_OUTSIDE,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(rotatingTrigger)
  TriggerVisual.create(rotatingTrigger, { isPlayerInside: false })
  // Full 360 degree rotation on Y axis (split into two 180° tweens to avoid quaternion issue)
  Tween.create(rotatingTrigger, {
    mode: Tween.Mode.Rotate({
      start: Quaternion.fromEulerDegrees(0, 0, 0),
      end: Quaternion.fromEulerDegrees(0, 180, 0)
    }),
    duration: 2000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(rotatingTrigger, {
    loop: TweenLoop.TL_RESTART,
    sequence: [
      {
        mode: Tween.Mode.Rotate({
          start: Quaternion.fromEulerDegrees(0, 0, 0),
          end: Quaternion.fromEulerDegrees(0, 180, 0)
        }),
        duration: 2000,
        easingFunction: EasingFunction.EF_LINEAR
      },
      {
        mode: Tween.Mode.Rotate({
          start: Quaternion.fromEulerDegrees(0, 180, 0),
          end: Quaternion.fromEulerDegrees(0, 360, 0)
        }),
        duration: 2000,
        easingFunction: EasingFunction.EF_LINEAR
      }
    ]
  })
  triggerAreaEventsSystem.onTriggerEnter(rotatingTrigger, () => {
    TriggerVisual.getMutable(rotatingTrigger).isPlayerInside = true
    Material.setPbrMaterial(rotatingTrigger, {
      albedoColor: TRIGGER_COLOR_INSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('ROTATING TRIGGER: Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(rotatingTrigger, () => {
    TriggerVisual.getMutable(rotatingTrigger).isPlayerInside = false
    Material.setPbrMaterial(rotatingTrigger, {
      albedoColor: TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('ROTATING TRIGGER: Exit')
  })
  createLabel('ROTATING\nTRIGGER', Vector3.create(triggerBaseX + 20, 5, row4Z), 1)

  // =========================================================================
  // ROW 5: Moving Triggers
  // =========================================================================
  const row5Z = triggerBaseZ + 30

  // 9. Moving Box Trigger (horizontal) - Using Tween with YOYO
  const movingBoxTrigger = engine.addEntity()
  const movingBoxStartX = triggerBaseX + 25
  const movingBoxEndX = triggerBaseX + 35
  Transform.create(movingBoxTrigger, {
    position: Vector3.create(movingBoxStartX, 2, row5Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setBox(movingBoxTrigger)
  Material.setPbrMaterial(movingBoxTrigger, {
    albedoColor: TRIGGER_COLOR_OUTSIDE,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(movingBoxTrigger, ColliderLayer.CL_PLAYER)
  TriggerVisual.create(movingBoxTrigger, { isPlayerInside: false })
  Tween.create(movingBoxTrigger, {
    mode: Tween.Mode.Move({
      start: Vector3.create(movingBoxStartX, 2, row5Z),
      end: Vector3.create(movingBoxEndX, 2, row5Z)
    }),
    duration: 2000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(movingBoxTrigger, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
  triggerAreaEventsSystem.onTriggerEnter(movingBoxTrigger, () => {
    TriggerVisual.getMutable(movingBoxTrigger).isPlayerInside = true
    Material.setPbrMaterial(movingBoxTrigger, {
      albedoColor: TRIGGER_COLOR_INSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MOVING BOX: Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(movingBoxTrigger, () => {
    TriggerVisual.getMutable(movingBoxTrigger).isPlayerInside = false
    Material.setPbrMaterial(movingBoxTrigger, {
      albedoColor: TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MOVING BOX: Exit')
  })
  createLabel('MOVING BOX\n(horizontal)', Vector3.create(triggerBaseX + 30, 5, row5Z), 1)

  // 10. Moving Sphere Trigger (vertical up/down) - Using Tween with YOYO
  const movingSphereTrigger = engine.addEntity()
  const sphereStartY = 2
  const sphereEndY = 6
  Transform.create(movingSphereTrigger, {
    position: Vector3.create(triggerBaseX + 20, sphereStartY, row5Z),
    scale: Vector3.create(4, 4, 4)
  })
  MeshRenderer.setSphere(movingSphereTrigger)
  Material.setPbrMaterial(movingSphereTrigger, {
    albedoColor: TRIGGER_COLOR_OUTSIDE,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setSphere(movingSphereTrigger, ColliderLayer.CL_PLAYER)
  TriggerVisual.create(movingSphereTrigger, { isPlayerInside: false })
  Tween.create(movingSphereTrigger, {
    mode: Tween.Mode.Move({
      start: Vector3.create(triggerBaseX + 20, sphereStartY, row5Z),
      end: Vector3.create(triggerBaseX + 20, sphereEndY, row5Z)
    }),
    duration: 1500,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(movingSphereTrigger, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
  triggerAreaEventsSystem.onTriggerEnter(movingSphereTrigger, () => {
    TriggerVisual.getMutable(movingSphereTrigger).isPlayerInside = true
    Material.setPbrMaterial(movingSphereTrigger, {
      albedoColor: TRIGGER_COLOR_INSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MOVING SPHERE: Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(movingSphereTrigger, () => {
    TriggerVisual.getMutable(movingSphereTrigger).isPlayerInside = false
    Material.setPbrMaterial(movingSphereTrigger, {
      albedoColor: TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('MOVING SPHERE: Exit')
  })
  createLabel('MOVING SPHERE\n(vertical)', Vector3.create(triggerBaseX + 20, 8, row5Z), 1)

  // 11. Scaling Box Trigger (balloon effect) - Using Tween with YOYO
  const scalingBoxTrigger = engine.addEntity()
  const scaleMin = 2
  const scaleMax = 5
  Transform.create(scalingBoxTrigger, {
    position: Vector3.create(triggerBaseX + 10, 2, row5Z),
    scale: Vector3.create(scaleMin, scaleMin, scaleMin)
  })
  MeshRenderer.setBox(scalingBoxTrigger)
  Material.setPbrMaterial(scalingBoxTrigger, {
    albedoColor: Color4.create(1.0, 0.3, 0.5, 0.3),  // Pink
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(scalingBoxTrigger, ColliderLayer.CL_PLAYER)
  TriggerVisual.create(scalingBoxTrigger, { isPlayerInside: false })
  Tween.create(scalingBoxTrigger, {
    mode: Tween.Mode.Scale({
      start: Vector3.create(scaleMin, scaleMin, scaleMin),
      end: Vector3.create(scaleMax, scaleMax, scaleMax)
    }),
    duration: 2000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(scalingBoxTrigger, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
  triggerAreaEventsSystem.onTriggerEnter(scalingBoxTrigger, () => {
    TriggerVisual.getMutable(scalingBoxTrigger).isPlayerInside = true
    Material.setPbrMaterial(scalingBoxTrigger, {
      albedoColor: Color4.create(0.3, 1.0, 0.5, 0.3),  // Green-ish
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('SCALING BOX: Enter')
  })
  triggerAreaEventsSystem.onTriggerExit(scalingBoxTrigger, () => {
    TriggerVisual.getMutable(scalingBoxTrigger).isPlayerInside = false
    Material.setPbrMaterial(scalingBoxTrigger, {
      albedoColor: Color4.create(1.0, 0.3, 0.5, 0.3),  // Pink
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('SCALING BOX: Exit')
  })
  createLabel('SCALING BOX\n(balloon)', Vector3.create(triggerBaseX + 10, 6, row5Z), 1)

  // 12. Create/Delete Loop Test - Entity created and deleted every second
  const createDeletePos = Vector3.create(triggerBaseX, 2, row5Z)
  let createDeleteEntity: Entity | null = null
  let createDeleteTimer = 0
  let isPlayerInsideCreateDelete = false
  const CREATE_DELETE_INTERVAL = 1  // 1 second

  function createTestBox() {
    createDeleteEntity = engine.addEntity()
    Transform.create(createDeleteEntity, {
      position: createDeletePos,
      scale: Vector3.create(3, 3, 3)
    })
    MeshRenderer.setBox(createDeleteEntity)
    // Set color based on whether player is inside
    Material.setPbrMaterial(createDeleteEntity, {
      albedoColor: isPlayerInsideCreateDelete ? TRIGGER_COLOR_INSIDE : TRIGGER_COLOR_OUTSIDE,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    TriggerArea.setBox(createDeleteEntity, ColliderLayer.CL_PLAYER)

    // Register trigger events
    triggerAreaEventsSystem.onTriggerEnter(createDeleteEntity, () => {
      isPlayerInsideCreateDelete = true
      if (createDeleteEntity !== null) {
        Material.setPbrMaterial(createDeleteEntity, {
          albedoColor: TRIGGER_COLOR_INSIDE,
          transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
        })
      }
      console.log('CREATE/DELETE: Player entered')
    })
    triggerAreaEventsSystem.onTriggerExit(createDeleteEntity, () => {
      isPlayerInsideCreateDelete = false
      if (createDeleteEntity !== null) {
        Material.setPbrMaterial(createDeleteEntity, {
          albedoColor: TRIGGER_COLOR_OUTSIDE,
          transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
        })
      }
      console.log('CREATE/DELETE: Player exited')
    })

    console.log('CREATE/DELETE: Box created')
  }

  function deleteTestBox() {
    if (createDeleteEntity !== null) {
      engine.removeEntity(createDeleteEntity)
      createDeleteEntity = null
      isPlayerInsideCreateDelete = false  // Always reset state on delete
      console.log('CREATE/DELETE: Box deleted')
    }
  }

  // System to handle create/delete loop
  engine.addSystem((dt: number) => {
    createDeleteTimer += dt
    if (createDeleteTimer >= CREATE_DELETE_INTERVAL) {
      createDeleteTimer = 0
      if (createDeleteEntity === null) {
        createTestBox()
      } else {
        deleteTestBox()
      }
    }
  })

  createLabel('CREATE/DELETE\n(1s loop)', Vector3.create(triggerBaseX, 6, row5Z), 1)

  // =========================================================================
  // ROW 6: Physics Ball Test Track
  // =========================================================================
  const row6Z = triggerBaseZ + 42
  const ballTrackStartX = triggerBaseX - 10
  const ballTrackEndX = triggerBaseX + 40

  createLabel('PHYSICS BALL TRACK\n(ball triggers obstacles)', Vector3.create(triggerBaseX + 15, 8, row6Z - 5), 1.2)

  // Slow-moving ball with physics collider
  const physicsBall = engine.addEntity()
  Transform.create(physicsBall, {
    position: Vector3.create(ballTrackStartX, 2, row6Z),
    scale: Vector3.create(1.5, 1.5, 1.5)
  })
  MeshRenderer.setSphere(physicsBall)
  MeshCollider.setSphere(physicsBall, ColliderLayer.CL_PHYSICS)
  Material.setPbrMaterial(physicsBall, {
    albedoColor: Color4.create(1.0, 1.0, 0.0, 1)  // Yellow ball
  })

  // Physics ball tween with YOYO - 3 seconds each way
  Tween.create(physicsBall, {
    mode: Tween.Mode.Move({
      start: Vector3.create(ballTrackStartX, 2, row6Z),
      end: Vector3.create(ballTrackEndX, 2, row6Z)
    }),
    duration: 3000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(physicsBall, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
  createLabel('YELLOW BALL\n(CL_PHYSICS)', Vector3.create(ballTrackStartX, 4.5, row6Z), 0.8)

  // Obstacle 1: Box Trigger (CL_PHYSICS only - ball triggers it)
  const obsBox = engine.addEntity()
  Transform.create(obsBox, {
    position: Vector3.create(triggerBaseX, 2, row6Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(obsBox)
  Material.setPbrMaterial(obsBox, {
    albedoColor: Color4.create(0.8, 0.4, 0.0, 0.3),  // Orange
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(obsBox, ColliderLayer.CL_PHYSICS)
  triggerAreaEventsSystem.onTriggerEnter(obsBox, () => {
    Material.setPbrMaterial(obsBox, {
      albedoColor: Color4.create(0.0, 1.0, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('OBS BOX: Ball entered')
  })
  triggerAreaEventsSystem.onTriggerExit(obsBox, () => {
    Material.setPbrMaterial(obsBox, {
      albedoColor: Color4.create(0.8, 0.4, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
  })
  createLabel('BOX\n(ball only)', Vector3.create(triggerBaseX, 4.5, row6Z), 0.8)

  // Obstacle 2: Sphere Trigger (CL_PHYSICS only - ball triggers it)
  const obsSphere = engine.addEntity()
  Transform.create(obsSphere, {
    position: Vector3.create(triggerBaseX + 10, 2, row6Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setSphere(obsSphere)
  Material.setPbrMaterial(obsSphere, {
    albedoColor: Color4.create(0.0, 0.6, 0.8, 0.3),  // Cyan
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setSphere(obsSphere, ColliderLayer.CL_PHYSICS)
  triggerAreaEventsSystem.onTriggerEnter(obsSphere, () => {
    Material.setPbrMaterial(obsSphere, {
      albedoColor: Color4.create(0.0, 1.0, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('OBS SPHERE: Ball entered')
  })
  triggerAreaEventsSystem.onTriggerExit(obsSphere, () => {
    Material.setPbrMaterial(obsSphere, {
      albedoColor: Color4.create(0.0, 0.6, 0.8, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
  })
  createLabel('SPHERE\n(ball only)', Vector3.create(triggerBaseX + 10, 4.5, row6Z), 0.8)

  // Obstacle 3: Jumping Box Trigger (CL_PHYSICS - bounces up and down) - Using Tween with YOYO
  const obsJumpingBox = engine.addEntity()
  const jumpStartY = 2  // Above floor (box is 3x3x3, so bottom at 0.5)
  const jumpEndY = 8    // Jump higher
  Transform.create(obsJumpingBox, {
    position: Vector3.create(triggerBaseX + 20, jumpStartY, row6Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(obsJumpingBox)
  Material.setPbrMaterial(obsJumpingBox, {
    albedoColor: Color4.create(0.8, 0.0, 0.8, 0.3),  // Purple
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(obsJumpingBox, ColliderLayer.CL_PHYSICS)
  Tween.create(obsJumpingBox, {
    mode: Tween.Mode.Move({
      start: Vector3.create(triggerBaseX + 20, jumpStartY, row6Z),
      end: Vector3.create(triggerBaseX + 20, jumpEndY, row6Z)
    }),
    duration: 1000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(obsJumpingBox, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
  triggerAreaEventsSystem.onTriggerEnter(obsJumpingBox, () => {
    Material.setPbrMaterial(obsJumpingBox, {
      albedoColor: Color4.create(0.0, 1.0, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log('JUMPING BOX: Ball entered')
  })
  triggerAreaEventsSystem.onTriggerExit(obsJumpingBox, () => {
    Material.setPbrMaterial(obsJumpingBox, {
      albedoColor: Color4.create(0.8, 0.0, 0.8, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
  })
  createLabel('JUMPING BOX\n(ball only)', Vector3.create(triggerBaseX + 20, 6, row6Z), 0.8)

  // Obstacle 4: Multi-collision trigger (CL_PLAYER | CL_PHYSICS - both player AND ball can trigger)
  const obsMulti = engine.addEntity()
  Transform.create(obsMulti, {
    position: Vector3.create(triggerBaseX + 30, 2, row6Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(obsMulti)
  Material.setPbrMaterial(obsMulti, {
    albedoColor: Color4.create(1.0, 0.5, 0.0, 0.3),  // Orange
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  TriggerArea.setBox(obsMulti, [ColliderLayer.CL_PLAYER, ColliderLayer.CL_PHYSICS])

  let multiHitLabel = engine.addEntity()
  Transform.create(multiHitLabel, {
    position: Vector3.create(triggerBaseX + 30, 5, row6Z)
  })
  TextShape.create(multiHitLabel, {
    text: 'Hits: 0',
    fontSize: 2,
    textColor: Color4.White(),
    outlineWidth: 0.2,
    outlineColor: Color3.Black()
  })
  Billboard.create(multiHitLabel)

  let multiHitCount = 0
  triggerAreaEventsSystem.onTriggerEnter(obsMulti, (result) => {
    multiHitCount++
    TextShape.getMutable(multiHitLabel).text = `Hits: ${multiHitCount}`
    Material.setPbrMaterial(obsMulti, {
      albedoColor: Color4.create(0.0, 1.0, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    console.log(`MULTI TRIGGER: Enter (layer: ${result.trigger?.layers}) - Total: ${multiHitCount}`)
  })
  triggerAreaEventsSystem.onTriggerExit(obsMulti, () => {
    Material.setPbrMaterial(obsMulti, {
      albedoColor: Color4.create(1.0, 0.5, 0.0, 0.3),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
  })
  createLabel('PLAYER + BALL\n(both trigger)', Vector3.create(triggerBaseX + 30, 4.5, row6Z), 0.8)

  // Row labels
  createLabel('ROW 1: Basic Shapes', Vector3.create(triggerBaseX - 15, 3, row1Z), 1)
  createLabel('ROW 2: Collision Layers', Vector3.create(triggerBaseX - 15, 3, row2Z), 1)
  createLabel('ROW 3: Event Types', Vector3.create(triggerBaseX - 15, 3, row3Z), 1)
  createLabel('ROW 4: Special Cases', Vector3.create(triggerBaseX - 15, 3, row4Z), 1)
  createLabel('ROW 5: Moving Triggers', Vector3.create(triggerBaseX - 15, 3, row5Z), 1)
  createLabel('ROW 6: Physics Ball Track', Vector3.create(triggerBaseX - 15, 3, row6Z), 1)

  // -------------------------------------------------------------------------
  // TEST 9: WALL TELEPORT TEST - Testing movePlayerTo into solid objects
  // Located in negative Z parcels
  // -------------------------------------------------------------------------
  const wallTestX = 8
  const wallTestZ = -40
  const wallSize = 6  // 6x6x6 box
  const safeAreaPos = Vector3.create(wallTestX, 1, wallTestZ + 15)  // Safe return position

  createLabel('WALL TELEPORT TEST\n(teleport into solid box)', Vector3.create(wallTestX, 8, wallTestZ), 1.5)

  // Platform for the test area
  createPlatform(
    Vector3.create(wallTestX + 10, 0.05, wallTestZ),
    Vector3.create(50, 0.1, 30),
    Color4.create(0.25, 0.25, 0.25, 1)
  )

  // The solid wall/box to teleport into
  const wallBox = engine.addEntity()
  Transform.create(wallBox, {
    position: Vector3.create(wallTestX, wallSize / 2, wallTestZ),
    scale: Vector3.create(wallSize, wallSize, wallSize)
  })
  MeshRenderer.setBox(wallBox)
  MeshCollider.setBox(wallBox)
  Material.setPbrMaterial(wallBox, {
    albedoColor: Color4.create(0.6, 0.2, 0.2, 1)
  })
  createLabel('SOLID BOX', Vector3.create(wallTestX, wallSize + 1, wallTestZ), 1)

  // Safe area marker
  const safeMarker = engine.addEntity()
  Transform.create(safeMarker, {
    position: Vector3.create(safeAreaPos.x, 0.1, safeAreaPos.z),
    scale: Vector3.create(3, 0.1, 3)
  })
  MeshRenderer.setBox(safeMarker)
  Material.setPbrMaterial(safeMarker, {
    albedoColor: Color4.create(0.2, 0.8, 0.2, 1)
  })
  createLabel('SAFE AREA\n(return here)', Vector3.create(safeAreaPos.x, 1.5, safeAreaPos.z), 0.8)

  // 14 teleport depths: from 1m outside to 4m inside (past center)
  // Box edge is at wallTestX + 3, center at wallTestX
  const teleportDepths = [
    { label: '-1.0m\nOUTSIDE', depth: -1.0 },
    { label: '-0.5m\nOUTSIDE', depth: -0.5 },
    { label: '0m\nEDGE', depth: 0 },
    { label: '0.25m', depth: 0.25 },
    { label: '0.5m', depth: 0.5 },
    { label: '0.75m', depth: 0.75 },
    { label: '1.0m', depth: 1.0 },
    { label: '1.5m', depth: 1.5 },
    { label: '2.0m', depth: 2.0 },
    { label: '2.5m', depth: 2.5 },
    { label: '3.0m\nCENTER', depth: 3.0 },
    { label: '3.5m', depth: 3.5 },
    { label: '4.0m', depth: 4.0 },
    { label: '5.0m\nTHROUGH', depth: 5.0 }
  ]

  // Store all button entities and their target positions
  const teleportButtons: { entity: Entity, targetX: number, targetY: number, targetZ: number }[] = []

  // Create teleport buttons arranged in a line on the +X side of the box
  const buttonStartX = wallTestX + wallSize / 2 + 2  // Start 2m from box edge
  const buttonY = 0.5
  const buttonSpacing = 1.8

  teleportDepths.forEach((tp, index) => {
    const buttonX = buttonStartX + index * buttonSpacing
    const buttonZ = wallTestZ

    // Create button
    const button = engine.addEntity()
    Transform.create(button, {
      position: Vector3.create(buttonX, buttonY, buttonZ),
      scale: Vector3.create(1.2, 0.8, 1.2)
    })
    MeshRenderer.setBox(button)
    MeshCollider.setBox(button)

    // Color based on position: green outside, yellow at edge, red inside
    let buttonColor: Color4
    if (tp.depth < 0) {
      buttonColor = Color4.create(0.2, 0.7, 0.2, 1)  // Green - outside
    } else if (tp.depth === 0) {
      buttonColor = Color4.create(0.8, 0.8, 0.2, 1)  // Yellow - edge
    } else {
      buttonColor = Color4.create(0.7, 0.2, 0.2, 1)  // Red - inside
    }
    Material.setPbrMaterial(button, { albedoColor: buttonColor })

    // Calculate target position
    // Box edge is at wallTestX + wallSize/2 = wallTestX + 3
    // Depth 0 = edge, positive = inside
    const targetX = wallTestX + wallSize / 2 - tp.depth
    const targetY = 1
    const targetZ = wallTestZ

    // Store button info
    teleportButtons.push({ entity: button, targetX, targetY, targetZ })

    // Add pointer events
    PointerEvents.create(button, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_POINTER,
            hoverText: `Teleport: ${tp.label.replace('\n', ' ')}`
          }
        }
      ]
    })

    // Label for the button
    createLabel(tp.label, Vector3.create(buttonX, buttonY + 1.5, buttonZ), 0.6)
  })

  // Single system to handle all teleport button clicks
  engine.addSystem(() => {
    for (const btn of teleportButtons) {
      const cmd = inputSystem.getInputCommand(
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN,
        btn.entity
      )

      if (cmd) {
        console.log(`Teleporting to X=${btn.targetX.toFixed(2)}...`)

        // Teleport to target position
        movePlayerTo({
          newRelativePosition: Vector3.create(btn.targetX, btn.targetY, btn.targetZ)
        })
      }
    }
  })

  // Note: All trigger animations (rotating, moving, scaling) now use Tween/TweenSequence

  // -------------------------------------------------------------------------
  // TEST 10: CONTINUOUS TWEENS TEST (ADR-285)
  // Testing RotateContinuous, MoveContinuous, TextureMoveContinuous
  // Located in positive Z parcels (2,5 to 5,7)
  // -------------------------------------------------------------------------
  const continuousTweenBaseX = 56  // Center of parcel 3,6
  const continuousTweenBaseZ = 104  // Center of parcel row 6

  createLabel('CONTINUOUS TWEENS TEST (ADR-285)\nInfinite motion without reset', Vector3.create(continuousTweenBaseX, 8, continuousTweenBaseZ - 10), 1.5)

  // Platform floor for continuous tween test area
  createPlatform(
    Vector3.create(continuousTweenBaseX, 0.05, continuousTweenBaseZ),
    Vector3.create(64, 0.1, 48),
    Color4.create(0.15, 0.2, 0.25, 1)
  )

  // =========================================================================
  // ROW 1: RotateContinuous - Infinite rotation (different axes)
  // =========================================================================
  const ctRow1Z = continuousTweenBaseZ - 12

  createLabel('ROW 1: RotateContinuous (different axes)', Vector3.create(continuousTweenBaseX - 25, 3, ctRow1Z), 1)

  // 1.1 Rotate Y-axis at 30 deg/sec (slow spin) - direction is pure Y quaternion
  const rotateY30 = engine.addEntity()
  Transform.create(rotateY30, {
    position: Vector3.create(continuousTweenBaseX - 15, 2, ctRow1Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateY30)
  Material.setPbrMaterial(rotateY30, {
    albedoColor: Color4.create(0.8, 0.3, 0.3, 1)
  })
  // Y-axis rotation: quaternion with Y component
  Tween.setRotateContinuous(rotateY30, Quaternion.create(0, 1, 0, 0), 30)
  createLabel('Y-Axis\n30°/sec', Vector3.create(continuousTweenBaseX - 15, 5, ctRow1Z), 0.9)

  // 1.2 Rotate Y-axis at 90 deg/sec (fast spin)
  const rotateY90 = engine.addEntity()
  Transform.create(rotateY90, {
    position: Vector3.create(continuousTweenBaseX - 5, 2, ctRow1Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateY90)
  Material.setPbrMaterial(rotateY90, {
    albedoColor: Color4.create(0.8, 0.5, 0.3, 1)
  })
  Tween.setRotateContinuous(rotateY90, Quaternion.create(0, 1, 0, 0), 90)
  createLabel('Y-Axis\n90°/sec', Vector3.create(continuousTweenBaseX - 5, 5, ctRow1Z), 0.9)

  // 1.3 Rotate X-axis at 45 deg/sec (tumble)
  const rotateX45 = engine.addEntity()
  Transform.create(rotateX45, {
    position: Vector3.create(continuousTweenBaseX + 5, 2, ctRow1Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateX45)
  Material.setPbrMaterial(rotateX45, {
    albedoColor: Color4.create(0.3, 0.8, 0.3, 1)
  })
  // X-axis rotation: quaternion with X component
  Tween.setRotateContinuous(rotateX45, Quaternion.create(1, 0, 0, 0), 45)
  createLabel('X-Axis\n45°/sec', Vector3.create(continuousTweenBaseX + 5, 5, ctRow1Z), 0.9)

  // 1.4 Rotate Z-axis at 60 deg/sec (roll)
  const rotateZ60 = engine.addEntity()
  Transform.create(rotateZ60, {
    position: Vector3.create(continuousTweenBaseX + 15, 2, ctRow1Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateZ60)
  Material.setPbrMaterial(rotateZ60, {
    albedoColor: Color4.create(0.3, 0.3, 0.8, 1)
  })
  // Z-axis rotation: quaternion with Z component
  Tween.setRotateContinuous(rotateZ60, Quaternion.create(0, 0, 1, 0), 60)
  createLabel('Z-Axis\n60°/sec', Vector3.create(continuousTweenBaseX + 15, 5, ctRow1Z), 0.9)

  // 1.5 Multi-axis rotation (diagonal tumble)
  const rotateMulti = engine.addEntity()
  Transform.create(rotateMulti, {
    position: Vector3.create(continuousTweenBaseX + 25, 2, ctRow1Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateMulti)
  Material.setPbrMaterial(rotateMulti, {
    albedoColor: Color4.create(0.8, 0.3, 0.8, 1)
  })
  // Multi-axis: combined X+Y
  Tween.setRotateContinuous(rotateMulti, Quaternion.create(0.707, 0.707, 0, 0), 40)
  createLabel('X+Y Axis\n40°/sec', Vector3.create(continuousTweenBaseX + 25, 5, ctRow1Z), 0.9)

  // =========================================================================
  // ROW 2: RotateContinuous - Different speeds
  // =========================================================================
  const ctRow2Z = continuousTweenBaseZ

  createLabel('ROW 2: RotateContinuous (different speeds)', Vector3.create(continuousTweenBaseX - 25, 3, ctRow2Z), 1)

  // 2.1 Very slow rotation 10 deg/sec
  const rotateSlow = engine.addEntity()
  Transform.create(rotateSlow, {
    position: Vector3.create(continuousTweenBaseX - 15, 2, ctRow2Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateSlow)
  Material.setPbrMaterial(rotateSlow, {
    albedoColor: Color4.create(0.9, 0.6, 0.2, 1)
  })
  Tween.setRotateContinuous(rotateSlow, Quaternion.create(0, 1, 0, 0), 10)
  createLabel('Y-Axis\n10°/sec', Vector3.create(continuousTweenBaseX - 15, 5, ctRow2Z), 0.9)

  // 2.2 Medium rotation 60 deg/sec
  const rotateMedium = engine.addEntity()
  Transform.create(rotateMedium, {
    position: Vector3.create(continuousTweenBaseX - 5, 2, ctRow2Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateMedium)
  Material.setPbrMaterial(rotateMedium, {
    albedoColor: Color4.create(0.2, 0.9, 0.6, 1)
  })
  Tween.setRotateContinuous(rotateMedium, Quaternion.create(0, 1, 0, 0), 60)
  createLabel('Y-Axis\n60°/sec', Vector3.create(continuousTweenBaseX - 5, 5, ctRow2Z), 0.9)

  // 2.3 Fast rotation 180 deg/sec
  const rotateFast = engine.addEntity()
  Transform.create(rotateFast, {
    position: Vector3.create(continuousTweenBaseX + 5, 2, ctRow2Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateFast)
  Material.setPbrMaterial(rotateFast, {
    albedoColor: Color4.create(0.6, 0.2, 0.9, 1)
  })
  Tween.setRotateContinuous(rotateFast, Quaternion.create(0, 1, 0, 0), 180)
  createLabel('Y-Axis\n180°/sec', Vector3.create(continuousTweenBaseX + 5, 5, ctRow2Z), 0.9)

  // 2.4 Very fast rotation 360 deg/sec
  const rotateVeryFast = engine.addEntity()
  Transform.create(rotateVeryFast, {
    position: Vector3.create(continuousTweenBaseX + 15, 2, ctRow2Z),
    scale: Vector3.create(3, 3, 3)
  })
  MeshRenderer.setBox(rotateVeryFast)
  Material.setPbrMaterial(rotateVeryFast, {
    albedoColor: Color4.create(0.9, 0.2, 0.6, 1)
  })
  Tween.setRotateContinuous(rotateVeryFast, Quaternion.create(0, 1, 0, 0), 360)
  createLabel('Y-Axis\n360°/sec', Vector3.create(continuousTweenBaseX + 15, 5, ctRow2Z), 0.9)

  // =========================================================================
  // ROW 3: Move - Bounded movement with YOYO (instead of MoveContinuous)
  // =========================================================================
  const ctRow3Z = continuousTweenBaseZ + 12

  createLabel('ROW 3: Move with YOYO (bounded)', Vector3.create(continuousTweenBaseX - 25, 3, ctRow3Z), 1)

  // 3.1 Move along X-axis (bounded)
  const moveX = engine.addEntity()
  const moveXStart = Vector3.create(continuousTweenBaseX - 20, 2, ctRow3Z)
  const moveXEnd = Vector3.create(continuousTweenBaseX - 10, 2, ctRow3Z)
  Transform.create(moveX, {
    position: moveXStart,
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setSphere(moveX)
  Material.setPbrMaterial(moveX, {
    albedoColor: Color4.create(1.0, 0.4, 0.4, 1)
  })
  Tween.create(moveX, {
    mode: Tween.Mode.Move({ start: moveXStart, end: moveXEnd }),
    duration: 2000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(moveX, { loop: TweenLoop.TL_YOYO, sequence: [] })
  createLabel('X-Axis\n10m range', Vector3.create(continuousTweenBaseX - 15, 5, ctRow3Z), 0.9)

  // 3.2 Move along Z-axis (bounded)
  const moveZ = engine.addEntity()
  const moveZStart = Vector3.create(continuousTweenBaseX - 5, 2, ctRow3Z - 5)
  const moveZEnd = Vector3.create(continuousTweenBaseX - 5, 2, ctRow3Z + 5)
  Transform.create(moveZ, {
    position: moveZStart,
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setSphere(moveZ)
  Material.setPbrMaterial(moveZ, {
    albedoColor: Color4.create(0.4, 1.0, 0.4, 1)
  })
  Tween.create(moveZ, {
    mode: Tween.Mode.Move({ start: moveZStart, end: moveZEnd }),
    duration: 1500,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(moveZ, { loop: TweenLoop.TL_YOYO, sequence: [] })
  createLabel('Z-Axis\n10m range', Vector3.create(continuousTweenBaseX - 5, 5, ctRow3Z), 0.9)

  // 3.3 Move diagonally (bounded)
  const moveDiag = engine.addEntity()
  const moveDiagStart = Vector3.create(continuousTweenBaseX, 2, ctRow3Z - 5)
  const moveDiagEnd = Vector3.create(continuousTweenBaseX + 10, 2, ctRow3Z + 5)
  Transform.create(moveDiag, {
    position: moveDiagStart,
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setSphere(moveDiag)
  Material.setPbrMaterial(moveDiag, {
    albedoColor: Color4.create(0.4, 0.4, 1.0, 1)
  })
  Tween.create(moveDiag, {
    mode: Tween.Mode.Move({ start: moveDiagStart, end: moveDiagEnd }),
    duration: 2500,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(moveDiag, { loop: TweenLoop.TL_YOYO, sequence: [] })
  createLabel('Diagonal\n14m range', Vector3.create(continuousTweenBaseX + 5, 5, ctRow3Z), 0.9)

  // 3.4 Move upward (Y-axis bounded)
  const moveY = engine.addEntity()
  const moveYStart = Vector3.create(continuousTweenBaseX + 15, 1, ctRow3Z)
  const moveYEnd = Vector3.create(continuousTweenBaseX + 15, 6, ctRow3Z)
  Transform.create(moveY, {
    position: moveYStart,
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setSphere(moveY)
  Material.setPbrMaterial(moveY, {
    albedoColor: Color4.create(1.0, 1.0, 0.4, 1)
  })
  Tween.create(moveY, {
    mode: Tween.Mode.Move({ start: moveYStart, end: moveYEnd }),
    duration: 1500,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(moveY, { loop: TweenLoop.TL_YOYO, sequence: [] })
  createLabel('Y-Axis\n5m range', Vector3.create(continuousTweenBaseX + 15, 8, ctRow3Z), 0.9)

  // 3.5 Circular-ish path (X+Y combined)
  const moveCircle = engine.addEntity()
  const moveCircleStart = Vector3.create(continuousTweenBaseX + 25, 1, ctRow3Z)
  const moveCircleEnd = Vector3.create(continuousTweenBaseX + 30, 5, ctRow3Z)
  Transform.create(moveCircle, {
    position: moveCircleStart,
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setSphere(moveCircle)
  Material.setPbrMaterial(moveCircle, {
    albedoColor: Color4.create(1.0, 0.4, 1.0, 1)
  })
  Tween.create(moveCircle, {
    mode: Tween.Mode.Move({ start: moveCircleStart, end: moveCircleEnd }),
    duration: 2000,
    easingFunction: EasingFunction.EF_EASEQUAD
  })
  TweenSequence.create(moveCircle, { loop: TweenLoop.TL_YOYO, sequence: [] })
  createLabel('X+Y Arc\nEased', Vector3.create(continuousTweenBaseX + 27, 8, ctRow3Z), 0.9)

  // -------------------------------------------------------------------------
  // TEST 11: TEXTURE TWEENS TEST (ADR-255)
  // Testing TextureMove and TextureMoveContinuous
  // -------------------------------------------------------------------------
  const textureTweenBaseX = 56
  const textureTweenBaseZ = 136  // Below the continuous tween area

  createLabel('TEXTURE TWEENS TEST (ADR-255)\nAnimated textures', Vector3.create(textureTweenBaseX, 8, textureTweenBaseZ - 10), 1.5)

  // Platform floor for texture tween test area
  createPlatform(
    Vector3.create(textureTweenBaseX, 0.05, textureTweenBaseZ),
    Vector3.create(64, 0.1, 32),
    Color4.create(0.2, 0.15, 0.25, 1)
  )

  // =========================================================================
  // ROW 1: TextureMove with TL_RESTART - Continuous texture animation
  // =========================================================================
  const ttRow1Z = textureTweenBaseZ - 8

  createLabel('ROW 1: TextureMove (continuous loop)', Vector3.create(textureTweenBaseX - 25, 3, ttRow1Z), 1)

  // T1.1 Scroll right continuously using setTextureMoveContinuous
  const texScrollRight = engine.addEntity()
  Transform.create(texScrollRight, {
    position: Vector3.create(textureTweenBaseX - 15, 2.5, ttRow1Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texScrollRight)
  Material.setPbrMaterial(texScrollRight, {
    albedoColor: Color4.create(0.3, 0.5, 0.9, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMoveContinuous(texScrollRight, Vector2.create(0.5, 0), 5000)
  createLabel('Scroll Right\nContinuous', Vector3.create(textureTweenBaseX - 15, 6, ttRow1Z), 0.9)

  // T1.2 Scroll left continuously using setTextureMoveContinuous
  const texScrollLeft = engine.addEntity()
  Transform.create(texScrollLeft, {
    position: Vector3.create(textureTweenBaseX - 5, 2.5, ttRow1Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texScrollLeft)
  Material.setPbrMaterial(texScrollLeft, {
    albedoColor: Color4.create(0.5, 0.5, 0.5, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMoveContinuous(texScrollLeft, Vector2.create(-0.5, 0), 5000)
  createLabel('Scroll Left\nContinuous', Vector3.create(textureTweenBaseX - 5, 6, ttRow1Z), 0.9)

  // T1.3 Scroll up continuously using setTextureMoveContinuous
  const texScrollUp = engine.addEntity()
  Transform.create(texScrollUp, {
    position: Vector3.create(textureTweenBaseX + 5, 2.5, ttRow1Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texScrollUp)
  Material.setPbrMaterial(texScrollUp, {
    albedoColor: Color4.create(0.9, 0.7, 0.3, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMoveContinuous(texScrollUp, Vector2.create(0, 0.5), 5000)
  createLabel('Scroll Up\nContinuous', Vector3.create(textureTweenBaseX + 5, 6, ttRow1Z), 0.9)

  // T1.4 Scroll down continuously using setTextureMoveContinuous
  const texScrollDown = engine.addEntity()
  Transform.create(texScrollDown, {
    position: Vector3.create(textureTweenBaseX + 15, 2.5, ttRow1Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texScrollDown)
  Material.setPbrMaterial(texScrollDown, {
    albedoColor: Color4.create(0.3, 0.9, 0.7, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMoveContinuous(texScrollDown, Vector2.create(0, -0.5), 5000)
  createLabel('Scroll Down\nContinuous', Vector3.create(textureTweenBaseX + 15, 6, ttRow1Z), 0.9)

  // T1.5 Diagonal scroll continuously using setTextureMoveContinuous
  const texScrollDiag = engine.addEntity()
  Transform.create(texScrollDiag, {
    position: Vector3.create(textureTweenBaseX + 25, 2.5, ttRow1Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texScrollDiag)
  Material.setPbrMaterial(texScrollDiag, {
    albedoColor: Color4.create(0.9, 0.3, 0.5, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMoveContinuous(texScrollDiag, Vector2.create(0.3, 0.3), 5000)
  createLabel('Diagonal\nContinuous', Vector3.create(textureTweenBaseX + 25, 6, ttRow1Z), 0.9)

  // =========================================================================
  // ROW 2: TextureMove with manual restart loop
  // =========================================================================
  const ttRow2Z = textureTweenBaseZ + 4

  createLabel('ROW 2: TextureMove (looping)', Vector3.create(textureTweenBaseX - 25, 3, ttRow2Z), 1)

  // T2.1 TextureMove X
  const texMoveX = engine.addEntity()
  Transform.create(texMoveX, {
    position: Vector3.create(textureTweenBaseX - 15, 2.5, ttRow2Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texMoveX)
  Material.setPbrMaterial(texMoveX, {
    albedoColor: Color4.create(0.7, 0.4, 0.9, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMove(texMoveX, Vector2.create(0, 0), Vector2.create(1, 0), 4000)
  createLabel('X: 0→1', Vector3.create(textureTweenBaseX - 15, 6, ttRow2Z), 0.9)

  // T2.2 TextureMove Y
  const texMoveY = engine.addEntity()
  Transform.create(texMoveY, {
    position: Vector3.create(textureTweenBaseX - 5, 2.5, ttRow2Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texMoveY)
  Material.setPbrMaterial(texMoveY, {
    albedoColor: Color4.create(0.4, 0.7, 0.9, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMove(texMoveY, Vector2.create(0, 0), Vector2.create(0, 1), 4000)
  createLabel('Y: 0→1', Vector3.create(textureTweenBaseX - 5, 6, ttRow2Z), 0.9)

  // T2.3 TextureMove diagonal
  const texMoveDiag2 = engine.addEntity()
  Transform.create(texMoveDiag2, {
    position: Vector3.create(textureTweenBaseX + 5, 2.5, ttRow2Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texMoveDiag2)
  Material.setPbrMaterial(texMoveDiag2, {
    albedoColor: Color4.create(0.9, 0.9, 0.4, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMove(texMoveDiag2, Vector2.create(0, 0), Vector2.create(1, 1), 4000)
  createLabel('Diagonal', Vector3.create(textureTweenBaseX + 5, 6, ttRow2Z), 0.9)

  // T2.4 TextureMove X reverse
  const texMoveXRev = engine.addEntity()
  Transform.create(texMoveXRev, {
    position: Vector3.create(textureTweenBaseX + 15, 2.5, ttRow2Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texMoveXRev)
  Material.setPbrMaterial(texMoveXRev, {
    albedoColor: Color4.create(0.4, 0.9, 0.4, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMove(texMoveXRev, Vector2.create(1, 0), Vector2.create(0, 0), 4000)
  createLabel('X: 1→0', Vector3.create(textureTweenBaseX + 15, 6, ttRow2Z), 0.9)

  // T2.5 TextureMove Y reverse
  const texMoveYRev = engine.addEntity()
  Transform.create(texMoveYRev, {
    position: Vector3.create(textureTweenBaseX + 25, 2.5, ttRow2Z),
    scale: Vector3.create(4, 4, 0.2)
  })
  MeshRenderer.setPlane(texMoveYRev)
  Material.setPbrMaterial(texMoveYRev, {
    albedoColor: Color4.create(0.9, 0.5, 0.2, 1),
    texture: Material.Texture.Common({
      src: 'images/scene-thumbnail.png',
      wrapMode: TextureWrapMode.TWM_REPEAT
    })
  })
  Tween.setTextureMove(texMoveYRev, Vector2.create(0, 1), Vector2.create(0, 0), 4000)
  createLabel('Y: 1→0', Vector3.create(textureTweenBaseX + 25, 6, ttRow2Z), 0.9)

  // Store texture move entities for restart system
  const textureMoveEntities = [
    { entity: texMoveX, start: Vector2.create(0, 0), end: Vector2.create(1, 0), duration: 4000 },
    { entity: texMoveY, start: Vector2.create(0, 0), end: Vector2.create(0, 1), duration: 4000 },
    { entity: texMoveDiag2, start: Vector2.create(0, 0), end: Vector2.create(1, 1), duration: 4000 },
    { entity: texMoveXRev, start: Vector2.create(1, 0), end: Vector2.create(0, 0), duration: 4000 },
    { entity: texMoveYRev, start: Vector2.create(0, 1), end: Vector2.create(0, 0), duration: 4000 }
  ]

  // System to restart TextureMove tweens when they complete
  engine.addSystem(() => {
    for (const item of textureMoveEntities) {
      if (tweenSystem.tweenCompleted(item.entity)) {
        Tween.setTextureMove(item.entity, item.start, item.end, item.duration)
      }
    }
  })

  // -------------------------------------------------------------------------
  // INPUT HANDLING SYSTEMS
  // -------------------------------------------------------------------------

  // System: Handle pointer DOWN events
  engine.addSystem(() => {
    for (const [entity] of engine.getEntitiesWith(CubeInputState, HoverState)) {
      const state = CubeInputState.get(entity)

      for (const action of state.actions) {
        const downCmd = inputSystem.getInputCommand(
          action,
          PointerEventType.PET_DOWN,
          entity
        )

        if (downCmd) {
          const mutableState = CubeInputState.getMutable(entity)
          mutableState.isPressed = true
          const colorIndex = INPUT_ACTIONS.findIndex(a => a.action === action)
          mutableState.currentColor = colorIndex

          Material.setPbrMaterial(entity, {
            albedoColor: getActionColor(action)
          })

          const hoverState = HoverState.getMutable(entity)
          hoverState.lastAction = getActionName(action)

          updateHoverText(entity, state.isMasterCube, getActionName(action), true)
        }
      }
    }
  })

  // System: Handle pointer UP events
  engine.addSystem(() => {
    for (const [entity] of engine.getEntitiesWith(CubeInputState, HoverState)) {
      const state = CubeInputState.get(entity)

      for (const action of state.actions) {
        const upCmd = inputSystem.getInputCommand(
          action,
          PointerEventType.PET_UP,
          entity
        )

        if (upCmd) {
          const mutableState = CubeInputState.getMutable(entity)
          mutableState.isPressed = false
          mutableState.currentColor = -1

          Material.setPbrMaterial(entity, {
            albedoColor: DEFAULT_COLOR
          })

          updateHoverText(entity, state.isMasterCube, '', false)
        }
      }
    }
  })

  // System: Handle HOVER_ENTER events
  engine.addSystem(() => {
    for (const [entity] of engine.getEntitiesWith(CubeInputState, HoverState)) {
      const state = CubeInputState.get(entity)

      const hoverEnter = inputSystem.getInputCommand(
        InputAction.IA_POINTER,
        PointerEventType.PET_HOVER_ENTER,
        entity
      )

      if (hoverEnter) {
        const hoverState = HoverState.getMutable(entity)
        hoverState.isHovered = true

        const cubeState = CubeInputState.get(entity)
        const currentColor = cubeState.currentColor >= 0
          ? INPUT_ACTIONS[cubeState.currentColor].color
          : DEFAULT_COLOR

        Material.setPbrMaterial(entity, {
          albedoColor: currentColor,
          emissiveColor: currentColor,
          emissiveIntensity: 0.6
        })

        updateHoverText(entity, state.isMasterCube, '', false)
      }
    }
  })

  // System: Handle HOVER_LEAVE events
  engine.addSystem(() => {
    for (const [entity] of engine.getEntitiesWith(CubeInputState, HoverState)) {
      const hoverLeave = inputSystem.getInputCommand(
        InputAction.IA_POINTER,
        PointerEventType.PET_HOVER_LEAVE,
        entity
      )

      if (hoverLeave) {
        const hoverState = HoverState.getMutable(entity)
        hoverState.isHovered = false

        const cubeState = CubeInputState.get(entity)
        const currentColor = cubeState.currentColor >= 0
          ? INPUT_ACTIONS[cubeState.currentColor].color
          : DEFAULT_COLOR

        Material.setPbrMaterial(entity, {
          albedoColor: currentColor,
          emissiveIntensity: 0
        })
      }
    }
  })

  console.log('✅ All test platforms created')
  console.log('📊 Tests: Staircase, Gap Jumps, Descend, Step Heights, Ramps, Corridor Width, Control Mapping, Trigger Areas, Wall Teleport, Continuous Tweens (ADR-285), Texture Tweens (ADR-255)')
}
