var docson = require("node-docson")();
var fs = require("fs");

var schema = {
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