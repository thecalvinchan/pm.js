'use strict';

// Examples
//
// match (123,
//   42, () => 'aaa',
//   123, () => 'bbb',
//   444, () => 'ccc'
// )
//
// match(['+', 5, 7],
//   ['+', _, _], (x,y) => x + y,
// )
//
// match(new Point3D(1, 2, 3),
//   instof(Point3D, _, 2, _), (x,z) => x + z
// )

function match(value /* pat1, fun1, pat2, fun2, ... */) {
  var patFun = Array.prototype.slice.call(arguments, 1);
  for (var i=0; i+1<patFun.length; i+=2) {
    var pattern = patFun[i],
        func = patFun[i+1];
    try {
      var args = pattern.match(value);
      console.log(args);
      if (func.length !== args.length) {
        throw new Error('Callback expected ' + func.length + ' args, received ' + args.length);
      }
      return func.apply(null, args);
    } catch(e) {
      console.log(e);
    }
  }
  throw new Error('match failed');
}

var _ = {
  match: function(value) {
    return value ? [value] : [];
  }
}

String.prototype.match = function(value) {
  if (typeof value !== 'string') {
    throw new Error('String match failed');
  }
  var val = this.valueOf();
  if (val === value) {
    return [];
  } else {
    throw new Error('String match failed');
  }
}

Number.prototype.match = function(value) {
  if (typeof value !== 'number') {
    throw new Error('Number match failed');
  }
  var val = this.valueOf();
  if (val === value) {
    return [];
  } else {
    throw new Error('Number match failed');
  }
}

Array.prototype.match = function(value) {
  if (!(value instanceof Array)) {
    throw new Error('Array match failed');
  }
  var pattern = this.valueOf();
  var returnValue = [];
  //pattern = i, value = j
  // if j accesses out of bound, will throw error
  console.log(pattern, value);
  console.log(pattern.length, value.length);
  try {
    if (pattern.length === 0 && value.length === 0) {
      return [];
    } else if (pattern[0] instanceof ManyValue) {
      var manyMatch = pattern[0].match(value);
      // manyMatch == {
      //   bindings: [],
      //   values: []
      // }
      console.log(manyMatch);
      return manyMatch.bindings.concat(pattern.slice(1).match(manyMatch.values));
    } else if (value.length === 0 && pattern.length > 0) { 
      throw new Error('Array match failed');
    } else {
      return pattern[0].match(value[0]).concat(pattern.slice(1).match(value.slice(1)));
    }
  } catch (e) {
    throw new Error('Array match failed: ' + e.message);
  }
}

function instof(c) {
  return new ClassMatch(c, Array.prototype.slice.call(arguments, 1));
}

function ClassMatch(c, pattern) {
  this.c = c;
  this.p = pattern;
}

ClassMatch.prototype.match = function(value) {
  if (!(value instanceof this.c)) {
    throw new Error('Class pattern match failed')
  }
  try {
    var deconstruct = this.c.prototype.deconstruct.call(value);
    return this.p.match(deconstruct);
  } catch (e) {
    throw new Error('Class pattern match failed: ' + e.message);
  }
}

function many(p) {
  return new ManyValue(p); 
}

function ManyValue(p) {
  this.p = p;
}

ManyValue.prototype.match = function(value) {
  //we know that value is an array
  //otherwise, it won't reach ManyValue
  if (value.length === 0) {
    console.log("FUCK", this.p);
    return {
      bindings: this.p.map(x => (x === _ || x instanceof ManyValue) ? [] : null).filter(x => x),
      values: []
    }
  }
  try {
    if (this.p instanceof ManyValue) {
      throw new Error('Many must be directly nested within an array');
    }
    var head = this.p.match(value[0]);
    var tail = value.slice(1).length !== 0 ? ManyValue.prototype.match.call(this, value.slice(1)) : { bindings: [], values: []};
    return {
      bindings: head.map((x,idx) => {
          return tail.bindings[idx] ? [x].concat(tail.bindings[idx]) : [x]; 
        }),
      values: tail.values
    }
  } catch(e) {
    return {
      bindings: [],
      values: value
    };
  }
}

function pred(p) {
  return new Predicate(p);
}

function Predicate(p) {
  this.lambda = p;
}

Predicate.prototype.match = function(value) {
  if (this.lambda(value)) {
    return [value];
  } else {
    throw new Error('Pred match fail');
  }
}
