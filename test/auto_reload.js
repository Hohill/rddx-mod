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

describe('auto reload', function () {

  const mod = Mod({
    path: MOD_DIR,
    reload: true,
    delay: 50,
  });

  mod.register('a', './a');
  mod.register('b', './b');
  mod.register('utils', 'lei-utils');

  // console.log(mod('a'));
  // console.log(mod('b'));
  // console.log(mod('utils'));

  it('normal', function () {

    assert.equal(mod('a').name, 'I am A');
    assert.equal(mod('b').name, 'I am B');

    assert.equal(mod('a').hello(), 'Hello, I am A');
    assert.equal(mod('b').hello(), 'Hello, I am B');

    assert.equal(mod('utils').md5('ok'), utils.md5('ok'));

  });

  it('prop', function () {

    assert.equal(mod('a', 'name'), 'I am A');
    assert.equal(mod('b', 'name'), 'I am B');

    assert.equal(mod('a', 'hello')(), 'Hello, I am A');
    assert.equal(mod('b', 'hello')(), 'Hello, I am B');

    assert.equal(mod('utils', 'md5')('ok'), utils.md5('ok'));

  });

  it('prop not exists, should throws Error', function () {

    assert.throws(function () {
      mod('a', 'ooxx');
    }, Error);

    assert.throws(function () {
      mod('b', 'ooxx');
    }, Error);

    assert.throws(function () {
      mod('utils', 'ooxx');
    }, Error);

  });

  it('file changed', function (done) {

    fs.writeFileSync(path.resolve(MOD_DIR, 'a.js'), fs.readFileSync(path.resolve(MOD_DIR, 'b.js')));
    assert.equal(mod('a').name, 'I am A');
    assert.equal(mod('b').name, 'I am B');
    setTimeout(function () {
      assert.equal(mod('a').name, 'I am B');
      assert.equal(mod('b').name, 'I am B');
      done();
    }, 200);

  });

  it('unregister', function () {

    mod.unregister('a');

    assert.throws(function () {
      mod('a', 'name');
    }, Error);

    assert.equal(mod('b').name, 'I am B');

  });

});
