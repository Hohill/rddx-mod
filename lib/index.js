'use strict';

/**
 * rddx-mod
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const debug = require('debug')('rddx-mod');


function isPath(str) {
  return (str.slice(0, 2) === './' || str.slice(0, 1) === '/')
}

function resolvePackageDir(name) {
  let f = require.resolve(name);
  let i = f.lastIndexOf('/node_modules/');
  if (i === -1) throw new Error(`cannot get package base directory for "${f}"`);
  let j = f.indexOf('/', i + 14);
  if (j === -1) throw new Error(`cannot get package base directory for "${f}"`);
  return f.slice(0, j + 1);
}

function deleteRequireCache(f) {
  debug('deleteRequireCache: %s', f);
  delete require.cache[f];
}

function createMod(options) {

  options = options || {};
  options.path = path.resolve(options.path || '.');
  options.reload = !!options.reload;
  options.delay = (options.delay > 0 ? options.delay : 100);

  let mod = function (name, prop) {
    let c = mod._cache[name];
    if (c && c.data) {
      let m = c.data;
      if (prop) {
        if (prop in m) {
          return m[prop];
        } else {
          throw new Error(`module "${name}" has no property names "${prop}"`);
        }
      } else {
        return m;
      }
    } else {
      throw new Error(`cannot require module "${name}"`);
    }
  };

  mod._options = options;

  mod._cache = {};

  mod._getCache = function (name) {
    if (!mod._cache[name]) mod._cache[name] = {};
    return mod._cache[name];
  };

  mod._setCache = function (name, data) {
    mod._getCache(name).data = data;
  };

  mod._watch = function (name, file, onChange, onReload) {
    if (!mod._options.reload) return;

    debug('mod._watch: name=%s, file=%s', name, file);
    let c = mod._getCache(name);
    if (c.watcher) c.watcher.close();
    c.watcher = fs.watch(file, (e, f) => {
      debug('mod._watch: event=%s, file=%s', e, file);
      if (c.taskid) return;
      c.taskid = setInterval(() => {
        delete c.taskid;
        onChange();
        if (e === 'change') onReload();
      }, mod._options.delay);
    });
  };

  mod.register = function (name, file) {
    if (isPath(file)) {
      mod._registerFile(name, file);
    } else {
      mod._registerPackage(name, file);
    }
  };

  mod._registerFile = function (name, file) {
    file = require.resolve(path.resolve(mod._options.path, file));
    debug('mod._registerFile: name=%s, file=%s', name, file);
    mod._setCache(name, require(file));
    mod._watch(name, file, () => {
      deleteRequireCache(file);
    }, () => {
      mod._setCache(name, require(file));
    });
  };

  mod._registerPackage = function (name, pkg) {
    let dir = resolvePackageDir(pkg);
    let file = path.resolve(dir, 'package.json');
    debug('mod._registerPackage: name=%s, pkg=%s, file=%s', name, pkg, file);
    mod._setCache(name, require(pkg));
    mod._watch(name, file, () => {
      for (let f in require.cahce) {
        deleteRequireCache(f);
      }
    }, () => {
      mod._setCache(name, require(pkg));
    });
  };

  return mod;
}

module.exports = createMod;
