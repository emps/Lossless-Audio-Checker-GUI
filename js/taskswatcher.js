'use strict';

const spawn = require('child_process').spawn;

class TasksWatcher {
    constructor(maxThreads, executable, onData, onClose) {
        this.paused         = false;
        this.queue          = [];
        this.threads        = {};
        this.currentTask    = -1;
        this.lastUIindex    = -1;
        this.lastThread     = -1;
        this.tasksDone      = 0;
        this.executable     = executable;
        this.onData         = onData;
        this.onClose        = onClose;
        this.updateThreads(maxThreads);
    }
    updateThreads(maxThreads) {
        this.maxThreads = maxThreads;
        let length      = Object.keys(this.threads).length;
        if (maxThreads == length)
            return;
        if (maxThreads < length) {
            for (let thread in this.threads) {
                if (this.threads[thread] == null) {
                    delete this.threads[thread];
                    length--;
                    if (maxThreads == length)
                        break;
                }
            }
        }
        else {
            maxThreads = ++this.lastThread + maxThreads - length;
            let string;
            for ( ; this.lastThread != maxThreads; this.lastThread++) {
                string               = this.lastThread.toString();
                this.threads[string] = null;
                if (!this.paused && this.currentTask != this.queue.length - 1)
                    this.doTask(string, this.queue[++this.currentTask]);
            }
        }
    }
    doTask(thread, object) {
        object['status']     = thread;
        this.threads[thread] = spawn(this.executable, [object['path']]);
        this.threads[thread].stdout.on('data', (function (obj) {
            return function (data) {
                obj.onData(data, object['UIindex']);
            };
        })(this));
        this.threads[thread].on('close', (function (obj) {
            return function (code) {
                if (!this.killed) {
                    object['status'] = 'done';
                    obj.tasksDone++;
                    obj.onClose(code, object['UIindex'], obj.getProgress());
                }

                if (Object.keys(obj.threads).length > obj.maxThreads) {
                    delete obj.threads[thread];
                    return;
                }
                if (!obj.paused && obj.currentTask != obj.queue.length - 1)
                    obj.doTask(thread, obj.queue[++obj.currentTask]);
                else obj.threads[thread] = null;
            };
        })(this));
    }
    addTask(path, callback) {
        this.queue.push({ 'path': path, 'UIindex': ++this.lastUIindex });
        callback(this.lastUIindex, this.getProgress());

        if (!this.paused) {
            for (let thread in this.threads) {
                if (this.threads[thread] == null) {
                    this.doTask(thread, this.queue[++this.currentTask]);
                    break;
                }
            }
        }
    }
    removeTask(UIindex, callback) {
        let i, length;
        for (i = 0, length = this.queue.length; i != length && this.queue[i]['UIindex'] != UIindex; i++) ;
        if (i == length)
            return;
        if (this.threads[this.queue[i]['status']]) {
            this.currentTask--;
            this.threads[this.queue[i]['status']].kill();
        }
        else if (this.queue[i]['status'] == 'done') {
            this.currentTask--;
            this.tasksDone--;
        }
        this.queue.splice(i, 1);
        callback(this.getProgress());
    }
    pauseTasks() {
        this.paused = true;
    }
    resumeTasks() {
        this.paused = false;
        for (let thread in this.threads) {
            if (this.threads[thread] == null && this.currentTask != this.queue.length - 1)
                this.doTask(thread, this.queue[++this.currentTask]);
        }
    }
    isIdle() {
        for (let thread in this.threads) {
            if (this.threads[thread] != null)
                return false;
        }
        return true;
    }
    getProgress() {
        return this.queue.length == 0 ? -1 : this.tasksDone / this.queue.length;
    }
}
