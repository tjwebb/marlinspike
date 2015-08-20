import requireAll from 'require-all'
import path from 'path'
import _ from 'lodash'

export default class Marlinspike {

  constructor (sails, hookModule) {
    this.sails = sails
    this.name = this.constructor.name
    this.hookPath = path.resolve(path.dirname(hookModule.filename))
  }

  configure () {
  }
  initialize (next) {
    next()
  }
  routes () {
    return { }
  }
  defaults () {
    return { }
  }

  loadConfig () {
    let configPath = path.resolve(this.hookPath, '../config', this.name)
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
      dirname: path.resolve(this.hookPath, '../api/models'),
      filter: /(.+)\.js$/
    })

    this.extendEntities('models', models)
  }

  loadControllers () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Controllers...`)
    let controllers = requireAll({
      dirname: path.resolve(this.hookPath, '../api/controllers'),
      filter: /(.+Controller)\.js$/,
      map (name, path) {
        return name.replace(/Controller/, '')
      }
    })

    this.extendEntities('controllers', controllers)
  }

  loadServices () {
    this.sails.log.debug(`marlinspike (${this.name}): loading Services...`)
    let services = requireAll({
      dirname: path.resolve(this.hookPath, '../api/services'),
      filter: /(.+)\.js$/
    })

    this.extendEntities('services', services)
  }

  /**
   * load modules into the sails namespace
   */
  extendEntities (ns, entities) {
    _.merge(this.sails[ns], Marlinspike.transformEntities(entities))
  }

  static transformEntities (entities) {
    return _.chain(entities)
      .mapValues(function (entity, key) {
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
        routes: hook.routes(),
        defaults (overrides) {
          return _.merge(config, hook.defaults(overrides))
        },
        configure () {
          if (config.marlinspike.services) hook.loadServices()
          if (config.marlinspike.models) hook.loadModels()
          if (config.marlinspike.controllers) hook.loadControllers()

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
