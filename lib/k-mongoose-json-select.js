'use strict';
let lodash = require('lodash'),
  mongoose = require('mongoose'),
  clone = require('clone'),
  _toJSON = mongoose.Document.prototype.toJSON,
  defaultExcludedFields = ['_id','id','__v'];


/**
 * Convert string formatted fields to object formatted ones
 *
 * @param fields
 * @returns {*}
 */
function normalizeFields(fields) {
  if (!fields) return;

  if (fields.constructor.name === 'Object') {
    return fields;
  } else if ('string' === typeof fields) {
    let _fields = {};

    fields.split(/\s+/).forEach(function(field) {
      if (!field) return;

      let include = +(field[0] !== '-');

      field = include ? field : field.substring(1);
      _fields[field] = include;
    });
    return _fields;
  }

  throw new TypeError('Invalid select fields. Must be a string or object.');
}

/**
 * Search if field in data belong to included fields
 *
 * @param search
 * @param fields
 * @returns {boolean}
 */
function searchInFields(search, fields) {
  if(!fields) return false;

  const find = lodash.find(Object.keys(fields), function(field) {
    return field === search;
  });

  return !!find;
}

/**
 * Include fields recursively
 *
 * @param data
 * @param fields
 */
function onlyInclude(data,fields) {
  if(!data) return;

  Object.keys(data).forEach(function(dataField) {
    if(!searchInFields(dataField,fields)){
      data[dataField] = null;
    }else {
      if (lodash.isArray(data[dataField])) {
        data[dataField].forEach(function (dataArray) {
          if(!lodash.isObject(dataArray))return;

          onlyInclude(dataArray, fields[dataField]);
        });
        return;
      }

      // With the default excluded fields
      // Avoid to iterate in _id (ObjectId)
      if (typeof data[dataField] === 'object' &&
        defaultExcludedFields.indexOf(dataField) === -1) {
        onlyInclude(data[dataField], fields[dataField]);
      }
    }
  });
}
/**
 * Only include the selected fields
 *
 * @param data
 * @param fields
 * @returns {*}
 */
function include(data, fields) {
  let _data = clone(data);
  onlyInclude(_data,fields);
  return _data;
}

/**
 * Exclude a value recursively
 *
 * @param data Data
 * @param field Value in data
 */
function excludeFields(data, field) {
  if (!data) return;

  if (lodash.isArray(data)) {
    data.forEach(function(_data) {
      excludeFields(_data, field);
    });
    return;
  }

  let _field = field[0];
  if (field.length > 1) {
    excludeFields(data[_field], field.slice(1));
    return;
  }

  if (data.constructor.name === 'Object') {
    defaultExcludedFields.indexOf(_field) !== -1 ? delete data[_field] : data[_field] = null;
  }
}

/**
 * Exclude the selected fields
 *
 * @param data
 * @param fields
 * @returns {*}
 */
function exclude(data, fields) {
  let _data = clone(data);

  fields.forEach(function(field) {
    excludeFields(_data, field.split('.'));
  });

  return _data;
}

/**
 * Processing included fields to correct format
 *
 * @param inclusiveFields
 * @returns {{}}
 */
function processInclusive(inclusiveFields){
  let data = {};

  // For each fields
  inclusiveFields.forEach(function (inclusive) {
    let parsedField = inclusive.split('.');
    let field = parsedField[0];
    if (parsedField.length > 1) {
      if(!data[field]){
        data[field] = {};
      }

      data[field][parsedField[1]] = 1;
      return;
    }

    data[field] = 1;
  });

  return data;
}

/**
 * Include/Exclude de selected fields in data
 *
 * @param data
 * @param fields
 * @returns {*}
 */
function select(data, fields) {
  if (!fields) return data;

  let inclusive = [],
    exclusive = [];

  fields = normalizeFields(fields);

  // Processing included/excluded fields
  Object.keys(fields).forEach(function(field) {
    (fields[field] ? inclusive : exclusive).push(field);
  });

  // Only include this fields
  data = inclusive.length ? include(data, processInclusive(inclusive)) : data;

  // Exclude this fields
  data = exclusive.length ? exclude(data, exclusive) : data;
  return data;
}

/**
 * If don't include, exclude _id,id and __v
 *
 * @param fields
 */
function setDefault(fields) {
  defaultExcludedFields.forEach(function(defaultField){
    if (defaultField in fields) return;
    fields[defaultField] = 0;
  });
}

exports = module.exports = function(schema, fields) {
  let methods = schema.methods,
    toJSON = methods.toJSON || _toJSON;

  // NOTE: toJSON calls toJSON with a same option recursively for all subdocuments.
  methods.toJSON = function(options) {
    let schemaOptions = this.schema.options.toJSON,
      _options = options || schemaOptions || {},
      _fields = (options || {}).select || (schemaOptions || {}).select || fields,
      obj;

    _options = clone(_options);

    if (!options) {
      // use default fields in all subdocuments.
      delete _options.select;
    } else if ('undefined' !== typeof options.select) {
      // fields are specified directly, then don't limit fields in all subdocuments.
      if (options.select) {
        // the route for an original document
        _options.select = null;
      } else {
        // the route for all subdocuments
        _fields = null;
      }
    }

    obj = toJSON.call(this, _options);
    if (!_fields) return obj;

    _fields = normalizeFields(_fields);
    setDefault(_fields);
    return select(obj, _fields);
  };
};

exports.select = select;