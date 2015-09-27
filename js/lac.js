'use strict';

const results = [
    'Incorrect file path',
    'Not a WAVE file',
    'WAVE Header RIFF Block: Bad ID',
    'WAVE Header RIFF Block: Bad Size',
    'WAVE Header RIFF Block: Bad Format',
    'WAVE Header FMT Block: Bad ID',
    'WAVE Header FMT Block: Bad Size',
    'WAVE Header FMT Block: Bad Format Code',
    'WAVE Header FMT Block: Bad ByteRate',
    'WAVE Header FMT Block: Bad BlockAlign',
    'WAVE Header FMT Block: Bad Bits/Sample',
    'WAVE Header FMT Block: Bad Extension Size',
    'WAVE Header EXTENSIBLE Block: Bad Size',
    'WAVE Header EXTENSIBLE Block: Bad Bits/Sample',
    'WAVE Header EXTENSIBLE Block: Bad Format Code',
    'WAVE Header EXTENSIBLE Block: Bad Channel Mask',
    'WAVE Header EXTENSIBLE Block: Bad GUID',
    'WAVE Header DATA Block: Bad ID',
    'WAVE Header DATA Block: Bad Size',
    'Clean',
    'Transcoded',
    'Upscaled',
    'Upsampled'
];
const finalError   = 18;
const path         = require('path');
const gui          = require('nw.gui');
const fs           = require('fs');
const appName      = gui.App.manifest.name + ' ' + gui.App.manifest.version;
var lastClick      = -1;
var headerDragging = false;
var tasksWatcher;

for (let i = 0, tmp, elements = document.getElementsByTagName('*'), length = elements.length; i != length; i++) {
    tmp = elements[i].id;
    if (tmp != '')
        window[tmp] = document.getElementById(tmp);
}

window.addEventListener('load', function() {
    document.title = appName;

    let maxThreads = require('os').cpus().length;
    for (let i = maxThreads; i != 0; i--) {
        let li       = document.createElement('li');
        li.innerHTML = '<input type="button" value="' + i + '">';
        li.addEventListener('click', (function(_i) {
            return function() {
                threads.value = 'Threads: ' + _i;
                tasksWatcher.updateThreads(_i);
            };
        })(i), false);
        threadlist.appendChild(li);
    }

    if (maxThreads != 1)
        maxThreads--;
    threads.value  = 'Threads: ' + maxThreads;
    tasksWatcher   = new TasksWatcher(
        maxThreads,
        path.resolve(process.cwd(), 'LAC'),
        'path',
        function(data, UIindex) {
            let progress = document.getElementById('progress' + UIindex);
            if (progress == null)
                document.getElementById('result' + UIindex).innerHTML = '<div class="progress"><span class="progress-bar"><span id="progress' + UIindex + '"class="progress-in" style="width: ' + data.length * 2 + '%"></span></span></div>';
            else progress.style.width = (parseInt(progress.style.width.split('%')[0]) + data.length * 2) + '%';
        },
        function(code, UIindex) {
            let tr                        = document.getElementById(UIindex);
            let result                    = results[code];
            tr.className                  = code > finalError ? result.toLowerCase() : 'error';
            tr.lastElementChild.innerHTML = result;

            let active = filter.getElementsByClassName('active')[0].id;
            if (active != 'checked' && active != tr.className)
                tr.hidden = true;
            let badge          = document.getElementById(tr.className + 'h');
            badge.innerHTML    = (parseInt(badge.innerHTML) + 1);
            checkedh.innerHTML = (parseInt(checkedh.innerHTML) + 1);
        }
    );
}, false);

folder.addEventListener('click', function() {
    folderh.click();
}, false);

files.addEventListener('click', function() {
    filesh.click();
}, false);

folderh.addEventListener('change', function(e) {
    let acceptedFiles = [];
    parseFiles(e.target.files[0].path.replace(/\\/, '/'), acceptedFiles);

    e.target.value = '';
    checkFiles(acceptedFiles);
}, false);

filesh.addEventListener('change', function(e) {
    let acceptedFiles = [];
    let files         = e.target.files;
    for (let i = 0, filesLength = files.length; i != filesLength; i++) {
        if (files[i].name.toLowerCase().match(/.wav$/))
            acceptedFiles.push(files[i].path);
    }

    e.target.value = '';
    checkFiles(acceptedFiles);
}, false);

window.addEventListener('dragover', preventEvent, false);
window.addEventListener('drop', preventEvent , false);

function preventEvent(e) {
    if (!headerDragging)
        e.preventDefault();
}

welcome.addEventListener('dragover', dragOverEvent, false);
container.addEventListener('dragover', dragOverEvent, false);

function dragOverEvent() {
    if (!headerDragging)
        this.className = 'dragover';
}

welcome.addEventListener('dragleave', dragLeaveEvent, false);
container.addEventListener('dragleave', dragLeaveEvent, false);

function dragLeaveEvent() {
    if (!headerDragging)
        this.className = '';
}

welcome.addEventListener('drop', dropEvent, false);
container.addEventListener('drop', dropEvent, false);

function dropEvent(e) {
    if (!headerDragging) {
        e.preventDefault();

        let acceptedFiles = [];
        let files         = e.dataTransfer.files;
        let tmpPath;
        for (let i = 0, file; file = files[i]; i++) {
            tmpPath = file.path;
            if (fs.statSync(tmpPath).isDirectory())
                parseFiles(tmpPath, acceptedFiles);
            else if (file.name.toLowerCase().match(/.wav$/))
                acceptedFiles.push(tmpPath);
        }

        this.className = '';
        checkFiles(acceptedFiles);
    }
}

window.addEventListener('resize', function(e) {
    resize((window.innerWidth - 17) * 0.7 + 30);
}, false);

resizer.addEventListener('dragstart', function(e) {
    headerDragging = true;
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('Text', '');
}, false);

resizer.addEventListener('drag', function(e) {
    resize(e.screenX - window.screenX);
}, false);

resizer.addEventListener('dragend', function(e) {
    resize(e.screenX - window.screenX);
    headerDragging = false;
}, false);

function resize(value) {
    value = Math.round(value);
    if (value > window.innerWidth - 20 - 37 || value < 30 + 20 + 18)
        return;
    resizerstyle.innerHTML = resizerstyle.innerHTML.replace(/width: [^;]+/g, 'width: ' + (value - 30 - 20) + 'px').replace(/left: [^;]+/, 'left: ' + (value + 1) + 'px');
}

function parseFiles(directory, acceptedFiles) {
    let files  = fs.readdirSync(directory);
    let length = files.length;
    let tmpPath;
    for (let i = 0; i != length; i++) {
        tmpPath = path.resolve(directory, files[i]);
        if (fs.statSync(tmpPath).isDirectory())
            parseFiles(tmpPath, acceptedFiles);
        else if (files[i].toLowerCase().match(/.wav$/))
            acceptedFiles.push(tmpPath);
    }
}

function changeCheckedValue(start, end, value) {
    let children = list.children;
    let length   = children.length;
    let i;
    for (i = 0; i != length && children[i].id != start; i++) ;
    for ( ; i != length && children[i].id != end; i++) {
        if (!children[i].hidden)
            children[i].firstElementChild.firstElementChild.checked = value;
    }
}

function checkFiles(acceptedFiles) {
    let length = acceptedFiles.length;
    if (length == 0)
        return;

    if (welcome.parentElement == page) {
        page.removeChild(welcome);
        header.hidden    = false;
        container.hidden = false;
        filter.hidden    = false;
    }

    let i, tr;
    for (i = 0; i != length; i++) {
        tasksWatcher.addTask({ 'path': acceptedFiles[i] }, function(UIindex) {
            tr           = document.createElement('tr');
            tr.id        = UIindex;
            tr.innerHTML = '<td><input id="check' + UIindex + '" type="checkbox"' + (checkall.checked ? ' checked' : '') + '></td><td>' + acceptedFiles[i] + '</td><td id="result' + UIindex + '"></td>';
            tr.firstElementChild.firstElementChild.addEventListener('click', function(e) {
                let value       = e.target.checked;
                let lastElement = document.getElementById(lastClick);
                if (e.shiftKey && lastElement != null) {
                    let lastValue = lastElement.checked;
                    if (lastValue == value) {
                        let id     = parseInt(e.target.id.split('check')[1]);
                        let lastId = parseInt(lastElement.id.split('check')[1]);
                        if (lastId < id)
                            changeCheckedValue(lastId + 1, id, value);
                        else changeCheckedValue(id + 1, lastId, value);
                    }
                }
                lastClick = e.target.id;

                reflectChanged(e);
            }, false);
            tr.firstElementChild.firstElementChild.addEventListener('change', reflectChanged, false);
            list.appendChild(tr);
        });
    }
}

function reflectChanged(e) {
    let checked = checkall.checked;
    let value   = e.target.checked;

    if (value == checked) { // value = false
        let children = list.children;
        let length   = children.length;
        let i;
        for (i = 0; i != length && !children[i].firstElementChild.firstElementChild.checked; i++) ;
        if (i == length)
            remove.disabled = true;
    }
    else if (value) {
        remove.disabled = false;

        let children = list.children;
        let length   = children.length;
        let i;
        for (i = 0; i != length && children[i].firstElementChild.firstElementChild.checked; i++) ;
        if (i == length)
            checkall.checked = true;
    }
    else checkall.checked = false;
}

remove.addEventListener('click', function() {
    let children = list.children;
    for (let i = children.length - 1; i != -1; i--) {
        if (children[i].firstElementChild.firstElementChild.checked) {
            tasksWatcher.removeTask(children[i].id);
            if (children[i].className != '') {
                let badge          = document.getElementById(children[i].className + 'h');
                badge.innerHTML    = (parseInt(badge.innerHTML) - 1);
                checkedh.innerHTML = (parseInt(checkedh.innerHTML) - 1);
            }
            list.removeChild(children[i]);
        }
    }
    if (checkall.checked) {
        header.hidden    = true;
        container.hidden = true;
        filter.hidden    = true;
        page.appendChild(welcome);
    }
    checkall.checked = false;
    remove.disabled  = true;
}, false);

checkall.addEventListener('change', function(e) {
    let checked  = e.target.checked;
    let children = list.children;
    let length   = children.length;
    for (let i = 0; i != length; i++)
        children[i].firstElementChild.firstElementChild.checked = checked;
    remove.disabled = !checked;
}, false);

pause.addEventListener('click', function(e) {
    let element = e.target;
    if (element.value == 'Pause') {
        tasksWatcher.pauseTasks();
        element.value = 'Resume';
    }
    else {
        tasksWatcher.resumeTasks();
        element.value = 'Pause';
    }
}, false);

checked.addEventListener('click', filterList, false);
clean.addEventListener('click', filterList, false);
transcoded.addEventListener('click', filterList, false);
upscaled.addEventListener('click', filterList, false);
upsampled.addEventListener('click', filterList, false);
error.addEventListener('click', filterList, false);

function filterList(e) {
    let filterElement                                    = e.currentTarget;
    let filterElementId                                  = filterElement.id;
    let children                                         = list.children;
    let length                                           = children.length;
    filter.getElementsByClassName('active')[0].className = '';
    filterElement.className                              = 'active';
    if (filterElementId == 'checked') {
        checkall.hidden = false;
        for (let i = 0; i != length; i++)
            children[i].hidden = false;
    }
    else {
        checkall.hidden = true;
        let className;
        for (let i = 0; i != length; i++) {
            className          = children[i].className;
            children[i].hidden = className != '' && className != filterElementId;
        }
    }
}

savelog.addEventListener('click', function() {
    let a        = document.createElement('a');
    let log      = appName + ' logfile from ' + (new Date).toGMTString();
    let children = list.children;
    let length   = children.length;
    let i;
    for (i = 0; i != length; i++)
        log += '\r\n\r\nFile:   ' + children[i].children[1].innerText + '\r\nResult: ' + children[i].lastElementChild.innerText;

    children = filter.firstElementChild.children;
    length   = children.length;
    log     += '\r\n\r\n' + children[0].firstElementChild.innerText.replace(/([0-9]+)$/, ': $1');
    for (i = 1; i != length; i++)
        log += ' | ' + children[i].firstElementChild.innerText.replace(/([0-9]+)$/, ': $1');

    a.href     = window.URL.createObjectURL(new Blob([log + '\r\n'], { 'type': 'application/octet-stream' }));
    a.download = appName + '.log';
    a.click();
    window.URL.revokeObjectURL(a.href);
}, false);

website.addEventListener('click', function() {
    gui.Shell.openExternal('http://losslessaudiochecker.com');
});
