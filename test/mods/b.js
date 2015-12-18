exports.name = 'I am B';

exports.hello = function () {
  return 'Hello, ' + exports.name;
};

exports.number = Math.random();