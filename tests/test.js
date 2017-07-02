const jsdom = require("jsdom");
const JSDOM = jsdom.JSDOM;
var document = new JSDOM('<html><head><title>node-docson test</title><meta http-equiv="Content-Type" content="text/html;charset=UTF-8"></head></html>').window.document;
var docson = require("node-docson")(document);
var fs = require("fs");

var tests = ["invoice$Invoice", "enum", "schema", "additionalProperties", "address", "fstab", "basic", "not", "oneOf", "anyOf", "allOf", "example2", "properties", "ref"];

tests.forEach(function (test) {
  var block = document.body.appendChild(document.createElement("div"));
  var segments = test.split("$");
  var title = document.createElement("h2");
  title.textContent = segments[0];
  document.body.appendChild(title);
  document.body.appendChild(block);
  JSON.parse(fs.readFileSync("./" + segments[0] + ".json", "utf8")).forEach(function (item) {
    var element = document.createElement("div");
    block.appendChild(element);
    if (!item.schema.description) {
      item.schema.description = item.description;
    }
    docson.doc(element, item.schema, segments[1]);
  });
});

fs.writeFileSync("./test.html", document.documentElement.outerHTML, "utf8");