/*
 * Copyright 2013 Laurent Bovet <laurent.bovet@windmaster.ch>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
module.exports = function (doc, jQuery) {
    if (!doc) {
        doc = document;
    }
    if (!jQuery) {
        jQuery = $;
    }
    if (doc && doc.defaultView && jQuery) {
        var docson = docson || {};
        var window = doc.defaultView;

        var Handlebars=require("handlebars");
        var highlight=require("highlight.js").Highlight;
        var jsonpointer=require("jsonpointer.js");
        var marked=require("marked");
        var traverse=require("traverse");
        var fs=require("fs");

        var ready = jQuery.Deferred();
        var boxTemplate;
        var signatureTemplate;
        var source;
        var stack = [];
        var boxes=[];

        var style=doc.createElement("style");
        style.textContent=fs.readFileSync(__dirname+"/css/docson.css","utf8");
        doc.head.appendChild(style);

        Handlebars.registerHelper('scope', function(schema, options) {
            var result;
            boxes.push([]);
            if(schema && (schema.id || schema.root)) {
                stack.push( schema );
                result = options.fn(this);
                stack.pop();
            } else {
                result = options.fn(this);
            }
            boxes.pop();
            return result;
        });

        Handlebars.registerHelper('source', function(schema) {
            delete schema.root;
            delete schema.__boxId;
            delete schema.__name;
            delete schema.__ref;
            return JSON.stringify(schema, null, 2);
        });

        Handlebars.registerHelper('desc', function(schema) {
            var description = schema.description;

            if( !description ) return "";
            var text = description;
            if(marked) {
                marked.setOptions({gfm: true, breaks: true})
                return new Handlebars.SafeString(marked(text));
            } else {
                return text;
            }
        });

        Handlebars.registerHelper('equals', function(lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equals needs 2 parameters");
            if( lvalue!=rvalue ) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        });

        Handlebars.registerHelper('contains', function(arr, item, options) {;
            if(arr && arr instanceof Array && arr.indexOf(item) != -1) {
                return options.fn(this);
            }
        });

        Handlebars.registerHelper('primitive', function(schema, options) {
            if(schema.type && schema.type != "object" && schema.type != "array" || schema.enum) {
                return withType(this, options, true)
            }
        });

        Handlebars.registerHelper('exists', function(value, options) {
            if(value !== undefined) {
                value = value === null ? "null": value;
                value = value === true ? "true": value;
                value = value === false ? "false": value;
                value = typeof value === "object" ? JSON.stringify(value): value;
                this.__default = value;
                var result = options.fn(this);
                delete this.__default;
                return result;
            }
        });

        Handlebars.registerHelper('range', function(from, to, replFrom, replTo, exclFrom, exclTo, sep) {
            var result = "";
            if(from !== undefined || to !== undefined) {
                result += exclFrom ? "]" : "[";
                result += from !== undefined ? from : replFrom;
                if( (from || replFrom) !== (to || replTo)) {
                    result += (from !== undefined || replFrom !== null) && (to !== undefined || replTo !== null) ? sep : "";
                    result += to !== undefined ? to : replTo;
                }
                result += exclTo ? "[" : "]";
                return result;
            }
        });

        var sub = function(schema) {
            return schema.type == "array" || schema.allOf || schema.anyOf || schema.oneOf || schema.not;
        }

        Handlebars.registerHelper('sub', function(schema, options) {
            if(sub(schema) || (schema.type && schema.type != "object" && schema.type != "array") || schema.enum) {
                return options.fn(this);
            }
        });

        Handlebars.registerHelper('main', function(schema, options) {
            if(!sub(schema)) {
                return options.fn(this);
            }
        });

        var simpleSchema = function(schema) {
            var result = schema.description===undefined && schema.title===undefined && schema.id===undefined;
            result &= schema.properties===undefined;
            return result;
        };

        Handlebars.registerHelper('simple', function(schema, options) {
            if(simpleSchema(schema) && !schema.$ref) {
                return withType(schema, options, true);
            }
        });

        var withType = function(schema, options, hideAny) {
            schema.__type = schema.type;
            if(!schema.type && !hideAny) {
                schema.__type="any";
            }
            if(schema.format) {
                schema.__type=schema.format;
            }
            if( (schema.__type == "any" || schema.__type == "object") && schema.title) {
                schema.__type = schema.title;
            }
            var result = options.fn(schema);
            delete schema.__type;
            return result;
        }

        Handlebars.registerHelper('complex', function(schema, options) {
            if(!simpleSchema(schema) && !schema.$ref && !schema.__blank || schema.properties) {
                return withType(schema, options);
            }
        });

        Handlebars.registerHelper('enum', function(schema) {
            if(schema.enum) {
                return (schema.enum.length > 1) ? "enum": "constant";
            }
        });

        Handlebars.registerHelper('obj', function(schema, options) {
            if(schema.properties || schema.type == "object") {
                return withType(schema, options);
            }
        });

        var pushBox = function(schema) {
            boxes[boxes.length-1].push(schema);
        }

        Handlebars.registerHelper('box', function(schema, options) {
            if(schema) {
                pushBox(schema);
                return options.fn(schema);
            }
        });

        Handlebars.registerHelper('boxId', function() {
            return boxes[boxes.length-1].length
        });

        Handlebars.registerHelper('boxes', function(options) {
            var result="";
            jQuery.each(boxes[boxes.length-1], function(k, box) {
                box.__boxId = k+1;
                result=result+options.fn(box);
            });
            boxes[boxes.length-1] = []
            return result;
        });

        var resolveIdRef = function(ref) {
            if(stack) {
                var i;
                for(i=stack.length-1; i>=0; i--) {
                    if(stack[i][ref]) {
                        return stack[i][ref];
                    }
                }
            }
            return null;
        }

        var resolvePointerRef = function(ref) {
            var root = stack[1];
            if(ref=="#") {
                return root;
            }
            try {
                return jsonpointer.get(stack[1], ref);
            } catch(e) {
                console.log(e);
                return null;
            }
        }

        var resolveRef = function(ref) {
            if(ref.indexOf("#") == 0) {
                return resolvePointerRef(ref);
            } else {
                if(ref.indexOf("http") == 0) {
                    var value = resolveIdRef(ref);
                    if (!value) {
                        var request = require('sync-request');
                        var res = request('GET', ref);
                        value = JSON.parse(res.getBody());
                        stack[1][ref] = value;
                    }
                    return value;
                } else {
                    return resolveIdRef(ref);
                }
            }
        }

        var getName = function(schema) {
            if(!schema) {
                return "<error>";
            }
            var name = schema.title;
            name = !name && schema.id ? schema.id: name;
            name = !name ? schema.__name: name;
            return name;
        }

        Handlebars.registerHelper('name', function(schema, options) {
            schema.__name = getName(schema);
            if(schema.__name) {
                return options.fn(schema);
            }
        });

        var refName = function(ref) {
            var name = getName(resolveRef(ref));
            if(!name) {
                if(ref == "#") {
                    name = "<root>";
                } else {
                    name = ref.replace("#", "/")
                }
            }
            var segments = name.split("/");
            name = segments[segments.length-1];
            return name;
        }

        function renderSchema(schema) {
            if(stack.indexOf(schema) == -1) { // avoid recursion
                stack.push(schema);
                var ret = new Handlebars.SafeString(boxTemplate(schema));
                stack.pop();
                return ret;
            } else {
                return new Handlebars.SafeString(boxTemplate({"description": "_circular reference_"}));
            }
        }

        Handlebars.registerHelper('ref', function(schema, options) {
            if(schema.$ref) {
                var target = resolveRef(schema.$ref);
                if(target) {
                    target.__name = refName(schema.$ref);
                    target.__ref = schema.$ref.replace("#", "");
                }
                var result;
                if(target) {
                    result = options.fn(target);
                } else {
                    result = new Handlebars.SafeString("<span class='signature-type-ref'>"+schema.$ref+"</span>");
                }
                if(target) {
                    delete target.__ref;
                }
                return result;
            }
        });

        Handlebars.registerHelper('schema', function(schema) {
            return renderSchema(schema);
        });

        Handlebars.registerHelper('signature', function(schema, keyword, schemas) {
            if(!schemas) {
                schemas = []
            }
            schemas = schemas instanceof Array ? schemas : [schemas];
            return new Handlebars.SafeString(signatureTemplate({ schema: schema, keyword: keyword, schemas: schemas}));
        });

        Handlebars.registerHelper('l', function(context) {
            console.log(context);
        });

        /* CUSTOM START */
        Handlebars.registerHelper('pill', function(schema, options) {;
            if(schema.__blank && schema.title) {
                return options.fn(this);
            }
        });

        Handlebars.registerHelper('mini', function(val, options) {;
            if(val) {
                return options.fn(this);
            }
        });

        Handlebars.registerHelper('container', function(schema, useResolved) {
            if (useResolved && schema.__resolved) {
                return new Handlebars.SafeString(containerTemplate(schema.__resolved));
            } else {
                return new Handlebars.SafeString(containerTemplate(schema));
            }
        });

        var miniCount = 0;
        function miniSchema(obj) {
            mini = {};
            obj = obj || {};
            mini.properties = obj.properties || {};
            mini.required = obj.required || [];
            mini.__mini = true;
            mini.id = '__mini-' + (miniCount++);
            return mini;
        };

        function merge(combined, adding) {
            combined = miniSchema(combined);
            adding = miniSchema(adding);

            for (var i in adding.properties) {
                combined.properties[i] = adding.properties[i];
            }
            adding.required.forEach(function(req) {
                if (combined.required.indexOf(req) === -1) {
                    combined.required.push(req);
                }
            });

            return combined;
        };

        function isMergeable(schema) {
            return schema.type === 'object';
        }

        //Combine this schema with the resolved schemas for each of its "allOf" children
        function resolve(schema) {
            if (schema.__resolved) {
                return;
            } else if (schema.$ref) {
                resolve(resolveRef(schema.$ref));
                return;
            } else {
                var resolved = miniSchema();
                var allOf = (schema.allOf || [])
                    .map(function(subSchema) {
                        var schemaObj = subSchema.$ref ? resolveRef(subSchema.$ref) : subSchema;
                        if (isMergeable(schemaObj)) {
                            resolved = merge(resolved, schemaObj.__resolved || {});
                        }
                        if (subSchema.$ref) {
                            return {
                                __blank: true,
                                type: "object",
                                title: schemaObj.title
                            };
                        }
                    })
                    .filter(function(val) {
                        return !!val;
                    });

                if (isMergeable(schema)) {
                    resolved = merge(resolved, schema);
                }

                //Swap out the original values for new ones, but keep them stored just in case we need them
                schema.__original = {
                    allOf: schema.allOf,
                    properties: schema.properties,
                    required: schema.required
                };
                schema.properties = resolved.properties;
                schema.required = resolved.required;
                schema.allOf = allOf.length ? allOf : undefined;
                schema.__resolved = resolved;
            }
        };

        function walk(schema) {
            if (schema) {
                if (schema.__resolved) {
                    return schema;
                } else if (schema.$ref) {
                    walk(resolveRef(schema.$ref));
                    return schema;
                } else if (isMergeable(schema)) {

                    //Make our own resolution
                    resolve(schema);

                    //Iterate through all schema-combining arrays
                    ['allOf', 'anyOf', 'oneOf', 'not'].forEach(function(combiner) {
                        (schema[combiner] || []).forEach(function(sub) {
                            walk(sub);
                        });
                    });

                    //Iterate through the properties object, resolving any child schemas
                    Object.keys(schema.properties || {}).forEach(function(key) {
                        walk(schema.properties[key]);
                    });
                }
                return schema;
            }
        };

        function prerender(schema) {
            var walked;
            stack.push(schema);
            walked = walk(schema);
            console.log('Pre-processed schema: ');
            console.log(walked);
            stack.pop();
            return walked;
        }
        /* CUSTOM END */

        function init() {
            boxTemplate=Handlebars.compile(fs.readFileSync(__dirname+"/templates/box.html","utf8"));
            containerTemplate=Handlebars.compile(fs.readFileSync(__dirname+"/templates/container.html","utf8"));
            signatureTemplate=Handlebars.compile(fs.readFileSync(__dirname+"/templates/signature.html","utf8"));
            ready.resolve();
        }

        docson.doc = function(element, schema, ref, baseUrl) {
            if (schema) {
                var d = jQuery.Deferred();
                if(baseUrl === undefined) baseUrl='';
                init();
                ready.done(function() {
                    if (!element) {
                        element=doc.createElement("DIV");
                        doc.body.appendChild(element);
                    } else {
                        if (typeof element == "string") {
                            element='#'+element;
                        }
                    }
                    element=jQuery(element);
                    console.log(element.get(0));
                    if(typeof schema == "string") {
                        schema = JSON.parse(schema);
                    }

                    var refsPromise = jQuery.Deferred().resolve().promise();
                    var refs = {};


                    var renderBox = function() {
                        stack.push(refs);
                        var target = schema;
                        if(ref) {
                            ref = ref[0] !== '/' ? '/'+ref : ref;
                            target = jsonpointer.get(schema, ref);
                            stack.push( schema );
                        }
                        target.root = true;
                        target.__ref = "<root>";
                        prerender(target);
                        var html = boxTemplate(target);

                        if(ref) {
                            stack.pop();
                        }
                        stack.pop();

                        element.addClass("docson").html(html);

                        var resizeHandler = element.get(0).onresize;
                        function resized() {
                            if(resizeHandler) {
                                var box = element.find(".box").first();
                                element.get(0).onresize(box.outerWidth(), box.outerHeight());
                            }
                        }
                        element.get(0).resized = resized;
                        resized();

                        if(highlight) {
                            element.find(".json-schema").each(function(k, schemaElement) {
                                highlight.highlightSchema(schemaElement);
                            });
                        }
                        element.find(".box-title").each(function() {
                            var ref = jQuery(this).attr("ref");
                            if(ref) {
                                if(window.location.href.indexOf("docson/index.html") > -1) {
                                    jQuery(this).find(".box-name").css("cursor", "pointer").attr("title", "Open in new window")
                                    .hover(
                                        function(){ jQuery(this).addClass('link') },
                                        function(){ jQuery(this).removeClass('link') })
                                    .click(function() {
                                            var url = window.location.href+"$$expand";
                                            if(ref !=="<root>") {
                                            url = url.replace(/(docson\/index.html#[^\$]*).*/, "$1$"+ref+"$$expand");
                                            }
                                            var w;
                                            function receiveMessage(event) {
                                            if (event.data.id && event.data.id == "docson" && event.data.action == "ready") {
                                                w.postMessage({ id: "docson", action: "load", definitions: schema, type: event.data.url.split("$")[1], expand: true}, "*");
                                            }
                                            }
                                            window.addEventListener("message", receiveMessage, false);
                                            w = window.open(url, "_blank");
                                    });
                                }
                            }
                        });
                        if (!doc.getElementById('docson-js')) {
                            var script = doc.createElement("SCRIPT");
                            script.id = 'docson-js';
                            script.type = 'text/javascript';
                            script.innerHTML = `
        function getByClass(element, className, callback) {
            var elements = element.getElementsByClassName(className);
            for (var e = 0; e < elements.length; ++e) {
                callback(elements[e]);
            }
        }

        function deSelect() {
            getByClass(document, 'box-selected', function (selected) {
                if (selected) {
                    selected.className = selected.className.replace(' box-selected', '');
                }
            });
        }

        function displayButtons(element, display) {
            element.getElementsByClassName('source-button')[0].style.display = display;
            element.getElementsByClassName('expand-button')[0].style.display = display;
        }

        function toggleClass(element, cssClass) {
            if (element.className.indexOf(cssClass) > -1) {
                element.className = element.className.replace(cssClass, "");
            } else {
                element.className += " " + cssClass;
            }
        }

        function toggleDisplay(element) {
            var display = element.currentStyle ? element.currentStyle.display : getComputedStyle(element, null).display;
            if (display == '' || display == 'block') {
                element.style.display = 'none';
            } else {
                element.style.display = 'block';
            }
        }

        function expand(element) {
            var boxId = element.getAttribute("boxid");
            toggleClass(element, "signature-type-expanded");
            var bc = element.parentElement.parentElement.parentElement.getElementsByClassName("signature-box-container")[0];
            var boxes = bc.children;
            for (var b = 0; b < boxes.length; ++b) {
                if (boxes[b].getAttribute("boxid") == boxId) {
                    toggleDisplay(boxes[b]);
                    break;
                }
            }
        }

        function setDisplay(element, display) {
            element.style.display = display;
        }

        function setClass(element, className, remove) {
            if (!remove) {
                if (element.className.indexOf(className) == -1) {
                    element.className += " " + className;
                }
            } else {
                if (element.className.indexOf(className) > -1) {
                    element.className = element.className.replace(className, "");
                }
            }
        }

        function expandButton(element) {
            if(element.getAttribute("expanded")) {
                var parent = element.parentElement.parentElement;
                getByClass(parent, "expand-button", function (eb) {
                    eb.innerHTML = " + ";
                    eb.setAttribute("title", "Expand all");
                });
                getByClass(parent, "signature-type-expandable", function (ste) {
                    setClass(ste, "signature-type-expanded", true);
                });
                getByClass(parent, "box-container", function (ste) {
                    setDisplay(ste, 'none');
                });
                element.removeAttribute("expanded");
            } else {
                var parent = element.parentElement.parentElement;
                getByClass(parent, "expand-button", function (eb) {
                    eb.innerHTML = " - ";
                    eb.setAttribute("title", "Collapse all");
                });
                getByClass(parent, "signature-type-expandable", function (ste) {
                    setClass(ste, "signature-type-expanded");
                });
                getByClass(parent, "box-container", function (ste) {
                    setDisplay(ste, 'block');
                });
                element.setAttribute("expanded", true);
            }
        }

        function sourceButton(element) {
            getByClass(element.parentElement, "box-body", function (bb) {
                toggleDisplay(bb);
            });
            getByClass(element.parentElement, "source", function (source) {
                toggleDisplay(source);
            });
        }
        `;
                            doc.getElementsByTagName('head')[0].appendChild(script);
                        }
                        element.find(".box").attr("onmousedown", "deSelect(); this.className += ' box-selected'; event.preventDefault(); return false;");
                        element.find("body").attr("onmousedown", "deSelect();");
                        element.find(".box").attr("onmouseenter", "displayButtons(this, 'block');");
                        element.find(".box").attr("onmouseleave", "displayButtons(this, 'none');");
                        element.find(".signature-type-expandable").attr("onclick", "expand(this);");
                        element.find(".expand-button").attr("onclick", "expandButton(this);");
                        element.find(".source-button").attr("onclick", "sourceButton(this);");
                    };

                    var resolveRefsReentrant = function(schema){
                        traverse(schema).forEach(function(item) {
                            // Fix Swagger weird generation for array.
                            if(item && item.$ref == "array") {
                                delete item.$ref;
                                item.type ="array";
                            }

                            // Fetch external schema
                            if(this.key === "$ref") {
                                var external = false;
                                //Local meaning local to this server, but not in this file.
                                var local = false;
                                if((/^https?:\/\//).test(item)) {
                                    external = true;
                                }
                                else if((/^[^#]/).test(item)) {
                                    local = true;
                                } else if(item.indexOf('#') > 0) {
                                    //Internal reference
                                    //Turning relative refs to absolute ones
                                    external = true;
                                    item = baseUrl + item;
                                    this.update(item);
                                }
                                if(external){
                                    //External reference, fetch it.
                                    var segments = item.split("#");
                                    refs[item] = null;
                                    var p = jQuery.get(segments[0]).then(function(content) {
                                        if(typeof content != "object") {
                                            try {
                                                content = JSON.parse(content);
                                            } catch(e) {
                                                console.error("Unable to parse "+segments[0], e);
                                            }
                                        }
                                        if(content) {
                                            refs[item] = content;
                                            renderBox();
                                            resolveRefsReentrant(content);
                                        }
                                    });
                                }
                                else if(local) {
                                    //Local to this server, fetch relative
                                    var segments = item.split("#");
                                    refs[item] = null;
                                    var p = jQuery.get(baseUrl + segments[0]).then(function(content) {
                                        if(typeof content != "object") {
                                            try {
                                                content = JSON.parse(content);
                                            } catch(e) {
                                                console.error("Unable to parse "+segments[0], e);
                                            }
                                        }
                                        if(content) {
                                            refs[item] = content;
                                            renderBox();
                                            resolveRefsReentrant(content);
                                        }
                                    });
                                }
                            }
                        });
                    };

                    resolveRefsReentrant(schema);
                    renderBox();

                    d.resolve();
                })
                d.promise();
            }
            return doc;
        }

        return docson;
    } else {
        return false;
    }
}
