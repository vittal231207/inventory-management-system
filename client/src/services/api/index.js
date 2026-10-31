import { httpProvider } from './httpProvider'
import { sampleProvider } from './sampleProvider'

export const dataMode = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'sample'
export const stockroomApi = dataMode === 'api' ? httpProvider : sampleProvider
