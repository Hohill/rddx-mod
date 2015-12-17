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

describe('series call', function () {

  const mod = Mod({
    path: MOD_DIR,
    reload: false,
  });

  mod.on('register', function (name) {
    assert.ok(name === 'a' || name === 'b' || name === 'utils');
  });

  mod
  .register('a', './a')
  .register('b', './b')
  .register('utils', 'lei-utils');

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

  it('custom events', function (done) {

    const A = Math.random();
    const B = Date.now();

    let called = {a: false, b: false};

    mod
    .on('hahaha', function (a, b) {
      assert.equal(A, a);
      assert.equal(B, b);
      called.a = true;
    })
    .on('xxxxx', function (b, a) {
      assert.equal(A, a);
      assert.equal(B, b);
      called.b = true;
    })

    mod
    .emit('hahaha', A, B)
    .emit('xxxxx', B, A);

    setTimeout(function () {
      assert.ok(called.a);
      assert.ok(called.b);
      done();
    }, 100);

  });

});
