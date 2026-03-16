'use strict';

var obsidian = require('obsidian');

// The exact 22 TQ_* properties that Tasks plugin registers via setType()
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

class TasksNoTQ extends obsidian.Plugin {

    onload() {
        var self = this;
        console.log('[Tasks No TQ] Plugin loaded');

        // Run cleanup after layout is ready so Tasks has already called setType()
        this.app.workspace.onLayoutReady(function () {
            // Delay to make sure Tasks onload() finishes fully
            setTimeout(function () {
                console.log('[Tasks No TQ] Initial cleanup');
                self.removeTQTypes();
            }, 5000);
        });

        // Periodic cleanup: Tasks may re-register on settings save etc.
        this.registerInterval(
            window.setInterval(function () {
                self.removeTQTypes();
            }, 30 * 1000)
        );

        // Listen for metadataTypeManager changes - cleanup immediately when Tasks registers
        try {
            var mgr = this.app.metadataTypeManager;
            if (mgr && typeof mgr.on === 'function') {
                this.registerEvent(
                    mgr.on('changed', function () {
                        // Use short delay to run after Tasks' setType batch
                        setTimeout(function () { self.removeTQTypes(); }, 500);
                    })
                );
                console.log('[Tasks No TQ] Listening on metadataTypeManager changed event');
            }
        } catch (e) {
            console.log('[Tasks No TQ] Could not listen on metadataTypeManager:', e);
        }

        // Manual command
        this.addCommand({
            id: 'remove-tq-now',
            name: 'Remove TQ_* property types now',
            callback: function () {
                var count = self.removeTQTypes();
                new obsidian.Notice(
                    count > 0
                        ? '[Tasks No TQ] Removed ' + count + ' TQ_* entries'
                        : '[Tasks No TQ] No TQ_* entries found'
                );
            },
        });
    }

    onunload() {
        console.log('[Tasks No TQ] Plugin unloaded');
    }

    /**
     * Core cleanup: reverse Tasks' setType() calls.
     * Returns number of entries removed.
     */
    removeTQTypes() {
        var removed = 0;
        var mgr;

        try {
            mgr = this.app.metadataTypeManager;
        } catch (e) {
            console.error('[Tasks No TQ] Cannot access metadataTypeManager:', e);
            return 0;
        }

        if (!mgr) {
            console.log('[Tasks No TQ] metadataTypeManager not available');
            return 0;
        }

        // === Strategy 1: Delete from mgr.types (this is what types.json maps to) ===
        if (mgr.types && typeof mgr.types === 'object') {
            for (var i = 0; i < TQ_FIELDS.length; i++) {
                var field = TQ_FIELDS[i];
                if (mgr.types[field] !== undefined) {
                    delete mgr.types[field];
                    removed++;
                }
            }
            // Also catch any other TQ_ prefixed entries we might not know about
            var typeKeys = Object.keys(mgr.types);
            for (var j = 0; j < typeKeys.length; j++) {
                if (typeKeys[j].indexOf('TQ_') === 0) {
                    delete mgr.types[typeKeys[j]];
                    removed++;
                }
            }
        }

        // === Strategy 2: Delete from mgr.properties (in-memory property cache) ===
        if (mgr.properties && typeof mgr.properties === 'object') {
            for (var i = 0; i < TQ_FIELDS.length; i++) {
                var field = TQ_FIELDS[i];
                if (mgr.properties[field] !== undefined) {
                    delete mgr.properties[field];
                    removed++;
                }
            }
            var propKeys = Object.keys(mgr.properties);
            for (var j = 0; j < propKeys.length; j++) {
                if (propKeys[j].indexOf('TQ_') === 0) {
                    delete mgr.properties[propKeys[j]];
                    removed++;
                }
            }
        }

        // === Strategy 3: Try unsetType() if it exists (newer Obsidian versions) ===
        if (typeof mgr.unsetType === 'function') {
            for (var i = 0; i < TQ_FIELDS.length; i++) {
                try { mgr.unsetType(TQ_FIELDS[i]); } catch (_) {}
            }
        }

        // === Strategy 4: Delete from getAllProperties() result (if it's a live reference) ===
        if (typeof mgr.getAllProperties === 'function') {
            try {
                var allProps = mgr.getAllProperties();
                if (allProps && typeof allProps === 'object') {
                    for (var i = 0; i < TQ_FIELDS.length; i++) {
                        if (allProps[TQ_FIELDS[i]] !== undefined) {
                            delete allProps[TQ_FIELDS[i]];
                        }
                    }
                    var allKeys = Object.keys(allProps);
                    for (var j = 0; j < allKeys.length; j++) {
                        if (allKeys[j].indexOf('TQ_') === 0) {
                            delete allProps[allKeys[j]];
                        }
                    }
                }
            } catch (_) {}
        }

        // === Save in-memory changes to disk ===
        if (removed > 0 && typeof mgr.save === 'function') {
            try { mgr.save(); } catch (_) {}
        }

        // === Strategy 5: Direct types.json file cleanup (belt and suspenders) ===
        this.cleanTypesFile();

        if (removed > 0) {
            console.log('[Tasks No TQ] Cleaned ' + removed + ' TQ_* entries from memory');
        }

        return removed;
    }

    /**
     * Directly read and rewrite .obsidian/types.json to strip TQ_* entries.
     */
    cleanTypesFile() {
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
                    if (keys[i].indexOf('TQ_') === 0) {
                        delete data[keys[i]];
                        changed = true;
                    }
                }
                if (changed) {
                    console.log('[Tasks No TQ] Cleaning types.json on disk');
                    return adapter.write(path, JSON.stringify(data, null, '\t'));
                }
            });
        }).catch(function (e) {
            console.error('[Tasks No TQ] types.json cleanup error:', e);
        });
    }
}

module.exports = TasksNoTQ;
