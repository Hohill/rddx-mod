# rddx-mod
module loader for REPL drive development

## Installation

For Node v4.0.0 or above:

```bash
$ npm install rddx-mod --save
```

## Usage

```javascript
'use strict';

const Mod = require('rddx-mod');

let mod = Mod({
  path: __dirname,   // module files base path
  reload: true,      // set to true to auto reload module when it has been changed. default to false
  delay: 100,        // when module has been changed, auto reload it after a while. default to 100ms
});

// register modules
// mod.register('name', 'path to');
mod.register('a', './a');
mod.register('b', './b');
// register third-part package
// mod.register('name', 'package');
mod.register('express', 'express');

// unregister module, and remove cache
mod.unregister('a');

// use module
mod('a').hello();
mod('a', 'hello')();
```

## License

```
The MIT License (MIT)

Copyright (c) 2015 Zongmin Lei <leizongmin@gmail.com>
http://ucdok.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
