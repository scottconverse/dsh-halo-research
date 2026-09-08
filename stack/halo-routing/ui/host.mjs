/* DEV-only Typert bridge for the parent-provided ctx.haloRouting API. */
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// This file is loaded by absolute file URL from the DEV profile patch, so its
// own directory has no package ancestor. Anchor resolution at the DEV web
// profile to reuse the exact pinned DSH Typert runtime already installed there.
const devHome = process.env.DSH_HOME
if (!devHome) throw new Error('Halo Router DEV remote requires DSH_HOME')
const rootRequire = createRequire(path.join(devHome, '..', 'package.json'))
const devRequire = createRequire(rootRequire.resolve('@deepseek-ai/dsh/package.json'))
const { Remote, TypertRemoteService } = await import(pathToFileURL(devRequire.resolve('@deepseek-ai/dsh-typert-protocol')))

const __runInitializers = (thisArg, initializers) => {
  for (const initializer of initializers) initializer.call(thisArg)
}

const __esDecorate = (ctor, descriptorIn, decorators, contextIn, initializers) => {
  const descriptor = descriptorIn ?? Object.getOwnPropertyDescriptor(ctor.prototype, contextIn.name)
  let done = false
  for (const decorator of decorators.toReversed()) {
    const context = { ...contextIn, addInitializer: initializer => {
      if (done) throw new TypeError('Cannot add initializers after decoration has completed')
      initializers.push(initializer)
    } }
    decorator(descriptor.value, context)
  }
  done = true
  Object.defineProperty(ctor.prototype, contextIn.name, descriptor)
}

/**
 * The parent router owns the API and all policy state. This adapter only makes
 * those two read/write methods visible to DSH's stock Typert gateway.
 */
export class HaloRoutingRemoteGateway extends TypertRemoteService {
  static inject = ['haloRouting']

  constructor(ctx) {
    super(ctx, 'haloRoutingRemote', { namespace: 'haloRouting' })
    __runInitializers(this, _instanceExtraInitializers)
  }

  status(request) {
    return this.ctx.get('haloRouting').status(request)
  }

  configure(request) {
    return this.ctx.get('haloRouting').configure(request)
  }
}

const _instanceExtraInitializers = []
__esDecorate(HaloRoutingRemoteGateway, null, [Remote('status')], {
  kind: 'method', name: 'status', static: false, private: false,
  access: { has: object => 'status' in object, get: object => object.status },
}, _instanceExtraInitializers)
__esDecorate(HaloRoutingRemoteGateway, null, [Remote('configure')], {
  kind: 'method', name: 'configure', static: false, private: false,
  access: { has: object => 'configure' in object, get: object => object.configure },
}, _instanceExtraInitializers)

export const name = 'dsh-halo-routing-remote'
export const inject = ['haloRouting']

export function apply(ctx) {
  ctx.plugin(HaloRoutingRemoteGateway)
}

export default apply
