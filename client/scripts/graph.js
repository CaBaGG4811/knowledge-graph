/* graph.js — D3.js модуль рендера деревьев знаний */
const GraphRenderer = (function () {
    'use strict';

    var CARD_SIZES = {
        0: { width: 300, height: 124 },
        1: { width: 260, height: 112 },
        2: { width: 240, height: 104 },
        3: { width: 224, height: 100 },
        4: { width: 210, height: 96 }
    };

    function difficultyColor(diff) {
        if (diff <= 2) return '#22c55e';
        if (diff === 3) return '#eab308';
        if (diff === 4) return '#f97316';
        return '#ef4444';
    }

    // масштаб текста карточек из настроек внешнего вида
    function fontScale() {
        var s = (typeof Store !== 'undefined' && Store.get('settings')) || {};
        if (s.fontSize === 'small') return 0.88;
        if (s.fontSize === 'large') return 1.18;
        return 1;
    }

    var currentEdgesProcessed = [];

    function truncateText(text, maxLen) {
        if (!text) return '';
        return text.length <= maxLen ? text : text.substring(0, maxLen - 1) + '\u2026';
    }

    // заголовок максимум на 2 строки, с многоточием если не влезло
    function wrapTitle(text, maxLen) {
        if (!text) return [''];
        var words = String(text).split(/\s+/).filter(function (w) { return w.length > 0; });
        var lines = ['', ''];
        var li = 0;
        var i = 0;
        for (i = 0; i < words.length && li < 2; i++) {
            var w = words[i];
            if (lines[li].length === 0) {
                lines[li] = w;
            } else if ((lines[li] + ' ' + w).length <= maxLen) {
                lines[li] += ' ' + w;
            } else {
                li++;
                i--;
            }
        }
        var overflow = i < words.length;
        var result = lines[1].length > 0 ? lines : [lines[0]];
        if (overflow && result.length === 2) result[1] = truncateText(result[1], maxLen - 1);
        result = result.map(function (l) { return truncateText(l, maxLen); });
        return result;
    }

    function shortDescription(text) {
        if (!text) return '';
        var sentences = text.match(/[^.!?]+[.!?]+/g);
        if (!sentences || sentences.length <= 2) return text;
        return (sentences[0] + sentences[1]).trim();
    }

    function computeCardWidth(depth, titleLen) {
        var base = CARD_SIZES[depth] || CARD_SIZES[4];
        var w = base.width;
        if (titleLen > 22) w += Math.min(60, Math.round((titleLen - 22) * 2.5));
        return w;
    }

    function findRootNodeId(nodes, edges) {
        var explicitRoot = nodes.find(function (n) { return n.level === 1; });
        if (explicitRoot) return explicitRoot.id;
        var outgoing = {};
        nodes.forEach(function (n) { outgoing[n.id] = 0; });
        edges.forEach(function (e) {
            var src = typeof e.source === 'object' ? e.source.id : e.source;
            if (outgoing[src] !== undefined) outgoing[src]++;
        });
        var maxDeg = -1;
        var rootId = nodes[0].id;
        nodes.forEach(function (n) {
            if (outgoing[n.id] > maxDeg) { maxDeg = outgoing[n.id]; rootId = n.id; }
        });
        return rootId;
    }

    function buildHierarchy(nodes, edges, rootId) {
        var nodeById = {};
        nodes.forEach(function (n) { nodeById[n.id] = Object.assign({}, n, { children: [] }); });
        var childOfSomeone = new Set();
        edges.forEach(function (e) {
            var src = typeof e.source === 'object' ? e.source.id : e.source;
            var tgt = typeof e.target === 'object' ? e.target.id : e.target;
            if (nodeById[src] && nodeById[tgt] && src !== tgt) {
                nodeById[src].children.push(nodeById[tgt]);
                childOfSomeone.add(tgt);
            }
        });
        var root = nodeById[rootId] || nodeById[nodes[0].id];
        nodes.forEach(function (n) {
            if (n.id !== root.id && !childOfSomeone.has(n.id) && nodeById[n.id]) {
                root.children.push(nodeById[n.id]);
            }
        });
        var visited = new Set();
        function pruneCycles(node) {
            if (!node) return;
            if (visited.has(node.id)) { node.children = []; return; }
            visited.add(node.id);
            node.children.forEach(pruneCycles);
        }
        pruneCycles(root);
        return root;
    }

    function getConnectedNodeIds(nodeId) {
        var connected = new Set();
        connected.add(nodeId);
        currentEdgesProcessed.forEach(function (e) {
            if (e.source.id === nodeId) connected.add(e.target.id);
            if (e.target.id === nodeId) connected.add(e.source.id);
        });
        return connected;
    }

    function applyHoverEffect(hoveredNodeId) {
        var connected = getConnectedNodeIds(hoveredNodeId);
        d3.selectAll('.knowledge-node').each(function (d) {
            var el = d3.select(this);
            el.classed('dimmed', !connected.has(d.id)).classed('highlighted', d.id === hoveredNodeId);
        });
        d3.selectAll('.graph-link').each(function (d) {
            d3.select(this).classed('dimmed', !(connected.has(d.source.id) && connected.has(d.target.id)));
        });
    }

    function removeHoverEffect() {
        d3.selectAll('.knowledge-node').classed('dimmed', false).classed('highlighted', false);
        d3.selectAll('.graph-link').classed('dimmed', false);
    }

    function highlightConnections(nodeId, nodesFlat) {
        var connected = new Set();
        connected.add(nodeId);
        currentEdgesProcessed.forEach(function (e) {
            if (e.source.id === nodeId) connected.add(e.target.id);
            if (e.target.id === nodeId) connected.add(e.source.id);
        });
        d3.selectAll('.knowledge-node').each(function (d) {
            var el = d3.select(this);
            el.classed('dimmed', !connected.has(d.id));
        });
        d3.selectAll('.graph-link').each(function (d) {
            d3.select(this).classed('dimmed', !(connected.has(d.source.id) && connected.has(d.target.id)));
        });
        setTimeout(function () {
            d3.selectAll('.knowledge-node').classed('dimmed', false);
            d3.selectAll('.graph-link').classed('dimmed', false);
        }, 3000);
    }

    // Раскладка без наложений: раздвигаем карточки в каждом ряду,
    // затем центрируем родителей над детьми (снизу вверх), повторяем
    function layoutWithoutOverlaps(nodesFlat, childrenMap) {
        var byDepth = {};
        nodesFlat.forEach(function (n) { (byDepth[n.depth] = byDepth[n.depth] || []).push(n); });
        var maxDepth = 0;
        nodesFlat.forEach(function (n) { if (n.depth > maxDepth) maxDepth = n.depth; });

        function relax() {
            Object.keys(byDepth).map(Number).forEach(function (dep) {
                var row = byDepth[dep].sort(function (a, b) { return a.tx - b.tx; });
                for (var i = 1; i < row.length; i++) {
                    var need = (row[i - 1].cardWidth + row[i].cardWidth) / 2 + 70;
                    if (row[i].tx - row[i - 1].tx < need) row[i].tx = row[i - 1].tx + need;
                }
            });
        }
        function recenter() {
            for (var dep = maxDepth; dep >= 1; dep--) {
                byDepth[dep - 1].forEach(function (p) {
                    var kids = childrenMap[p.id] || [];
                    if (!kids.length) return;
                    var sum = 0, cnt = 0;
                    kids.forEach(function (id) {
                        for (var j = 0; j < nodesFlat.length; j++) {
                            if (nodesFlat[j].id === id) { sum += nodesFlat[j].tx; cnt++; break; }
                        }
                    });
                    if (cnt) p.tx = sum / cnt;
                });
            }
        }
        relax(); recenter(); relax(); recenter(); relax();
    }

    function renderGraph(graphData, topicName) {
        var container = document.getElementById('graph-container');
        if (!container) return;
        container.innerHTML = '';
        currentEdgesProcessed = [];
        if (typeof ModalManager !== 'undefined' && ModalManager.setTopic) ModalManager.setTopic(topicName);

        var width = window.innerWidth;
        var height = window.innerHeight;

        var svg = d3.select('#graph-container').append('svg').attr('width', width).attr('height', height);

        var isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        var defs = svg.append('defs');

        var bgGrad = defs.append('radialGradient').attr('id', 'vignette-bg').attr('cx', '50%').attr('cy', '55%').attr('r', '55%');
        bgGrad.append('stop').attr('offset', '0%').attr('stop-color', isDark ? '#0a0a0a' : '#f5f5f5');
        bgGrad.append('stop').attr('offset', '100%').attr('stop-color', isDark ? '#000000' : '#e0e0e0');
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#vignette-bg)');

        // мягкая тень под карточками
        var cardShadow = defs.append('filter').attr('id', 'card-shadow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
        cardShadow.append('feDropShadow').attr('dx', 0).attr('dy', 3).attr('stdDeviation', 4)
            .attr('flood-color', '#000000').attr('flood-opacity', isDark ? 0.55 : 0.18);

        function addGrad(id, c1, c2) {
            var g = defs.append('linearGradient').attr('id', id).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
            g.append('stop').attr('offset', '0%').attr('stop-color', c1);
            g.append('stop').attr('offset', '100%').attr('stop-color', c2);
        }
        if (isDark) {
            addGrad('card-gradient-root', '#1c1c1c', '#101010');
            addGrad('card-gradient-l1', '#141414', '#0e0e0e');
            addGrad('card-gradient-l2', '#131313', '#0d0d0d');
            addGrad('card-gradient-l3', '#121212', '#0c0c0c');
            addGrad('card-gradient-l4', '#111111', '#0b0b0b');
        } else {
            addGrad('card-gradient-root', '#ffffff', '#f2f2f2');
            addGrad('card-gradient-l1', '#ffffff', '#f0f0f0');
            addGrad('card-gradient-l2', '#ffffff', '#eeeeee');
            addGrad('card-gradient-l3', '#f8f8f8', '#eeeeee');
            addGrad('card-gradient-l4', '#f5f5f5', '#eeeeee');
        }

        var graphGroup = svg.append('g').attr('class', 'graph-root');
        var zoomBehavior = d3.zoom().scaleExtent([0.15, 4]).on('zoom', function (e) { graphGroup.attr('transform', e.transform); });
        svg.call(zoomBehavior);

        // дерево
        var rootId = findRootNodeId(graphData.nodes, graphData.edges);
        var hierarchyRoot = buildHierarchy(graphData.nodes, graphData.edges, rootId);
        var d3Hierarchy = d3.hierarchy(hierarchyRoot);

        d3.tree().nodeSize([560, 250])(d3Hierarchy);

        var childrenMap = {};
        d3Hierarchy.links().forEach(function (l) {
            var pid = l.source.data.id;
            (childrenMap[pid] = childrenMap[pid] || []).push(l.target.data.id);
        });

        // плоский массив
        var nodesFlat = [];
        d3Hierarchy.descendants().forEach(function (d) {
            var orig = d.data;
            var cw = computeCardWidth(d.depth, (orig.label || '').length);
            var ch = (CARD_SIZES[d.depth] || CARD_SIZES[4]).height;
            nodesFlat.push({
                id: orig.id, label: orig.label, description: orig.description,
                why: orig.why || '', difficulty: orig.difficulty || 3,
                time: orig.time || '', leadsTo: orig.leadsTo || [],
                level: orig.level, depth: d.depth,
                tx: d.x, ty: -d.y,
                cardWidth: cw, cardHeight: ch
            });
        });

        // убираем наложения карточек
        layoutWithoutOverlaps(nodesFlat, childrenMap);

        // центрируем
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodesFlat.forEach(function (n) {
            if (n.tx < minX) minX = n.tx;
            if (n.tx > maxX) maxX = n.tx;
            if (n.ty < minY) minY = n.ty;
            if (n.ty > maxY) maxY = n.ty;
        });
        var offX = width / 2 - (minX + maxX) / 2;
        var offY = height * 0.82 - maxY;
        nodesFlat.forEach(function (n) { n.tx += offX; n.ty += offY; });

        var nodeById = {};
        nodesFlat.forEach(function (n) { nodeById[n.id] = n; });

        var edgesProcessed = [];
        d3Hierarchy.links().forEach(function (link) {
            if (nodeById[link.source.data.id] && nodeById[link.target.data.id]) {
                edgesProcessed.push({ source: nodeById[link.source.data.id], target: nodeById[link.target.data.id] });
            }
        });
        currentEdgesProcessed = edgesProcessed;

        // связи
        var linkGroup = graphGroup.append('g').attr('class', 'links-layer');
        function curvePath(src, tgt) {
            var sx = src.tx, sy = src.ty - src.cardHeight / 2;
            var tx = tgt.tx, ty = tgt.ty + tgt.cardHeight / 2;
            var midY = (sy + ty) / 2;
            var cpx = (tx - sx) * 0.02;
            return 'M ' + sx + ' ' + sy + ' C ' + (sx + cpx) + ' ' + midY + ', ' + (tx - cpx) + ' ' + midY + ', ' + tx + ' ' + ty;
        }

        var rootNode = nodeById[rootId];

        var linkElements = linkGroup.selectAll('path').data(edgesProcessed).enter()
            .append('path').attr('class', 'graph-link')
            .attr('stroke', isDark ? '#4a4a4a' : '#c0c0c0')
            .attr('stroke-width', function (d) { return d.source.depth === 0 ? 2 : 1.25; })
            .attr('stroke-opacity', 0)
            .attr('d', function (d) { return curvePath(d.source, d.target); });

        // карточки
        var nodeGroup = graphGroup.append('g').attr('class', 'nodes-layer');
        var nodeElements = nodeGroup.selectAll('g').data(nodesFlat).enter()
            .append('g').attr('class', 'knowledge-node')
            .attr('opacity', 0)
            .attr('transform', function (d) { return 'translate(' + d.tx + ',' + d.ty + ')'; });

        nodeElements.append('rect').attr('class', 'node-card-rect')
            .attr('width', function (d) { return d.cardWidth; })
            .attr('height', function (d) { return d.cardHeight; })
            .attr('x', function (d) { return -d.cardWidth / 2; })
            .attr('y', function (d) { return -d.cardHeight / 2; })
            .attr('rx', 12).attr('ry', 12)
            .attr('fill', function (d) { return 'url(#card-gradient-' + (d.depth === 0 ? 'root' : 'l' + Math.min(d.depth, 4)) + ')'; })
            .attr('stroke', function (d) {
                if (isDark) return d.depth === 0 ? '#5f5f5f' : '#2e2e2e';
                return d.depth === 0 ? '#b8b8b8' : '#d6d6d6';
            })
            .attr('stroke-width', function (d) { return d.depth === 0 ? 1.5 : 1; })
            .attr('filter', 'url(#card-shadow)');

        nodeElements.each(function (d) {
            var g = d3.select(this);
            var isRoot = d.depth === 0;

            // цветная полоска-акцент сверху (цвет = сложность)
            g.append('rect').attr('class', 'node-accent-bar')
                .attr('width', 34).attr('height', 3).attr('rx', 1.5)
                .attr('x', -17)
                .attr('y', -d.cardHeight / 2 + 10)
                .attr('fill', difficultyColor(d.difficulty || 3))
                .attr('opacity', 0.85);

            // заголовок — до 2 строк
            var fs = fontScale();
            var titleLines = wrapTitle(d.label || '', isRoot ? 26 : 23);
            var titleStartY = -d.cardHeight / 2 + 34;
            titleLines.forEach(function (line, i) {
                g.append('text').attr('class', 'node-card-title')
                    .text(line)
                    .attr('text-anchor', 'middle')
                    .attr('x', 0)
                    .attr('y', titleStartY + i * 17)
                    .attr('font-size', ((isRoot ? 14 : 12.5) * fs).toFixed(2) + 'px')
                    .attr('fill', isDark ? '#ececec' : '#1a1a1a');
            });

            // описание — одна строка, ниже заголовка
            if (d.description) {
                var descY = Math.max(d.cardHeight / 2 - 32, titleStartY + (titleLines.length - 1) * 17 + 14);
                g.append('text').attr('class', 'node-card-desc')
                    .text(truncateText(shortDescription(d.description), 34))
                    .attr('text-anchor', 'middle')
                    .attr('x', 0)
                    .attr('y', descY)
                    .attr('font-size', (10 * fs).toFixed(2) + 'px')
                    .attr('fill', isDark ? '#8f8f8f' : '#666666');
            }

            // сложность — точки слева снизу
            var diff = Math.min(5, Math.max(1, d.difficulty || 3));
            var footY = d.cardHeight / 2 - 14;
            var startX = -d.cardWidth / 2 + 14;
            for (var i = 0; i < 5; i++) {
                g.append('circle').attr('class', 'node-diff-dot')
                    .attr('cx', startX + i * 9)
                    .attr('cy', footY)
                    .attr('r', 2.5)
                    .attr('fill', i < diff ? difficultyColor(diff) : (isDark ? '#262626' : '#dcdcdc'));
            }

            // время — справа снизу
            if (d.time) {
                g.append('text').attr('class', 'node-card-time')
                    .text(truncateText(d.time, 16))
                    .attr('text-anchor', 'end')
                    .attr('x', d.cardWidth / 2 - 14)
                    .attr('y', footY + 3.5)
                    .attr('font-size', (9 * fs).toFixed(2) + 'px')
                    .attr('fill', isDark ? '#787878' : '#888888');
            }
        });

        // клик — модалка
        nodeElements.on('click', function (event, d) {
            event.stopPropagation();
            ModalManager.openModal(d, graphData);
        });

        // hover
        nodeElements.on('mouseenter', function (event, d) { applyHoverEffect(d.id); })
            .on('mouseleave', function () { removeHoverEffect(); });

        // анимация: волны по уровням, карточка выезжает из родительской
        var nodesByDepth = {};
        nodesFlat.forEach(function (n) {
            if (!nodesByDepth[n.depth]) nodesByDepth[n.depth] = [];
            nodesByDepth[n.depth].push(n);
        });
        var sortedDepths = Object.keys(nodesByDepth).map(Number).sort(function (a, b) { return a - b; });
        var cumDelay = 200;

        sortedDepths.forEach(function (dep) {
            nodesByDepth[dep].forEach(function (nd, idx) {
                var delay = cumDelay + idx * 60;
                setTimeout(function () {
                    var sel = nodeElements.filter(function (n) { return n.id === nd.id; });
                    var sx = width / 2, sy = height / 2;
                    if (nd.depth > 0) {
                        var pl = d3Hierarchy.links().find(function (l) { return l.target.data.id === nd.id; });
                        if (pl) { sx = nodeById[pl.source.data.id].tx; sy = nodeById[pl.source.data.id].ty; }
                    }
                    sel.attr('transform', 'translate(' + sx + ',' + sy + ') scale(0.45)').attr('opacity', 0)
                        .transition().duration(520).ease(d3.easeBackOut.overshoot(1.3))
                        .attr('opacity', 1).attr('transform', 'translate(' + nd.tx + ',' + nd.ty + ') scale(1)');
                }, delay);
            });
            cumDelay += nodesByDepth[dep].length * 60 + 320;
        });

        // линии — плавная прорисовка
        var linksByDepth = {};
        edgesProcessed.forEach(function (e) {
            if (!linksByDepth[e.source.depth]) linksByDepth[e.source.depth] = [];
            linksByDepth[e.source.depth].push(e);
        });
        var sortedLinkDeps = Object.keys(linksByDepth).map(Number).sort(function (a, b) { return a - b; });
        var linkDelay = 420;
        sortedLinkDeps.forEach(function (dep) {
            setTimeout(function () {
                linkElements.filter(function (l) { return l.source.depth === dep; }).each(function () {
                    var pathEl = d3.select(this);
                    var totalLen = this.getTotalLength();
                    pathEl.attr('stroke-dasharray', totalLen).attr('stroke-dashoffset', totalLen)
                        .attr('stroke-opacity', isDark ? 0.5 : 0.8)
                        .transition().duration(700).ease(d3.easeQuadOut).attr('stroke-dashoffset', 0);
                });
            }, linkDelay);
            linkDelay += 280;
        });

        // плавный фокус: вписываем всё дерево в экран
        var totalAnimTime = cumDelay + 400;
        setTimeout(function () {
            var bx1 = Infinity, bx2 = -Infinity, by1 = Infinity, by2 = -Infinity;
            nodesFlat.forEach(function (n) {
                if (n.tx - n.cardWidth / 2 < bx1) bx1 = n.tx - n.cardWidth / 2;
                if (n.tx + n.cardWidth / 2 > bx2) bx2 = n.tx + n.cardWidth / 2;
                if (n.ty - n.cardHeight / 2 < by1) by1 = n.ty - n.cardHeight / 2;
                if (n.ty + n.cardHeight / 2 > by2) by2 = n.ty + n.cardHeight / 2;
            });
            var bw = Math.max(1, bx2 - bx1), bh = Math.max(1, by2 - by1);
            var scale = Math.min(1, (width - 120) / bw, (height - 180) / bh);
            scale = Math.max(scale, 0.2);
            var tx = width / 2 - (bx1 + bx2) / 2 * scale;
            var ty = height / 2 - (by1 + by2) / 2 * scale;
            var transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
            svg.transition().duration(900).ease(d3.easeCubicInOut).call(zoomBehavior.transform, transform);
        }, totalAnimTime);

        // публичный метод для подсветки связей
window._graphHighlight = function (nodeId) {
            highlightConnections(nodeId, nodesFlat);
        };
    }

    return { renderGraph: renderGraph };
})();
