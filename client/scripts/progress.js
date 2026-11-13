/* progress.js — отметки «изучено» в localStorage (local-first) */
const Progress = (function () {
    'use strict';

    var PREFIX = 'kg_progress_';

    function keyFor(topic) {
        return PREFIX + String(topic || 'default').toLowerCase().replace(/\s+/g, '_');
    }

    function read(topic) {
        try { return JSON.parse(localStorage.getItem(keyFor(topic)) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function write(topic, map) {
        try { localStorage.setItem(keyFor(topic), JSON.stringify(map)); } catch (e) {}
    }

    function getMap(topic) { return read(topic); }

    function isLearned(topic, nodeId) { return !!read(topic)[nodeId]; }

    function setLearned(topic, nodeId, value) {
        var map = read(topic);
        if (value === undefined) value = !map[nodeId];
        if (value) map[nodeId] = true; else delete map[nodeId];
        write(topic, map);
        return !!map[nodeId];
    }

    return { getMap: getMap, isLearned: isLearned, setLearned: setLearned };
})();
