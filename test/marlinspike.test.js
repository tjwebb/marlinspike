import assert from 'assert'
import _ from 'lodash'

import Marlinspike from '../'
import TestHook from './api/hooks/testhook'

describe('Marlinspike', () => {
  describe('#constructor', () => {
    it('empty hook should be constructable', () => {
      let spike = new TestHook(global.sails)
    })
  })

  describe('#createSailsHook', () => {
    it('should return a valid sails hook', () => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      assert(_.isFunction(HookDefinition))
      assert(_.isObject(hook))

      assert(_.isFunction(hook.defaults))
      assert(_.isFunction(hook.configure))
      assert(_.isFunction(hook.initialize))
      assert(_.isObject(hook.routes))
    })
    it('should extend controllers', () => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      hook.configure()

      assert(global.sails.controllers.test)
    })
    it('should extend services', () => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      hook.configure()

      assert(global.sails.services.testservice)
    })
    it('should extend models', done => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      hook.configure()

      global.sails.after('hook:orm:loaded', function () {
        assert(global.sails.models.testmodel)
        done()
      })
    })
    it('should extend policies', done => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      hook.configure()
      global.sails.after('hook:http:loaded', function () {
        assert(_.isFunction(global.sails.hooks.policies.middleware.testpolicy))
        assert(_.isFunction(global.sails.middleware.policies.testpolicy))
        done()
      })
    })
    it('should extend sails.config', () => {
      let HookDefinition = Marlinspike.createSailsHook(TestHook)
      let hook = HookDefinition(global.sails)

      hook.configure()

      assert.equal(global.sails.config.testconfig.foo, 'bar')
    })
  })
})
