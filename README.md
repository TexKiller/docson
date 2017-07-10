#  Node-Docson

[![NPM version](https://img.shields.io/npm/v/node-docson.svg)](https://www.npmjs.com/package/node-docson) [![node](https://img.shields.io/node/v/gh-badges.svg)](http://nodejs.org/)

Documentation for your JSON types on Node.js.

Give Docson a JSON schema and it will generate a [beautiful documentation](http://lbovet.github.io/docson/index.html#/docson/examples/example.json).

## Features
* [JSON schema](http://json-schema.org/) v4 keywords.
* Runs on Node.js and in the browser.
* Render schema descriptions with markdown.

## Installation

`npm install node-docson`

## Usage

Example:

```js
var docson=require("node-docson")();

var schema={
  "title": "Example Schema",
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string"
    },
    "lastName": {
      "type": "string"
    },
    "age": {
      "description": "Age in years",
      "type": "integer",
      "minimum": 0
    }
  },
  "required": ["firstName", "lastName"]
};

var doc = docson.doc(schema);
fs.writeFileSync("./index.html", doc.documentElement.outerHTML);
```

## API

```javascript
docson.doc(schema, element, ref)
```

* `schema` is the URI or path to the schema or a string containing the schema source itself.
* `element` (optional) is the element which will host the documentation. Either a DOM element (id or object) or jQuery element.
* `ref` (optional) is an json-pointer path to a sub-schema.


## Limitations

* Mixing unrelated keywords can lead to unexpected results.

Not implemented:
* Non-primitive values in enums and default values
* dependencies, additionalItems, patternProperties

## Development

Please pull-request your failing schemas in the `tests/` folder and open an issue describing the expected result.
