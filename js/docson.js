
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
    var parent = element.parentElement.parentElement;
    if(element.getAttribute("expanded")) {
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
