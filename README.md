# mongoose-json-select

A mongoose plugin to limit JSON properties and set the unselected fields to null.

```js
var jsonSelect = require('k-mongoose-json-select');

var schema = Schema({
  name: String,
  email: String,
  created: {type: Date, default: Date.now}
});
schema.plugin(jsonSelect, 'name created');
var User = mongoose.model('User', schema);

var user = User({name: 'alice', email: 'alice@example.com'});
JSON.stringify(user);
// -> '{"name": "alice", "email": null , "created": "2013-03-16T16:08:38.065Z"}'

JSON.stringify(user.toJSON({select: 'name email'}));
// -> '{"name": "alice", "email": "alice@example.com", "created": null }'
```

## Installation
    $ npm install k-mongoose-json-select

## Usage
Inclusion/Exclusion
```js
// inclusion. these are equivalent
schema.plugin(jsonSelect, 'name.first');
schema.plugin(jsonSelect, {'name.first': 1});

// exclusion. these are equivalent
schema.plugin(jsonSelect, '-name.last');
schema.plugin(jsonSelect, {'name.last': 0});
```

Always exclude _id,id and __v field if the field is not included explicitly.
```js
schema.plugin(jsonSelect, 'name');  // contains 'name' only
```

Configures default fields as a plugin option or schema option.
```js
// these are equivalent
schema.plugin(jsonSelect, 'name');

schema.plugin(jsonSelect);
schema.set('toJSON', {select: 'name'});
```

Specifies fields when calling toJSON.
```js
// this overrides a default configuration
JSON.stringify(doc.toJSON({select: 'name email'}));
```

The syntax for fields is the same with mongoose's Query#select.

http://mongoosejs.com/docs/api.html#query_Query-select
```

## Support

This plugin is proudly supported by [Kubide](http://kubide.es/) [desarrollo@kubide.es](mailto:desarrollo@kubide.es)

## License
MIT

