/* graph.js — интерактивное дерево знаний: раскладка, камера, анимации */
const GraphRenderer = (function () {
    'use strict';

    // Цвета веток: наследуются от темы первого уровня вниз
    var BRANCH_COLORS = [
        '#e8695f', '#4a86c8', '#e0a13a', '#3f9e82',
        '#9a7bd4', '#d97a45', '#4f9fb8', '#c2668f'
    ];

    var FONT_FAMILY = '"Segoe UI", "Inter", system-ui, -apple-system, sans-serif';
    var MONO_FAMILY = '"Cascadia Code", "Consolas", monospace';

    var current = null;
    var resizeTimer = null;
    var measureCtx = null;
    var highlightTimer = null;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function round(value) {
        return Math.round(value * 10) / 10;
    }

    function clearTimers() {
        if (current && current.timers) {
            current.timers.forEach(function (id) { clearTimeout(id); });
            current.timers = [];
        }
    }

    function later(fn, ms) {
        var id = setTimeout(fn, ms);
        if (current) current.timers.push(id);
        return id;
    }

    function measureText(text, size, weight) {
        if (!measureCtx) {
            var canvas = document.createElement('canvas');
            measureCtx = canvas.getContext('2d');
        }
        measureCtx.font = (weight || 600) + ' ' + size + 'px ' + FONT_FAMILY;
        var width = measureCtx.measureText(String(text || '')).width;
        // небольшой запас на letter-spacing
        return width + String(text || '').length * 0.2;
    }

    function ellipsize(text, maxWidth, size, weight) {
        var value = String(text || '').trim();
        if (!value) return '';
        if (measureText(value, size, weight) <= maxWidth) return value;
        var cut = value;
        while (cut.length > 1 && measureText(cut + '\u2026', size, weight) > maxWidth) {
            cut = cut.slice(0, -1);
        }
        return cut.replace(/[\s,.;:!?\-\u2014]+$/, '') + '\u2026';
    }

    function wrapText(text, maxWidth, maxLines, size, weight) {
        var words = String(text || '').trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        if (!words.length) return [''];

        var all = [];
        var line = '';
        for (var i = 0; i < words.length; i++) {
            var candidate = line ? line + ' ' + words[i] : words[i];
            if (!line || measureText(candidate, size, weight) <= maxWidth) {
                line = candidate;
            } else {
                all.push(line);
                line = words[i];
            }
        }
        if (line) all.push(line);

        var lines = all.slice(0, maxLines);
        for (var j = 0; j < lines.length; j++) {
            lines[j] = ellipsize(lines[j], maxWidth, size, weight);
        }
        if (all.length > maxLines) {
            var last = lines[maxLines - 1];
            lines[maxLines - 1] = ellipsize(last + '\u2026', maxWidth, size, weight);
        }
        return lines;
    }

    function shortDescription(text) {
        var value = String(text || '').trim();
        if (!value) return '';
        var sentences = value.match(/[^.!?]+[.!?]+/g);
        if (!sentences || sentences.length <= 2) return value;
        return (sentences[0] + ' ' + sentences[1]).trim();
    }

    function fontScale() {
        var settings = (typeof Store !== 'undefined' && Store.get('settings')) || {};
        if (settings.fontSize === 'small') return 0.9;
        if (settings.fontSize === 'large') return 1.16;
        return 1;
    }

    function difficultyColor(value) {
        var diff = clamp(Number(value) || 3, 1, 5);
        if (diff <= 2) return '#22c55e';
        if (diff === 3) return '#eab308';
        if (diff === 4) return '#f97316';
        return '#ef4444';
    }

    function cssVar(styles, name, fallback) {
        var value = styles.getPropertyValue(name).trim();
        return value || fallback;
    }

    /* ============================================
       Модель дерева: DAG → дерево без дублей
       ============================================ */

    function buildTree(nodes, edges) {
        var map = {};
        var indegree = {};
        var outdegree = {};

        nodes.forEach(function (node, index) {
            map[node.id] = {
                id: node.id,
                label: node.label || node.id,
                description: node.description || '',
                why: node.why || '',
                difficulty: node.difficulty || 3,
                time: node.time || '',
                leadsTo: node.leadsTo || [],
                level: node.level,
                order: index,
                children: [],
                parent: null,
                depth: 0,
                tx: 0,
                ty: 0
            };
            indegree[node.id] = 0;
            outdegree[node.id] = 0;
        });

        var adjacency = {};
        edges.forEach(function (edge) {
            var source = typeof edge.source === 'object' ? edge.source.id : edge.source;
            var target = typeof edge.target === 'object' ? edge.target.id : edge.target;
            if (!map[source] || !map[target] || source === target) return;
            (adjacency[source] = adjacency[source] || []).push(target);
            outdegree[source] = (outdegree[source] || 0) + 1;
            indegree[target] = (indegree[target] || 0) + 1;
        });

        // Корень: узел без входящих связей; иначе — самый «разветвлённый»
        var zero = nodes.filter(function (node) { return (indegree[node.id] || 0) === 0; });
        var rootNode;
        if (zero.length) {
            rootNode = zero.slice().sort(function (a, b) {
                return (outdegree[b.id] || 0) - (outdegree[a.id] || 0);
            })[0];
        } else {
            rootNode = nodes.slice().sort(function (a, b) {
                return (outdegree[b.id] || 0) - (outdegree[a.id] || 0);
            })[0];
        }
        var root = map[rootNode.id];

        // Обход в ширину: у каждого узла ровно один родитель
        var visited = {};
        var queue = [root];
        var head = 0;
        visited[root.id] = true;

        while (head < queue.length) {
            var parent = queue[head++];
            var targets = adjacency[parent.id] || [];
            for (var i = 0; i < targets.length; i++) {
                var id = targets[i];
                if (!map[id] || visited[id]) continue;
                visited[id] = true;
                var child = map[id];
                child.parent = parent;
                child.depth = parent.depth + 1;
                parent.children.push(child);
                queue.push(child);
            }
        }

        // Несвязные части графа подвешиваем к корню, чтобы ничего не потерять
        nodes.forEach(function (node) {
            if (visited[node.id]) return;
            var child = map[node.id];
            child.parent = root;
            child.depth = 1;
            root.children.push(child);
            visited[child.id] = true;

            var part = [child];
            var partHead = 0;
            while (partHead < part.length) {
                var partParent = part[partHead++];
                (adjacency[partParent.id] || []).forEach(function (targetId) {
                    if (!map[targetId] || visited[targetId]) return;
                    visited[targetId] = true;
                    var partChild = map[targetId];
                    partChild.parent = partParent;
                    partChild.depth = partParent.depth + 1;
                    partParent.children.push(partChild);
                    part.push(partChild);
                });
            }
        });

        return root;
    }

    /* ============================================
       Визуальные параметры узлов
       ============================================ */

    function makeSpec(node, depth) {
        var fs = fontScale();
        var label = node.label || node.id;

        if (depth === 0) {
            var rootSize = 18 * fs;
            var rootWidth = clamp(measureText(label, rootSize, 600) + 64, 380, 540);
            var rootTextWidth = rootWidth - 60;
            var rootLines = wrapText(label, rootTextWidth, 2, rootSize, 600);
            var rootHeight = rootLines.length > 1 ? 120 : 104;
            return {
                shape: 'rect',
                width: rootWidth,
                height: rootHeight,
                rx: 24,
                titleSize: rootSize,
                titleLines: rootLines,
                titleBaselines: rootLines.length > 1 ? [-20, 0] : [-4],
                desc: ellipsize(shortDescription(node.description), rootTextWidth, 11 * fs, 400),
                descSize: 11 * fs,
                descBaseline: rootLines.length > 1 ? 26 : 20,
                barY: -rootHeight / 2 + 16,
                footY: rootHeight / 2 - 14
            };
        }

        if (depth === 1) {
            var chapterSize = 13.5 * fs;
            var chapterWidth = clamp(measureText(label, chapterSize, 600) + 54, 220, 340);
            var chapterTextWidth = chapterWidth - 44;
            var chapterLines = wrapText(label, chapterTextWidth, 2, chapterSize, 600);
            var chapterHeight = chapterLines.length > 1 ? 110 : 94;
            return {
                shape: 'rect',
                width: chapterWidth,
                height: chapterHeight,
                rx: 18,
                titleSize: chapterSize,
                titleLines: chapterLines,
                titleBaselines: chapterLines.length > 1 ? [-15, 3] : [-1],
                desc: ellipsize(shortDescription(node.description), chapterTextWidth, 10 * fs, 400),
                descSize: 10 * fs,
                descBaseline: chapterLines.length > 1 ? 25 : 19,
                barY: -chapterHeight / 2 + 14,
                footY: chapterHeight / 2 - 13
            };
        }

        var pillSize = 12 * fs;
        var pillWidth = clamp(measureText(label, pillSize, 600) + 64, 132, 320);
        var pillTextWidth = pillWidth - 60;
        return {
            shape: 'pill',
            width: pillWidth,
            height: 54,
            rx: 27,
            titleSize: pillSize,
            titleLines: wrapText(label, pillTextWidth, 1, pillSize, 600),
            desc: '',
            descSize: 0,
            titleBaselines: [0]
        };
    }

    /* ============================================
       Раскладка: поддеревья без наложений
       ============================================ */

    function decorate(root) {
        var depths = [];

        function walk(node, depth, branch) {
            node.depth = depth;
            node.branch = depth === 0 ? null : branch;
            node.spec = makeSpec(node, depth);
            (depths[depth] = depths[depth] || []).push(node);

            node.children.forEach(function (child, index) {
                var color = depth === 0
                    ? BRANCH_COLORS[index % BRANCH_COLORS.length]
                    : branch;
                walk(child, depth + 1, color);
            });
        }

        walk(root, 0, null);
        return depths;
    }

    function measureSubtree(root) {
        function measure(node) {
            if (!node.children.length) {
                node.subtreeWidth = node.spec.width;
                return node.subtreeWidth;
            }
            var gap = node.depth === 0 ? 64 : 30;
            var total = 0;
            node.children.forEach(function (child, index) {
                total += measure(child);
                if (index > 0) total += gap;
            });
            node.subtreeWidth = Math.max(node.spec.width, total);
            return node.subtreeWidth;
        }
        measure(root);
    }

    function placeSubtree(root) {
        function place(node, left) {
            node.tx = left + node.subtreeWidth / 2;
            if (!node.children.length) return;

            var gap = node.depth === 0 ? 64 : 30;
            var total = 0;
            node.children.forEach(function (child, index) {
                total += child.subtreeWidth;
                if (index > 0) total += gap;
            });

            var cursor = node.tx - total / 2;
            node.children.forEach(function (child) {
                place(child, cursor);
                cursor += child.subtreeWidth + gap;
            });
        }
        place(root, 0);
    }

    function placeRows(depths) {
        var maxHeight = [];
        var maxDepth = depths.length - 1;

        depths.forEach(function (row, depth) {
            maxHeight[depth] = 0;
            row.forEach(function (node) {
                if (node.spec.height > maxHeight[depth]) maxHeight[depth] = node.spec.height;
            });
        });

        var rowTop = [0];
        for (var depth = 1; depth <= maxDepth; depth++) {
            var gap = depth === 1 ? 82 : 58;
            rowTop[depth] = rowTop[depth - 1] + maxHeight[depth - 1] + gap;
        }

        depths.forEach(function (row, depth) {
            row.forEach(function (node) {
                node.ty = rowTop[depth] + maxHeight[depth] / 2;
            });
        });
    }

    function layoutAll(root) {
        var depths = decorate(root);
        measureSubtree(root);
        placeSubtree(root);
        placeRows(depths);

        var all = [];
        depths.forEach(function (row) { all = all.concat(row); });

        // Центрируем всё дерево по горизонтали
        var minX = Infinity;
        var maxX = -Infinity;
        all.forEach(function (node) {
            minX = Math.min(minX, node.tx - node.spec.width / 2);
            maxX = Math.max(maxX, node.tx + node.spec.width / 2);
        });
        var shift = -(minX + maxX) / 2;
        all.forEach(function (node) { node.tx += shift; });

        return { root: root, depths: depths, nodes: all };
    }

    /* ============================================
       Камера
       ============================================ */

    function rootTransform(root, width) {
        var scale = clamp(Math.min(1, (width - 48) / (root.spec.width + 90)), 0.5, 1);
        return d3.zoomIdentity
            .translate(width / 2 - root.tx * scale, 150 - root.ty * scale)
            .scale(scale);
    }

    function fitTransform(nodes, width, height) {
        var x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
        nodes.forEach(function (node) {
            x1 = Math.min(x1, node.tx - node.spec.width / 2);
            x2 = Math.max(x2, node.tx + node.spec.width / 2);
            y1 = Math.min(y1, node.ty - node.spec.height / 2);
            y2 = Math.max(y2, node.ty + node.spec.height / 2);
        });

        var padX = width < 640 ? 32 : 72;
        var padTop = 88;
        var padBottom = 56;
        var boxWidth = Math.max(1, x2 - x1);
        var boxHeight = Math.max(1, y2 - y1);
        var scale = Math.min(
            (width - padX * 2) / boxWidth,
            (height - padTop - padBottom) / boxHeight,
            1.05
        );
        scale = clamp(scale, 0.12, 1.05);

        var cx = (x1 + x2) / 2;
        var cy = (y1 + y2) / 2;
        return d3.zoomIdentity
            .translate(
                width / 2 - cx * scale,
                padTop + (height - padTop - padBottom) / 2 - cy * scale
            )
            .scale(scale);
    }

    /* ============================================
       Отрисовка
       ============================================ */

    function addGradient(defs, id, color1, color2) {
        var gradient = defs.append('linearGradient')
            .attr('id', id)
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '100%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', color1);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', color2);
    }

    function renderGraph(graphData, topicName, options) {
        options = options || {};
        var container = document.getElementById('graph-container');
        if (!container) return;
        if (!graphData || !graphData.nodes || !graphData.nodes.length) {
            container.innerHTML = '';
            return;
        }

        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var animate = options.animate !== false && !reduceMotion;

        clearTimers();
        if (highlightTimer) { clearTimeout(highlightTimer); highlightTimer = null; }

        container.innerHTML = '';
        if (typeof ModalManager !== 'undefined' && ModalManager.setTopic) {
            ModalManager.setTopic(topicName);
        }

        var width = container.clientWidth || window.innerWidth;
        var height = container.clientHeight || window.innerHeight;

        var root = buildTree(graphData.nodes, graphData.edges || []);
        var layout = layoutAll(root);
        var nodes = layout.nodes;
        var depths = layout.depths;

        var links = [];
        nodes.forEach(function (node) {
            if (!node.parent) return;
            links.push({
                source: node.parent,
                target: node,
                color: node.branch || BRANCH_COLORS[0]
            });
        });

        var styles = getComputedStyle(document.documentElement);
        var theme = document.documentElement.getAttribute('data-theme') || 'dark';
        var isDark = theme !== 'light' && theme !== 'sand';
        var textColor = cssVar(styles, '--c-text', '#e0e0e0');
        var secondaryColor = cssVar(styles, '--c-secondary', '#888888');
        var softColor = cssVar(styles, '--c-muted', '#777777');
        var strongColor = cssVar(styles, '--c-secondary-strong', '#999999');
        var themeAccent = cssVar(styles, '--c-accent', '#e0e0e0');

        var svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', '0 0 ' + width + ' ' + height);

        var defs = svg.append('defs');

        // Мягкая тень карточек
        var shadow = defs.append('filter')
            .attr('id', 'kg-node-shadow')
            .attr('x', '-40%').attr('y', '-40%')
            .attr('width', '180%').attr('height', '180%');
        shadow.append('feDropShadow')
            .attr('dx', 0).attr('dy', 4).attr('stdDeviation', 7)
            .attr('flood-color', '#000000')
            .attr('flood-opacity', isDark ? 0.5 : 0.16);

        addGradient(defs, 'kg-grad-root',
            cssVar(styles, '--c-subtle', '#1a1a1a'),
            cssVar(styles, '--c-card', '#101010'));
        addGradient(defs, 'kg-grad-chapter',
            cssVar(styles, '--c-card', '#141414'),
            cssVar(styles, '--c-panel', '#0e0e0e'));
        addGradient(defs, 'kg-grad-pill',
            cssVar(styles, '--c-subtle', '#1a1a1a'),
            cssVar(styles, '--c-card', '#111111'));

        var graphGroup = svg.append('g').attr('class', 'graph-root');
        var userInteracted = false;
        var zoomBehavior = d3.zoom()
            .scaleExtent([0.12, 2.6])
            .on('zoom', function (event) {
                graphGroup.attr('transform', event.transform);
                if (event.sourceEvent) userInteracted = true;
            });
        svg.call(zoomBehavior);
        svg.on('dblclick.zoom', null);

        current = {
            data: graphData,
            topic: topicName,
            svg: svg,
            zoom: zoomBehavior,
            group: graphGroup,
            nodes: nodes,
            links: links,
            fit: null,
            rootTransform: null,
            timers: []
        };

        /* ---------- Связи ---------- */

        function startX(link, index) {
            var source = link.source;
            var siblings = source.children;
            if (siblings.length <= 1) return source.tx;
            var span = Math.min(source.spec.width * 0.62, (siblings.length - 1) * 70);
            var step = siblings.length > 1 ? span / (siblings.length - 1) : 0;
            return source.tx - span / 2 + step * index;
        }

        links.forEach(function (link, index) {
            link.sx = startX(link, link.source.children.indexOf(link.target));
            link.sy = link.source.ty + link.source.spec.height / 2 + 0.5;
            link.tx = link.target.tx;
            link.ty = link.target.ty - link.target.spec.height / 2 - 0.5;
            var curve = Math.max(24, (link.ty - link.sy) * 0.48);
            link.path = 'M ' + round(link.sx) + ' ' + round(link.sy) +
                ' C ' + round(link.sx) + ' ' + round(link.sy + curve) +
                ', ' + round(link.tx) + ' ' + round(link.ty - curve) +
                ', ' + round(link.tx) + ' ' + round(link.ty);
            link.index = index;
        });

        var linkLayer = graphGroup.append('g').attr('class', 'links-layer');
        var linkGroups = linkLayer.selectAll('g.graph-link-group')
            .data(links)
            .enter()
            .append('g')
            .attr('class', 'graph-link-group')
            .attr('opacity', animate ? 0 : 1);

        linkGroups.append('path')
            .attr('class', 'graph-link')
            .attr('d', function (link) { return link.path; })
            .attr('stroke', function (link) { return link.color; })
            .attr('stroke-width', function (link) {
                return link.source.depth === 0 ? 2.1 : 1.35;
            })
            .attr('stroke-opacity', function (link) {
                if (link.source.depth === 0) return isDark ? 0.85 : 0.9;
                return isDark ? 0.55 : 0.7;
            });

        /* ---------- Узлы ---------- */

        var nodeLayer = graphGroup.append('g').attr('class', 'nodes-layer');
        var nodeSelection = nodeLayer.selectAll('g.knowledge-node')
            .data(nodes, function (node) { return node.id; })
            .enter()
            .append('g')
            .attr('class', 'knowledge-node')
            .attr('transform', function (node) {
                return 'translate(' + round(node.tx) + ',' + round(node.ty) + ')';
            })
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', function (node) { return node.label; });

        var inner = nodeSelection.append('g')
            .attr('class', 'node-inner')
            .attr('opacity', animate ? 0 : 1)
            .attr('transform', animate
                ? function (node) { return node.depth === 0 ? 'translate(0,18) scale(0.94)' : 'translate(0,12)'; }
                : 'translate(0,0)');

        nodeSelection.each(function (node) {
            var group = d3.select(this);
            var spec = node.spec;
            var isRoot = node.depth === 0;
            var branchColor = node.branch || strongColor;

            group.append('rect')
                .attr('class', 'node-card-rect')
                .attr('width', spec.width)
                .attr('height', spec.height)
                .attr('x', -spec.width / 2)
                .attr('y', -spec.height / 2)
                .attr('rx', spec.rx)
                .attr('ry', spec.rx)
                .attr('fill', function () {
                    if (isRoot) return 'url(#kg-grad-root)';
                    return node.depth === 1 ? 'url(#kg-grad-chapter)' : 'url(#kg-grad-pill)';
                })
                .attr('stroke', isRoot ? strongColor : branchColor)
                .attr('stroke-opacity', isRoot ? 0.65 : (isDark ? 0.6 : 0.72))
                .attr('stroke-width', isRoot ? 1.6 : (node.depth === 1 ? 1.35 : 1.15))
                .attr('filter', 'url(#kg-node-shadow)');

            // Цветная метка ветки
            if (spec.shape === 'rect') {
                group.append('rect')
                    .attr('class', 'node-accent-bar')
                    .attr('width', 34)
                    .attr('height', 3)
                    .attr('rx', 1.5)
                    .attr('x', -17)
                    .attr('y', spec.barY)
                    .attr('fill', isRoot ? themeAccent : branchColor)
                    .attr('opacity', isRoot ? 0.75 : 0.9);
            }

            if (isRoot || node.depth === 1) {
                spec.titleLines.forEach(function (line, index) {
                    group.append('text')
                        .attr('class', 'node-card-title')
                        .text(line)
                        .attr('text-anchor', 'middle')
                        .attr('x', 0)
                        .attr('y', spec.titleBaselines[index] || 0)
                        .attr('font-size', spec.titleSize.toFixed(2) + 'px')
                        .attr('fill', textColor);
                });

                if (spec.desc) {
                    group.append('text')
                        .attr('class', 'node-card-desc')
                        .text(spec.desc)
                        .attr('text-anchor', 'middle')
                        .attr('x', 0)
                        .attr('y', spec.descBaseline)
                        .attr('font-size', spec.descSize.toFixed(2) + 'px')
                        .attr('fill', secondaryColor);
                }

                // Сложность и время
                var difficulty = clamp(Number(node.difficulty) || 3, 1, 5);
                var footY = spec.footY;
                var startDotX = -spec.width / 2 + 14;
                for (var dot = 0; dot < 5; dot++) {
                    group.append('circle')
                        .attr('class', 'node-diff-dot')
                        .attr('cx', startDotX + dot * 9)
                        .attr('cy', footY)
                        .attr('r', 2.4)
                        .attr('fill', dot < difficulty ? difficultyColor(difficulty) : cssVar(styles, '--c-subtle', '#262626'));
                }
                if (node.time) {
                    group.append('text')
                        .attr('class', 'node-card-time')
                        .text(ellipsize(node.time, 80, 9 * fontScale(), 400))
                        .attr('text-anchor', 'end')
                        .attr('x', spec.width / 2 - 14)
                        .attr('y', footY + 3.4)
                        .attr('font-size', (9 * fontScale()).toFixed(2) + 'px')
                        .attr('fill', softColor);
                }
            } else {
                // Подтема: овальная пилюля
                group.append('circle')
                    .attr('class', 'node-pill-dot')
                    .attr('cx', -spec.width / 2 + 18)
                    .attr('cy', 0)
                    .attr('r', 3.4)
                    .attr('fill', difficultyColor(node.difficulty))
                    .attr('opacity', 0.95);

                group.append('text')
                    .attr('class', 'node-card-title')
                    .text(spec.titleLines[0] || '')
                    .attr('text-anchor', 'middle')
                    .attr('x', 5)
                    .attr('y', 0)
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', spec.titleSize.toFixed(2) + 'px')
                    .attr('fill', textColor);
            }
        });

        /* ---------- Контакты связей (поверх карточек) ---------- */

        var portLayer = graphGroup.append('g').attr('class', 'ports-layer');
        var portGroups = portLayer.selectAll('g.graph-port-group')
            .data(links)
            .enter()
            .append('g')
            .attr('class', 'graph-port-group')
            .attr('opacity', animate ? 0 : 0.95);

        portGroups.append('circle')
            .attr('class', 'graph-link-port')
            .attr('cx', function (link) { return link.sx; })
            .attr('cy', function (link) { return link.sy; })
            .attr('r', 2.6)
            .attr('fill', function (link) { return link.color; });

        portGroups.append('circle')
            .attr('class', 'graph-link-port')
            .attr('cx', function (link) { return link.tx; })
            .attr('cy', function (link) { return link.ty; })
            .attr('r', 3.2)
            .attr('fill', function (link) { return link.color; });

        /* ---------- Взаимодействие ---------- */

        function clearHighlight() {
            nodeSelection.classed('dimmed', false).classed('highlighted', false);
            linkGroups.classed('dimmed', false);
            portGroups.classed('dimmed', false);
        }

        function highlightNode(nodeId) {
            var connected = {};
            connected[nodeId] = true;
            links.forEach(function (link) {
                if (link.source.id === nodeId) connected[link.target.id] = true;
                if (link.target.id === nodeId) connected[link.source.id] = true;
            });
            nodeSelection
                .classed('dimmed', function (node) { return !connected[node.id]; })
                .classed('highlighted', function (node) { return node.id === nodeId; });
            linkGroups.classed('dimmed', function (link) {
                return link.source.id !== nodeId && link.target.id !== nodeId;
            });
            portGroups.classed('dimmed', function (link) {
                return link.source.id !== nodeId && link.target.id !== nodeId;
            });
        }

        function openNode(node) {
            if (typeof ModalManager !== 'undefined' && ModalManager.openModal) {
                ModalManager.openModal(node, graphData);
            }
        }

        var pointerStart = null;
        nodeSelection
            .on('pointerdown', function (event) {
                pointerStart = { x: event.clientX, y: event.clientY };
            })
            .on('click', function (event, node) {
                var moved = pointerStart && (
                    Math.abs(event.clientX - pointerStart.x) > 5 ||
                    Math.abs(event.clientY - pointerStart.y) > 5
                );
                pointerStart = null;
                if (moved) return;
                event.stopPropagation();
                openNode(node);
            })
            .on('keydown', function (event, node) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openNode(node);
                }
            })
            .on('mouseenter', function (event, node) {
                highlightNode(node.id);
            })
            .on('mouseleave', clearHighlight);

        svg.on('dblclick', function (event) {
            if (event.target.closest && event.target.closest('.knowledge-node')) return;
            fitToScreen(false);
        });

        /* ---------- Анимации ---------- */

        var delayByDepth = {};
        var maxDelay = 0;
        depths.forEach(function (row, depth) {
            row.forEach(function (node, index) {
                if (depth === 0) {
                    node.delay = 60;
                } else if (depth === 1) {
                    node.delay = 280 + index * 70;
                } else {
                    node.delay = 520 + (depth - 2) * 240 + index * 45;
                }
                maxDelay = Math.max(maxDelay, node.delay);
            });
        });

        function linkDelay(link) {
            var siblings = link.source.children;
            var index = siblings.indexOf(link.target);
            var base = 380 + link.source.depth * 240;
            return base + Math.max(0, index) * 40;
        }

        if (animate) {
            // Камера сразу показывает первую плитку
            svg.call(zoomBehavior.transform, rootTransform(root, width));

            inner.transition('kg-node-enter')
                .delay(function (node) { return node.delay; })
                .duration(function (node) { return node.depth === 0 ? 620 : 480; })
                .ease(d3.easeCubicOut)
                .attr('opacity', 1)
                .attr('transform', 'translate(0,0) scale(1)');

            linkGroups.each(function (link) {
                var group = d3.select(this);
                var path = group.select('.graph-link');
                var pathNode = path.node();
                if (pathNode && pathNode.getTotalLength) {
                    var length = pathNode.getTotalLength();
                    path.attr('stroke-dasharray', length).attr('stroke-dashoffset', length);
                }
                var delay = linkDelay(link);
                group.transition('kg-link-enter')
                    .delay(delay)
                    .duration(240)
                    .attr('opacity', 1);
                path.transition('kg-link-draw')
                    .delay(delay)
                    .duration(520)
                    .ease(d3.easeQuadOut)
                    .attr('stroke-dashoffset', 0)
                    .on('end', function () {
                        d3.select(this).attr('stroke-dasharray', null);
                    });
            });

            portGroups.transition('kg-port-enter')
                .delay(function (link) { return linkDelay(link) + 240; })
                .duration(260)
                .attr('opacity', 0.95);

            later(function () {
                if (!current || userInteracted) return;
                var modalOpen = document.querySelector('.modal-overlay:not(.hidden)');
                if (modalOpen) return;
                // На узких экранах не уменьшаем дерево до нечитаемого размера:
                // камера остаётся на корне, дальше можно двигать и масштабировать.
                var fit = fitTransform(nodes, width, height);
                if (width < 700 || fit.k < 0.55) return;
                fitToScreen(true);
            }, Math.max(1500, maxDelay + 760));
        } else {
            var fit = fitTransform(nodes, width, height);
            if (width < 700 || fit.k < 0.55) {
                svg.call(zoomBehavior.transform, rootTransform(root, width));
            } else {
                svg.call(zoomBehavior.transform, fit);
            }
        }
    }

    /* ============================================
       Публичные действия
       ============================================ */

    function fitToScreen(instant) {
        if (!current || !current.svg || !current.zoom) return;
        var container = document.getElementById('graph-container');
        if (!container) return;
        var width = container.clientWidth || window.innerWidth;
        var height = container.clientHeight || window.innerHeight;
        var transform = fitTransform(current.nodes, width, height);
        if (instant) {
            current.svg.call(current.zoom.transform, transform);
        } else {
            current.svg.transition('kg-fit')
                .duration(720)
                .ease(d3.easeCubicInOut)
                .call(current.zoom.transform, transform);
        }
    }

    function focusRoot() {
        if (!current || !current.svg || !current.zoom) return;
        var container = document.getElementById('graph-container');
        if (!container) return;
        var width = container.clientWidth || window.innerWidth;
        var root = current.nodes.filter(function (node) { return node.depth === 0; })[0];
        if (!root) return;
        var transform = rootTransform(root, width);
        current.svg.transition('kg-focus-root')
            .duration(650)
            .ease(d3.easeCubicInOut)
            .call(current.zoom.transform, transform);
    }

    // Перерисовка при изменении размера окна — без повторной анимации
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (!document.getElementById('graph-container')) return;
            if (current && current.data) {
                renderGraph(current.data, current.topic, { animate: false });
            }
        }, 220);
    });

    // Подсветка связей из модального окна
    window._graphHighlight = function (nodeId) {
        if (!current) return;
        var node = current.nodes.filter(function (item) { return item.id === nodeId; })[0];
        if (!node) return;
        var connected = {};
        connected[nodeId] = true;
        current.links.forEach(function (link) {
            if (link.source.id === nodeId) connected[link.target.id] = true;
            if (link.target.id === nodeId) connected[link.source.id] = true;
        });
        d3.selectAll('#graph-container .knowledge-node')
            .classed('dimmed', function (item) { return !connected[item.id]; });
        d3.selectAll('#graph-container .graph-link-group')
            .classed('dimmed', function (link) {
                return link.source.id !== nodeId && link.target.id !== nodeId;
            });
        d3.selectAll('#graph-container .graph-port-group')
            .classed('dimmed', function (link) {
                return link.source.id !== nodeId && link.target.id !== nodeId;
            });
        if (highlightTimer) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(function () {
            d3.selectAll('#graph-container .knowledge-node').classed('dimmed', false);
            d3.selectAll('#graph-container .graph-link-group').classed('dimmed', false);
            d3.selectAll('#graph-container .graph-port-group').classed('dimmed', false);
        }, 3000);
    };

    return {
        renderGraph: renderGraph,
        fit: fitToScreen,
        focusRoot: focusRoot
    };
})();
