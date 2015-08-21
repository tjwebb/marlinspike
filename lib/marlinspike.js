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
    let configPath = path.resolve(this.hookPath, '../../../config', this.name)
    this.sails.log.debug(`marlinspike (${this.name}): loading hook config from ${configPath}`)
    try {
      return require(configPath)
    }
    catch (e) {
      return { }
    }
  }
  
  loadModels () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Models...`)
    let models = requireAll({
      dirname: path.resolve(this.hookPath, '../../models'),
      filter: /(.+)\.js$/
    })

    this.extendEntities('models', models)
  }

  loadPolicies () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Policies...`)
    let policies = requireAll({
      dirname: path.resolve(this.hookPath, '../../policies'),
      filter: /(.+)\.js$/
    })

    this.extendEntities([ 'hooks', 'policies', 'middleware' ], policies)
  }

  loadControllers () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Controllers...`)
    let controllers = requireAll({
      dirname: path.resolve(this.hookPath, '../../controllers'),
      filter: /(.+Controller)\.js$/,
      map (name, path) {
        return name.replace(/Controller/, '')
      }
    })

    this.extendEntities('controllers', controllers)
  }

  loadServices () {
    let servicesPath = path.resolve(this.hookPath, '../../services')
    this.sails.log.debug(`marlinspike (${this.name}): loading Services from ${servicesPath}...`)
    let services = requireAll({
      dirname: servicesPath,
      filter: /(.+)\.js$/
    })

    this.extendEntities('services', services)
  }

  /**
   * load modules into the sails namespace
   */
  extendEntities (ns, entities) {
    let destination = _.get(this.sails, ns)
    _.merge(destination, Marlinspike.transformEntities(entities))
  }

  static transformEntities (entities) {
    return _.chain(entities)
      .mapValues(function (entity, key) {
        if (_.isFunction(entity)) {
          return entity
        }

        return _.extend({
          globalId: key,
          identity: key.toLowerCase()
        }, entity);
      })
      .mapKeys(function (entity, key) {
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

      let config = _.defaults(
        hook.loadConfig(Hook.constructor.name),
        Marlinspike.defaultConfig()
      )

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
