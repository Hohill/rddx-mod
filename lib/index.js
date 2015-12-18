'use strict';

/**
 * rddx-mod
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('rddx-mod');


function isPath(str) {
  return (str[0] === '.' || str[0] === '/')
}

function resolvePackageDir(name) {
  let f = require.resolve(name);
  let i = f.lastIndexOf('/node_modules/');
  if (i === -1) throw new ResolvePackagePathError(`cannot get package base directory for "${f}"`);
  let j = f.indexOf('/', i + 14);
  if (j === -1) throw new ResolvePackagePathError(`cannot get package base directory for "${f}"`);
  return f.slice(0, j + 1);
}

function deleteRequireCache(f) {
  debug('deleteRequireCache: %s', f);
  delete require.cache[f];
}

function ResolvePackagePathError(message) {
    this.name = 'ResolvePackagePathError';
    this.message = (message || '');
}
ResolvePackagePathError.prototype = Error.prototype;

function RequireModuleError(message) {
    this.name = 'RequireModuleError';
    this.message = (message || '');
}
RequireModuleError.prototype = Error.prototype;

function ModuleHasNoPropertyError(message) {
    this.name = 'ModuleHasNoPropertyError';
    this.message = (message || '');
}
ModuleHasNoPropertyError.prototype = Error.prototype;

function ModHasBeenDestroyedError(message) {
    this.name = 'ModHasBeenDestroyedError';
    this.message = (message || '');
}
ModHasBeenDestroyedError.prototype = Error.prototype;

function throwModHasBeenDestroyedError() {
  throw new ModHasBeenDestroyedError();
}

function createMod(options) {

  options = options || {};
  options.path = path.resolve(options.path || '.');
  options.reload = !!options.reload;
  options.delay = (options.delay > 0 ? options.delay : 100);

  /**
   * mod
   *
   * @param {String} name
   * @param {String} prop
   * @return {Mixed}
   */
  let mod = function (name, prop) {
    if (mod._destroy) throw new ModHasBeenDestroyedError();

    let c = mod._cache[name];
    if (c && c.data) {
      let m = c.data;
      if (prop) {
        if (prop in m) {
          return m[prop];
        } else {
          throw new ModuleHasNoPropertyError(`module "${name}" has no property names "${prop}"`);
        }
      } else {
        return m;
      }
    } else {
      throw new RequireModuleError(`cannot require module "${name}"`);
    }
  };

  let event = new EventEmitter();
  mod.event = event;

  /**
   * add event handle
   *
   * @param {String} name
   * @param {Function} fn
   * @return {this}
   */
  mod.on = function (name, fn) {
    debug('on: name=%s', name);
    event.on(name, fn);
    return mod;
  };

  /**
   * add event handle (once)
   *
   * @param {String} name
   * @param {Function} fn
   * @return {this}
   */
  mod.once = function (name, fn) {
    debug('once: name=%s', name);
    event.once(name, fn);
    return mod;
  };

  /**
   * emit event
   *
   * @param {String} name
   * @return {this}
   */
  mod.emit = function () {
    let args = Array.prototype.slice.call(arguments);
    debug('emit: name=%s, args=%s', args[0], args.slice(1));
    event.emit.apply(event, args);
    return mod;
  };

  mod._options = options;

  mod._cache = {};

  function getCache(name) {
    if (!mod._cache[name]) mod._cache[name] = {};
    return mod._cache[name];
  }

  function setCache(name, data) {
    getCache(name).data = data;
  }

  function watch(name, file, onChange, onReload) {
    debug('watch: name=%s, file=%s', name, file);

    let c = getCache(name);
    c.name = name;
    c.file = file;
    c.onChange = onChange;
    c.onReload = onReload;

    if (!mod._options.reload) return;

    if (c.watcher) c.watcher.close();
    c.watcher = fs.watch(file, (e, f) => {
      if (mod._destroy) {
        debug('mod has been destroyed, cancel ')
        return;
      }
      debug('watch: event=%s, file=%s', e, file);
      if (c.taskid) return;
      c.taskid = setTimeout(() => {
        delete c.taskid;
        if (e === 'change') {
          reload(name);
        }
      }, mod._options.delay);
    });
  }

  function reload(name) {
    let c = getCache(name);
    if (c.onChange && c.onReload) {
      c.onChange();
      c.onReload();
      event.emit('reload', name, c.file);
    } else {
      throw new RequireModuleError(`cannot require module "${name}"`);
    }
  }

  /**
   * get module
   *
   * @param {String} name
   * @param {String} prop
   * @return {Mixed}
   */
  mod.get = function (name, prop) {
    return mod(name, prop);
  };

  /**
   * register module
   *
   * @param {String} name
   * @param {String} file
   * @return {this}
   */
  mod.register = function (name, file) {

    if (isPath(file)) {
      registerFile(name, file);
    } else {
      registerPackage(name, file);
    }

    return mod;
  };

  /**
   * unregister module
   *
   * @param {String} name
   * @return {this}
   */
  mod.unregister = function (name) {

    debug('unregister: name=%s', name);
    let data = mod._cache[name];
    delete mod._cache[name];
    event.emit('unregister', name, data);

    return mod;
  };

  function registerFile(name, file) {
    file = require.resolve(path.resolve(mod._options.path, file));
    debug('registerFile: name=%s, file=%s', name, file);
    setCache(name, require(file));
    watch(name, file, () => {
      deleteRequireCache(file);
    }, () => {
      setCache(name, require(file));
    });
    event.emit('register', name, file, null);
  };

  function registerPackage(name, pkg) {
    let dir = resolvePackageDir(pkg);
    let file = path.resolve(dir, 'package.json');
    debug('registerPackage: name=%s, pkg=%s, file=%s', name, pkg, file);
    setCache(name, require(pkg));
    watch(name, file, () => {
      for (let f in require.cahce) {
        deleteRequireCache(f);
      }
    }, () => {
      setCache(name, require(pkg));
    });
    event.emit('register', name, file, pkg);
  };

  /**
   * reload
   *
   * @param {String} name
   * @return {this}
   */
  mod.reload = function (name) {
    debug('reload: name=%s', name);
    reload(name);
    return this;
  };

  /**
   * destroy, release all mod cache, but won't delete `require.cache`
   */
  mod.destroy = function () {
    debug('destroy');
    mod._destroy = true;

    for (let name in mod._cache) {
      debug('clear module: %s', name);
      if (mod._cache[name].watcher) {
        debug('close file watcher: %s', name);
        mod._cache[name].watcher.close();
      }
      if (mod._cache[name].taskid) {
        debug('clear reload task: %s', name);
        clearTimeout(mod._cache[name].taskid);
      }
      mod._cache[name].data = null;
      mod._cache[name].watcher = null;
      mod._cache[name].taskid = null;
      mod._cache[name] = null;
    }
    mod._cache = null;

    for (let name in mod) {
      if (typeof mod[name] === 'function') {
        mod[name] = throwModHasBeenDestroyedError;
      } else {
        mod[name] = null;
      }
    }

    event.emit('destroy');
    event.removeAllListeners();
  };

  return mod;
}

createMod.ResolvePackagePathError = RequireModuleError;
createMod.RequireModuleError = RequireModuleError;
createMod.ModuleHasNoPropertyError = ModuleHasNoPropertyError;
createMod.ModHasBeenDestroyedError = ModHasBeenDestroyedError;

module.exports = createMod;
