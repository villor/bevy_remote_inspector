import { EntityId } from '@/entity/useEntity'
import { CreateSlice } from '@/store'

export type InspectorSlice = {
  inspectingEntity: EntityId | null
  setInspectingEntity: (entity: EntityId) => void
}

export const createInspectorSlice: CreateSlice<InspectorSlice> = (
  set,
  get
) => ({
  inspectingEntity: null,
  setInspectingEntity: (entity) => set({ inspectingEntity: entity }),
})
