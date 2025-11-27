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
  Schemas
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
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
    textColor: Color4.White()
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
  console.log('📊 Tests: Staircase, Gap Jumps, Descend, Step Heights, Ramps, Corridor Width, Control Mapping')
}
