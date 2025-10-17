import log from 'loglevel'
import { env } from '@/config/env'

log.setDefaultLevel(env.logLevel)

export { log }
