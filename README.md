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

var element = docson.doc(schema);
fs.writeFileSync("./index.html", element.ownerDocument.documentElement.outerHTML);
```

## API

```javascript
var docson = require("node-docson")(opt);
```

* `opt` (optional) is an object holding the following properties. If not set, the default values for each property will be used.
* `opt.document` (optional) specifies the document node that will hold the documentation. If not set, [JSDOM](https://github.com/tmpvar/jsdom) will be used to create one on Node, and the global `document` variable will be used on the browser.
* `opt.$` (optional) specifies the [jQuery](https://github.com/jquery/jquery) instance. If not set, an instance will be created using `require('jquery')(opt.document.defaultView)` on Node, and the global `$` variable will be used on the browser.

```javascript
var returnedElement = docson.doc(schema, element, ref);
```

* `schema` is the URI or path to the schema or a string containing the schema source itself.
* `element` (optional) is the element which will host the documentation. Either a DOM element (id or object) or jQuery element.
* `ref` (optional) is an json-pointer path to a sub-schema.

* `returnedElement` is the DOM element that holds the documentation for the specified schema, or `null` on failure.


## Limitations

* Mixing unrelated keywords can lead to unexpected results.

Not implemented:
* Non-primitive values in enums and default values
* dependencies, additionalItems, patternProperties

## Development

Please pull-request your failing schemas in the `tests/` folder and open an issue describing the expected result.
