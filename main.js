'use strict';

var obsidian = require('obsidian');

var TQ_PREFIX = 'TQ_';
var TQ_FIELDS = [
    'TQ_explain',
    'TQ_extra_instructions',
    'TQ_short_mode',
    'TQ_show_backlink',
    'TQ_show_cancelled_date',
    'TQ_show_created_date',
    'TQ_show_depends_on',
    'TQ_show_done_date',
    'TQ_show_due_date',
    'TQ_show_edit_button',
    'TQ_show_id',
    'TQ_show_on_completion',
    'TQ_show_postpone_button',
    'TQ_show_priority',
    'TQ_show_recurrence_rule',
    'TQ_show_scheduled_date',
    'TQ_show_start_date',
    'TQ_show_tags',
    'TQ_show_task_count',
    'TQ_show_toolbar',
    'TQ_show_tree',
    'TQ_show_urgency',
];

function isTqField(name) {
    return typeof name === 'string' && name.indexOf(TQ_PREFIX) === 0;
}

function cloneWithoutTqEntries(source) {
    if (!source || typeof source !== 'object') {
        return source;
    }
    var result = {};
    var keys = Object.keys(source);
    for (var i = 0; i < keys.length; i++) {
        if (!isTqField(keys[i])) {
            result[keys[i]] = source[keys[i]];
        }
    }
    return result;
}

class TasksNoTQ extends obsidian.Plugin {

    onload() {
        var self = this;
        console.log('[Tasks No TQ] Plugin loaded');

        this.patchMetadataTypeManager();

        this.app.workspace.onLayoutReady(function () {
            setTimeout(function () {
                console.log('[Tasks No TQ] Initial cleanup');
                self.removePersistedTqTypes();
            }, 1000);
        });

        this.registerInterval(
            window.setInterval(function () {
                self.removePersistedTqTypes();
            }, 30 * 1000)
        );

        this.addCommand({
            id: 'remove-tq-now',
            name: 'Remove TQ_* property types now',
            callback: function () {
                self.removePersistedTqTypes(true);
            },
        });
    }

    onunload() {
        this.restoreMetadataTypeManager();
        console.log('[Tasks No TQ] Plugin unloaded');
    }

    patchMetadataTypeManager() {
        var mgr = this.app.metadataTypeManager;
        if (!mgr || this._patchedManager) {
            return;
        }

        this._patchedManager = mgr;
        this._originalSetType = typeof mgr.setType === 'function' ? mgr.setType.bind(mgr) : null;
        this._originalGetAllProperties = typeof mgr.getAllProperties === 'function' ? mgr.getAllProperties.bind(mgr) : null;
        this._originalGetPropertyInfo = typeof mgr.getPropertyInfo === 'function' ? mgr.getPropertyInfo.bind(mgr) : null;

        if (this._originalSetType) {
            mgr.setType = function (name, type) {
                if (isTqField(name)) {
                    console.log('[Tasks No TQ] Blocked setType for ' + name);
                    return;
                }
                return this._originalSetType.apply(null, arguments);
            }.bind(this);
        }

        if (this._originalGetAllProperties) {
            mgr.getAllProperties = function () {
                var result = this._originalGetAllProperties.apply(null, arguments);
                return cloneWithoutTqEntries(result);
            }.bind(this);
        }

        if (this._originalGetPropertyInfo) {
            mgr.getPropertyInfo = function (name) {
                if (isTqField(name)) {
                    return void 0;
                }
                return this._originalGetPropertyInfo.apply(null, arguments);
            }.bind(this);
        }

        console.log('[Tasks No TQ] Patched metadataTypeManager safely');
    }

    restoreMetadataTypeManager() {
        var mgr = this._patchedManager;
        if (!mgr) {
            return;
        }

        if (this._originalSetType) {
            mgr.setType = this._originalSetType;
        }
        if (this._originalGetAllProperties) {
            mgr.getAllProperties = this._originalGetAllProperties;
        }
        if (this._originalGetPropertyInfo) {
            mgr.getPropertyInfo = this._originalGetPropertyInfo;
        }

        this._patchedManager = null;
        this._originalSetType = null;
        this._originalGetAllProperties = null;
        this._originalGetPropertyInfo = null;
    }

    removePersistedTqTypes(showNotice) {
        var mgr = this.app.metadataTypeManager;
        var removed = 0;

        if (mgr && typeof mgr.unsetType === 'function') {
            for (var i = 0; i < TQ_FIELDS.length; i++) {
                try {
                    mgr.unsetType(TQ_FIELDS[i]);
                    removed++;
                } catch (_) {}
            }
        }

        this.cleanTypesFile(showNotice, removed);
        return removed;
    }

    cleanTypesFile(showNotice, removedByApi) {
        var path = this.app.vault.configDir + '/types.json';
        var adapter = this.app.vault.adapter;

        adapter.exists(path).then(function (exists) {
            if (!exists) return;
            return adapter.read(path).then(function (raw) {
                var data;
                try { data = JSON.parse(raw); } catch (_) { return; }

                var changed = false;
                var keys = Object.keys(data);
                for (var i = 0; i < keys.length; i++) {
                    if (isTqField(keys[i])) {
                        delete data[keys[i]];
                        changed = true;
                    }
                }
                if (changed) {
                    console.log('[Tasks No TQ] Cleaning types.json on disk');
                    return adapter.write(path, JSON.stringify(data, null, '\t'));
                }
                return false;
            }).then(function () {
                if (showNotice) {
                    new obsidian.Notice(removedByApi > 0 ? '[Tasks No TQ] Cleanup finished' : '[Tasks No TQ] No persisted TQ_* entries found');
                }
            });
        }).catch(function (e) {
            console.error('[Tasks No TQ] types.json cleanup error:', e);
            if (showNotice) {
                new obsidian.Notice('[Tasks No TQ] Cleanup failed, see console');
            }
        });
    }
}

module.exports = TasksNoTQ;
