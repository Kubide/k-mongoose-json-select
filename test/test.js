let expect = require('chai').should(),
  mongoose = require('mongoose'),
  jsonSelect = require('../'),
  Schema = mongoose.Schema;


function model(name, schema) {
  if ('string' !== typeof name) {
    schema = name;
    name = 'Model';
  }
  return mongoose.model(name, schema, null, {cache: false});
}

function userSchema() {
  return Schema({
    username: String,
    password: String,
    name: {
      first: String,
      last: String
    },
    emails: [String],
    created: {type: Date, 'default': Date.now}
  });
}

describe('Check selected fields..', function() {

  let fieldsList = [
      'username name.first created',
      {username:1, 'name.first': 1, 'name.last': 0, created: 1},
      '-password -emails -name.last',
      {password: 0, emails: 0, 'name.last': 0}
    ],
    userData = {
      username: 'foo',
      password: 'password',
      name: {first: 'family', last: 'given'},
      emails: ['foo@example.com']
    };

  fieldsList.forEach(function(fields, i) {
    it('should limit fields by plugin options (option:' + i + ')', function() {
      let schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect, fields);

      User = model(schema);
      user = new User(userData);

      // Check test
      const json = user.toJSON();
      json.should.have.property('username',userData.username);
      json.should.have.property('emails',null);
      json.should.have.property('name')
        .with.deep.property("first",userData.name.first);
      json.should.have.property('name')
        .with.deep.property("last",null);
      json.should.have.property('created').be.not.equal(null);
    });

    it('should limit fields by schema options (option:' + i + ')', function() {
      let schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect);
      schema.set('toJSON', {select: fields});

      User = model(schema);
      user = new User(userData);

      // Check test
      const json = user.toJSON();
      json.should.have.property('username',userData.username);
      json.should.have.property('emails',null);
      json.should.have.property('name')
        .with.deep.property("first",userData.name.first);
      json.should.have.property('name')
        .with.deep.property("last",null);
      json.should.have.property('created').be.not.equal(null);
    });

    it('should limit fields by toJSON options (option:' + i + ')', function() {
      let schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect);

      User = model(schema);
      user = new User(userData);

      // Check test
      const json = user.toJSON();
      json.should.have.property('username',userData.username);
      json.should.have.property('emails')
        .with.deep.property(0)
        .have.equal(userData.emails[0]);
      json.should.have.property('name')
        .with.deep.property("first",userData.name.first);
      json.should.have.property('name')
        .with.deep.property("last",userData.name.last);
      json.should.have.property('created').be.not.equal(null);
    });
  });

  it('exclude "_id", "id" and "__v" by default', function() {
    let schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, '-_id');

    User = model(schema);
    user = new User(userData);

    const json = user.toJSON();
    json.should.not.have.property('_id');
    json.should.not.have.property('id');
    json.should.not.have.property('__v');
  });

  it('include "_id", "id" and "__v", if it\'s necessary', function() {
    let schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, '_id');

    User = model(schema);
    user = new User(userData);

    const json = user.toJSON();
    json.should.have.property('_id');
  });

  it('should handle getters', function() {
    let schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, 'username name.full');
    schema.set('toJSON', {getters: true});
    schema.path('username').get(function(v) {
      return v && v.toUpperCase();
    });
    schema.virtual('name.full').get(function() {
      return [this.name.first, this.name.last].join(' ');
    });

    User = model(schema);
    user = new User(userData);

    const json = user.toJSON();
    json.should.have.property('username',user.username);
    json.should.have.property('name')
      .with.deep.property('full',user.name.full);
  });

  it('should call original toJSON', function() {
    let schema = userSchema(),
      username = 'xformed',
      User, user;

    schema.methods.toJSON = function(options) {
      return {username: username, bar: 'baz'};
    };
    schema.plugin(jsonSelect, 'username');

    User = model(schema);
    user = new User(userData);

    const json = user.toJSON();
    json.should.have.property('username',username);
  });

  describe('embeded documents', function() {
    it('should limit fields of embeded documents', function() {
      let schema = userSchema(),
        User, user, groupSchema, Group, group;

      User = model('User', schema);
      user = new User(userData);

      groupSchema = Schema({
        name: String,
        users: [schema]
      });
      groupSchema.plugin(jsonSelect, 'name users.username');
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      const json = group.toJSON();
      json.should.have.property('name',group.name);
      json.should.have.property('users')
        .with.deep.property(0)
        .with.deep.property('username',user.username);
    });

    it('should respect options of embeded documents', function() {
      let schema = userSchema(),
        User, user, groupSchema, Group, group;

      schema.plugin(jsonSelect, 'username');

      User = model('User', schema);
      user = new User(userData);

      groupSchema = Schema({
        name: String,
        users: [schema]
      });
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      const json = group.toJSON();
      json.should.have.property('name',group.name);
      json.should.have.property('_id');
      json.should.have.property('users')
        .with.deep.property(0)
        .with.deep.property('username',user.username);
    });
  });

  describe('populated documents', function() {
    it('should limit fields of subdocuments', function() {
      let schema = userSchema(),
        User, user, commentSchema, Comment, comment;

      User = model('User', schema);
      user = new User(userData);

      commentSchema = Schema({
        body: String,
        _user: {type: Schema.ObjectId, ref: 'User'}
      });
      commentSchema.plugin(jsonSelect, 'body _user.username');
      Comment = model('Comment', commentSchema);
      comment = new Comment({body: 'foo', _user: user});
      // emulate population
      comment.setValue('_user', user);

      const json = comment.toJSON();
      json.should.have.property('body',comment.body);
      json.should.not.have.property('_id');
      json.should.have.property('_user')
        .with.deep.property('username',user.username);
    });

    it('should respect options of subdocuments', function() {
      let schema = userSchema(),
        User, user, commentSchema, Comment, comment;

      schema.plugin(jsonSelect, 'username');

      User = model('User', schema);
      user = new User(userData);

      commentSchema = Schema({
        body: String,
        _user: {type: Schema.ObjectId, ref: 'User'}
      });
      Comment = model('Comment', commentSchema);
      comment = new Comment({body: 'foo', _user: user});
      // emulate population
      comment.setValue('_user', user);

      const json = comment.toJSON();
      json.should.have.property('body',comment.body);
      json.should.have.property('_id');
      json.should.have.property('_user')
        .with.deep.property('username',user.username);
    });
  });

  describe('select', function() {
    it('should be able to mix inclusion and exclusion', function() {
      let obj = {a: {b: 'foo', c: 'bar'}},
        data = jsonSelect.select(obj, 'a -a.b');
      data.should.to.eql({a: {b: null, c: null }});
    });

    it('should pick array with contents', function() {
      let obj = {a: ['foo', 'bar']},
        data;

      data = jsonSelect.select(obj, 'a');
      data.should.to.eql({a: ['foo', 'bar']});
    });

    // TODO
    // it('should pick only objects and arrays in a array', function() {
    //   let obj = {a: [
    //       {b: 'foo'}, {b:'bar', c: true}, [{b: 'baz'}],
    //       null, false, 1, 'str', new Date(), [], {}
    //     ]},
    //     data;
    //
    //   data = jsonSelect.select(obj, 'a.b');
    //   console.log(data);
    //   data.should.to.eql({a:[{b: 'foo'}, {b: 'bar', c: null }, [null], [], {}]});
    // });
    //
    // it('should omit values only from objects in a array', function() {
    //   let date = new Date(),
    //     obj = {a: [
    //       {b: 'foo'}, {b:'bar', c: true}, [{b: 'baz'}],
    //       null, false, 1, 'str', date, [], {}
    //     ]},
    //     data;
    //
    //   data = jsonSelect.select(obj, '-a.b');
    //   expect(data).to.eql({a:[{}, {c:true}, [{}], null, false, 1, 'str', date, [], {}]});
    // });
  });
});
