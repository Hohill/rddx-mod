'use strict';

/**
 * rrdx-mod tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const fse = require('fs-extra');
const Mod = require('../');
const utils = require('lei-utils');

// init
let MOD_DIR = path.resolve(os.tmpDir(), Date.now() + Math.random() + '_mods');
fse.copySync(path.resolve(__dirname, 'mods'), MOD_DIR);

describe('not reload', function () {

  const mod = Mod({
    path: MOD_DIR,
    reload: false,
  });

  mod.on('register', function (name) {
    assert.ok(name === 'a' || name === 'b' || name === 'utils');
  });

  mod.register('a', './a');
  mod.register('b', './b');
  mod.register('utils', 'lei-utils');

  // console.log(mod('a'));
  // console.log(mod('b'));
  // console.log(mod('utils'));

  it('get module', function () {

    assert.equal(mod('a').name, 'I am A');
    assert.equal(mod('b').name, 'I am B');

    assert.equal(mod('a').hello(), 'Hello, I am A');
    assert.equal(mod('b').hello(), 'Hello, I am B');

    assert.equal(mod('utils').md5('ok'), utils.md5('ok'));

    assert.equal(mod.get('a').name, 'I am A');
    assert.equal(mod.get('b').name, 'I am B');

    assert.equal(mod.get('a').hello(), 'Hello, I am A');
    assert.equal(mod.get('b').hello(), 'Hello, I am B');

    assert.equal(mod.get('utils').md5('ok'), utils.md5('ok'));

  });

  it('get module prop', function () {

    assert.equal(mod('a', 'name'), 'I am A');
    assert.equal(mod('b', 'name'), 'I am B');

    assert.equal(mod('a', 'hello')(), 'Hello, I am A');
    assert.equal(mod('b', 'hello')(), 'Hello, I am B');

    assert.equal(mod('utils', 'md5')('ok'), utils.md5('ok'));

  });

  it('prop not exists, should throws ModuleHasNoPropertyError', function () {

    assert.throws(function () {
      mod('a', 'ooxx');
    }, Mod.ModuleHasNoPropertyError);

    assert.throws(function () {
      mod('b', 'ooxx');
    }, Mod.ModuleHasNoPropertyError);

    assert.throws(function () {
      mod('utils', 'ooxx');
    }, Mod.ModuleHasNoPropertyError);

  });

  it('file changed', function (done) {

    fs.writeFileSync(path.resolve(MOD_DIR, 'a.js'), fs.readFileSync(path.resolve(MOD_DIR, 'b.js')));
    assert.equal(mod('a').name, 'I am A');
    assert.equal(mod('b').name, 'I am B');
    setTimeout(function () {
      assert.equal(mod('a').name, 'I am A');
      assert.equal(mod('b').name, 'I am B');
      done();
    }, 500);

  });

  it('after file changed, manually reload', function () {

    let counter = 0;
    mod.on('reload', function (name, file) {
      assert.equal(name, 'a');
      counter++;
    });

    assert.equal(mod('a').name, 'I am A');
    assert.equal(mod('b').name, 'I am B');

    mod.reload('a');

    assert.equal(mod('a').name, 'I am B');
    assert.equal(mod('b').name, 'I am B');

    assert.equal(counter, 1);

  });

  it('unregister', function () {

    mod.unregister('a');

    assert.throws(function () {
      mod('a', 'name');
    }, Mod.RequireModuleError);

    assert.equal(mod('b').name, 'I am B');

  });

  it('module does not exists, should throws RequireModuleError', function () {

    assert.throws(function () {
      mod('c');
    }, Mod.RequireModuleError);

    assert.throws(function () {
      mod('d');
    }, Mod.RequireModuleError);

  });

  it('custom events', function (done) {

    const A = Math.random();
    const B = Date.now();

    mod.on('hahaha', function (a, b) {
      assert.equal(A, a);
      assert.equal(B, b);
      done();
    });

    mod.emit('hahaha', A, B);
    mod.emit('xxxxx', B, A);

  });

  it('destroy', function () {

    mod.destroy();

    assert.throws(function () {
      mod('a');
    }, Mod.ModHasBeenDestroyedError);

    assert.throws(function () {
      mod.register('a', './a');
    }, Mod.ModHasBeenDestroyedError);

    assert.throws(function () {
      mod.unregister('a');
    }, Mod.ModHasBeenDestroyedError);

    assert.throws(function () {
      mod.destroy();
    }, Mod.ModHasBeenDestroyedError);

    assert.equal(mod._cache, null);
    assert.equal(mod._options, null);

  });

});
