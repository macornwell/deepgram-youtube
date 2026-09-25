import { AppFeaturesLayer, AppServicesLayer } from '../app/types.js'

/**
 * This is the overall type for the context.
 */
export type System = Readonly<{
  services: AppServicesLayer
  features: AppFeaturesLayer
}>
