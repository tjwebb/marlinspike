import requireAll from 'require-all'
import path from 'path'
import _ from 'lodash'

export default class Marlinspike {

  constructor (sails, hookModule) {
    this.sails = sails
    this.name = this.constructor.name.toLowerCase()
    this.hookPath = path.resolve(path.dirname(hookModule.filename))

    this.sails.log.debug('hookPath:', this.hookPath)
  }

  configure () {
    return { }
  }
  initialize (next) {
    next()
  }
  routes () {
    return { }
  }
  defaults (overrides) {
    return { }
  }

  loadConfig () {
    let configPath = path.resolve(this.hookPath, '../../../config')
    this.sails.log.debug(`marlinspike (${this.name}): loading config from ${configPath}`)
    try {
      let configModules = requireAll({
        dirname: configPath,
        filter: /(.+)\.js$/
      })
      let sailsConfig = _.reduce(_.values(configModules), _.merge)
      _.merge(this.sails.config, sailsConfig)
    }
    catch (e) {
      this.sails.log.debug(`marlinspike (${this.name}): no configuration found. skipping`)
    }
  }
  
  loadModels () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Models...`)
    try {
      let models = requireAll({
        dirname: path.resolve(this.hookPath, '../../models'),
        filter: /(.+)\.js$/
      })
      this.mergeEntities('models', models)
    }
    catch (e) {
      this.sails.log.warn(`marlinspike (${this.name}): no Models found. skipping`)
    }
  }

  loadPolicies () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Policies...`)
    try {
      let policies = requireAll({
        dirname: path.resolve(this.hookPath, '../../policies'),
        filter: /(.+)\.js$/
      })
      _.extend(this.sails.hooks.policies.middleware, _.mapKeys(policies, (policy, key) => {
        return key.toLowerCase()
      }))
    }
    catch (e) {
      this.sails.log.warn(`marlinspike (${this.name}): no Policies found. skipping`)
    }

  }

  loadControllers () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Controllers...`)
    try {
      let controllers = requireAll({
        dirname: path.resolve(this.hookPath, '../../controllers'),
        filter: /(.+Controller)\.js$/,
        map (name, path) {
          return name.replace(/Controller/, '')
        }
      })
      this.mergeEntities('controllers', controllers)
    }
    catch (e) {
      this.sails.log.warn(`marlinspike (${this.name}): no Controllers found. skipping`)
    }
  }

  loadServices () {
    let servicesPath = path.resolve(this.hookPath, '../../services')
    this.sails.log.debug(`marlinspike (${this.name}): loading Services from ${servicesPath}...`)
    try {
      let services = requireAll({
        dirname: servicesPath,
        filter: /(.+)\.js$/
      })
      this.mergeEntities('services', services)
    }
    catch (e) {
      this.sails.log.warn(`marlinspike (${this.name}): no Services found. skipping`)
    }
  }

  /**
   * load modules into the sails namespace
   */
  mergeEntities (ns, entities) {
    this.sails[ns] = _.merge(this.sails[ns] || { }, Marlinspike.transformEntities(entities))
  }

  static transformEntities (entities) {
    return _.chain(entities)
      .mapValues((entity, key) => {
        return _.defaults(entity, {
          globalId: key,
          identity: key.toLowerCase()
        })
      })
      .mapKeys((entity, key) => {
        return key.toLowerCase();
      })
      .value()
  }

  static defaultConfig () {
    return {
      marlinspike: {
        controllers: true,
        models: true,
        services: true,
        policies: true
      }
    }
  }

  /**
   * Return a bona fide Sails hook object forged from the
   * specified class
   *
   * @param Class Hook
   */
  static createSailsHook (Hook) {
    return sails => {
      const hook = new Hook(sails)
      hook.loadConfig(Hook.constructor.name)

      let config = _.defaults({ }, Marlinspike.defaultConfig())
      if (hook.name in sails.config) _.extend(config.marlinspike, sails.config[hook.name].marlinspike)

      return {
        name: this.name,
        routes: hook.routes(),
        defaults (overrides) {
          return _.merge(config, hook.defaults(overrides))
        },
        configure () {
          if (config.marlinspike.services) hook.loadServices()
          if (config.marlinspike.models) hook.loadModels()
          if (config.marlinspike.controllers) hook.loadControllers()
          if (config.marlinspike.policies) hook.loadPolicies()

          hook.configure()
          sails.emit(`hook:${hook.name}:configured`)
        },
        initialize (next) {

          hook.initialize(() => {
            sails.emit(`hook:${hook.name}:initialized`)
            next()
          })
        }
      }
    }
  }
}

export default Marlinspike
