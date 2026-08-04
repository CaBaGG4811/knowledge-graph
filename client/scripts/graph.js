/* graph.js — D3.js модуль рендера деревьев знаний */
const GraphRenderer = (function () {
    'use strict';

    var CARD_SIZES = {
        0: { width: 240, height: 80 },
        1: { width: 200, height: 68 },
        2: { width: 180, height: 60 },
        3: { width: 160, height: 52 },
        4: { width: 140, height: 48 }
    };

    var CARD_STYLES = {
        0: { fill: '#1a1a1a', stroke: '#444444', strokeWidth: 1.5, titleColor: '#e0e0e0', descColor: '#888888' },
        1: { fill: '#111111', stroke: '#333333', strokeWidth: 1, titleColor: '#e0e0e0', descColor: '#888888' },
        2: { fill: '#111111', stroke: '#333333', strokeWidth: 1, titleColor: '#e0e0e0', descColor: '#888888' },
        3: { fill: '#111111', stroke: '#333333', strokeWidth: 1, titleColor: '#e0e0e0', descColor: '#888888' },
        4: { fill: '#111111', stroke: '#333333', strokeWidth: 1, titleColor: '#e0e0e0', descColor: '#888888' }
    };

    var currentEdgesProcessed = [];

    function truncateText(text, maxLen) {
        if (!text) return '';
        return text.length <= maxLen ? text : text.substring(0, maxLen - 1) + '\u2026';
    }

    function shortDescription(text) {
        if (!text) return '';
        var sentences = text.match(/[^.!?]+[.!?]+/g);
        if (!sentences || sentences.length <= 2) return text;
        return (sentences[0] + sentences[1]).trim();
    }

    function computeCardWidth(depth, titleLen, descLen) {
        var base = CARD_SIZES[depth] || CARD_SIZES[4];
        var w = base.width;
        if (titleLen > 16) w += (titleLen - 16) * 2;
        if (descLen > 35) w += (descLen - 35) * 1;
        return Math.min(290, Math.max(w, base.width));
    }

    function findRootNodeId(nodes, edges) {
        if (!nodes || nodes.length === 0) return null;
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

    function renderGraph(graphData, topicName) {
        var container = document.getElementById('graph-container');
        if (!container) return;
        container.innerHTML = '';
        currentEdgesProcessed = [];
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

        var width = window.innerWidth;
        var height = window.innerHeight;

        var svg = d3.select('#graph-container').append('svg').attr('width', width).attr('height', height);

        var isDark = (Store.get('settings') || {}).theme !== 'light';
        var styles = CARD_STYLES;

        var defs = svg.append('defs');

        var bgGrad = defs.append('radialGradient').attr('id', 'vignette-bg').attr('cx', '50%').attr('cy', '55%').attr('r', '55%');
        bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0a0a0a');
        bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#000000');
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#vignette-bg)');

        var linkGrad = defs.append('linearGradient').attr('id', 'link-gradient').attr('gradientUnits', 'userSpaceOnUse');
        linkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#444444');
        linkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#333333');

        var graphGroup = svg.append('g').attr('class', 'graph-root');
        var positionKey = 'graph_pos_' + (topicName || '').replace(/\s+/g, '_');
        var zoomBehavior = d3.zoom().scaleExtent([0.15, 4]).on('zoom', function (e) {
            graphGroup.attr('transform', e.transform);
            try { localStorage.setItem(positionKey, JSON.stringify({ x: e.transform.x, y: e.transform.y, k: e.transform.k })); } catch (ex) {}
        });
        svg.call(zoomBehavior);

        // дерево
        var rootId = findRootNodeId(graphData.nodes, graphData.edges);
        var hierarchyRoot = buildHierarchy(graphData.nodes, graphData.edges, rootId);
        var d3Hierarchy = d3.hierarchy(hierarchyRoot);

        d3.tree().nodeSize([520, 240])(d3Hierarchy);

        // плоский массив
        var nodesFlat = [];
        d3Hierarchy.descendants().forEach(function (d) {
            var orig = d.data;
            var cw = computeCardWidth(d.depth, (orig.label || '').length, (orig.description || '').length);
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

        // центрируем
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodesFlat.forEach(function (n) {
            if (n.tx < minX) minX = n.tx;
            if (n.tx > maxX) maxX = n.tx;
            if (n.ty < minY) minY = n.ty;
            if (n.ty > maxY) maxY = n.ty;
        });
        var offX = width / 2 - (minX + maxX) / 2;
        var offY = height * 0.8 - maxY;
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

        // кривые
        var linkGroup = graphGroup.append('g').attr('class', 'links-layer');
        function curvePath(src, tgt) {
            var sx = src.tx, sy = src.ty + src.cardHeight / 2;
            var tx = tgt.tx, ty = tgt.ty - tgt.cardHeight / 2;
            var dy = ty - sy;
            var dx = tx - sx;
            var cp1y = sy + dy * 0.4;
            var cp2y = sy + dy * 0.6;
            var cp1x = sx + dx * 0.1;
            var cp2x = tx - dx * 0.1;
            return 'M ' + sx + ' ' + sy + ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + tx + ' ' + ty;
        }

        var rootNode = nodeById[rootId];
        if (rootNode) {
            linkGrad.attr('x1', rootNode.tx).attr('y1', rootNode.ty).attr('x2', rootNode.tx).attr('y2', rootNode.ty - 300);
        }

        var linkElements = linkGroup.selectAll('path').data(edgesProcessed).enter()
            .append('path').attr('class', 'graph-link')
            .attr('stroke', '#555555')
            .attr('stroke-width', function (d) { return d.source.depth === 0 ? 2 : 1.5; })
            .attr('stroke-opacity', 0)
            .attr('d', function (d) { return curvePath(d.source, d.target); });

        // карточки
        var nodeGroup = graphGroup.append('g').attr('class', 'nodes-layer');
        var nodeElements = nodeGroup.selectAll('g').data(nodesFlat).enter()
            .append('g').attr('class', 'knowledge-node')
            .attr('opacity', 0)
            .attr('transform', function (d) { return 'translate(' + d.tx + ',' + d.ty + ')'; });

        // основной rect — строгий стиль
        nodeElements.append('rect').attr('class', 'node-card-rect')
            .attr('width', function (d) { return d.cardWidth; })
            .attr('height', function (d) { return d.cardHeight; })
            .attr('x', function (d) { return -d.cardWidth / 2; })
            .attr('y', function (d) { return -d.cardHeight / 2; })
            .attr('rx', 2).attr('ry', 2)
            .attr('fill', function (d) {
                if (d.depth === 0) return '#141414';
                return '#0e0e0e';
            })
            .attr('stroke', '#222222')
            .attr('stroke-width', 1);

        // заголовок
        nodeElements.append('text').attr('class', 'node-card-title')
            .text(function (d) { return truncateText(d.label, 22); })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
            .attr('x', 0)
            .attr('y', function (d) { return d.depth === 0 ? -8 : -6; })
            .attr('font-size', function (d) { return d.depth === 0 ? '11px' : d.depth === 1 ? '10px' : '9px'; })
            .attr('fill', function (d) { return isDark ? '#e0e0e0' : '#1a1a1a'; });

        // описание (1 строка)
        nodeElements.append('text').attr('class', 'node-card-desc')
            .text(function (d) {
                if (!d.description) return '';
                return truncateText(shortDescription(d.description), 30);
            })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
            .attr('x', 0)
            .attr('y', function (d) { return d.depth === 0 ? 8 : 7; })
            .attr('font-size', '7px')
            .attr('fill', function (d) { return isDark ? '#888888' : '#666666'; })
            .attr('opacity', function (d) { return d.description ? 0.8 : 0; });

        // мета: время (снизу)
        nodeElements.append('text').attr('class', 'node-card-meta')
            .text(function (d) {
                var parts = [];
                if (d.time) parts.push(d.time);
                return parts.join('  ');
            })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
            .attr('x', 0)
            .attr('y', function (d) { return d.cardHeight / 2 - 8; })
            .attr('font-size', '7px')
            .attr('fill', function (d) { return isDark ? '#666666' : '#999999'; })
            .attr('opacity', 0.7);

        // шкала сложности (точки снизу-слева)
        nodeElements.each(function (d) {
            var g = d3.select(this);
            var diff = d.difficulty || 3;
            var startX = -d.cardWidth / 2 + 10;
            var y = d.cardHeight / 2 - 8;
            for (var i = 0; i < 5; i++) {
                g.append('circle')
                    .attr('cx', startX + i * 8)
                    .attr('cy', y)
                    .attr('r', 2)
                    .attr('fill', function () {
                        if (i >= diff) return '#1a1a1a';
                        if (diff <= 2) return '#666666';
                        if (diff === 3) return '#555555';
                        return '#444444';
                    });
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

        // анимация волнами
        var nodesByDepth = {};
        nodesFlat.forEach(function (n) {
            if (!nodesByDepth[n.depth]) nodesByDepth[n.depth] = [];
            nodesByDepth[n.depth].push(n);
        });
        var sortedDepths = Object.keys(nodesByDepth).map(Number).sort(function (a, b) { return a - b; });
        var cumDelay = 0;
        var waveDelay = 180;

        sortedDepths.forEach(function (dep) {
            nodesByDepth[dep].forEach(function (nd, idx) {
                var delay = waveDelay + cumDelay + idx * 40;
                setTimeout(function () {
                    var sel = nodeElements.filter(function (n) { return n.id === nd.id; });
                    var sx = width / 2, sy = height / 2;
                    if (nd.depth > 0) {
                        var pl = d3Hierarchy.links().find(function (l) { return l.target.data.id === nd.id; });
                        if (pl) { sx = nodeById[pl.source.data.id].tx; sy = nodeById[pl.source.data.id].ty; }
                    }
                    sel.attr('transform', 'translate(' + sx + ',' + sy + ') scale(0.2)').attr('opacity', 0)
                        .transition().duration(400).ease(d3.easeCubicOut)
                        .attr('opacity', 1).attr('transform', 'translate(' + nd.tx + ',' + nd.ty + ') scale(1)');
                }, delay);
            });
            cumDelay += nodesByDepth[dep].length * 40 + 350;
        });

        // линии
        var linksByDepth = {};
        edgesProcessed.forEach(function (e) {
            if (!linksByDepth[e.source.depth]) linksByDepth[e.source.depth] = [];
            linksByDepth[e.source.depth].push(e);
        });
        var sortedLinkDeps = Object.keys(linksByDepth).map(Number).sort(function (a, b) { return a - b; });
        var linkDelay = waveDelay + 250;
        sortedLinkDeps.forEach(function (dep) {
            setTimeout(function () {
                linkElements.filter(function (l) { return l.source.depth === dep; }).each(function () {
                    var pathEl = d3.select(this);
                    var totalLen = this.getTotalLength();
                    pathEl.attr('stroke-dasharray', totalLen).attr('stroke-dashoffset', totalLen)
                        .attr('stroke-opacity', 0.4)
                        .transition().duration(750).ease(d3.easeQuadOut).attr('stroke-dashoffset', 0);
                });
            }, linkDelay);
            linkDelay += 250;
        });

        // фокус на корень
        var totalAnimTime = waveDelay + sortedDepths.length * 400 + 500;
        setTimeout(function () {
            if (!rootNode) return;
            var scale = 0.85;
            var tx = width / 2 - rootNode.tx * scale;
            var ty = height / 2 - rootNode.ty * scale;
            var transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
            svg.transition().duration(800).ease(d3.easeCubicInOut).call(zoomBehavior.transform, transform);
        }, totalAnimTime);

        // публичный метод для подсветки связей
        window._graphHighlight = function (nodeId) {
            highlightConnections(nodeId, nodesFlat);
        };

        // сохранение позиции
        var savedPos = null;
        try { savedPos = JSON.parse(localStorage.getItem(positionKey)); } catch (ex) {}
        if (savedPos) {
            var initTransform = d3.zoomIdentity.translate(savedPos.x, savedPos.y).scale(savedPos.k);
            svg.call(zoomBehavior.transform, initTransform);
        }

        // поиск по графу
        window._graphSearch = function (query) {
            if (!query) { removeHoverEffect(); return; }
            var q = query.toLowerCase();
            d3.selectAll('.knowledge-node').each(function (d) {
                var match = (d.label || '').toLowerCase().indexOf(q) !== -1 || (d.description || '').toLowerCase().indexOf(q) !== -1;
                d3.select(this).classed('dimmed', !match).classed('highlighted', match);
            });
        };

        // публичные методы
        window._graphExportPdf = function () {
            var svgEl = document.querySelector('#graph-container svg');
            if (!svgEl) return;
            if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
                Toast.show(I18n.t('pdfLibsMissing') || 'Libraries not loaded', 'error');
                return;
            }
            Toast.show(I18n.t('pdfExporting') || 'Exporting PDF...', 'info');
            html2canvas(svgEl, { backgroundColor: '#000000', scale: 2 }).then(function (canvas) {
                var imgData = canvas.toDataURL('image/png');
                var pdf = new jspdf.jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save((topicName || 'knowledge-tree') + '.pdf');
                Toast.show(I18n.t('pdfSaved') || 'PDF saved', 'success');
            }).catch(function () { Toast.show(I18n.t('pdfError') || 'Export error', 'error'); });
        };

        window._graphUpdateNode = function (nodeId, newData) {
            var node = nodesFlat.find(function (n) { return n.id === nodeId; });
            if (!node) return;
            if (newData.label !== undefined) node.label = newData.label;
            if (newData.description !== undefined) node.description = newData.description;
            var sel = nodeElements.filter(function (n) { return n.id === nodeId; });
            sel.select('.node-card-title').text(function (d) { return truncateText(d.label, 22); });
            sel.select('.node-card-desc').text(function (d) {
                if (!d.description) return '';
                return truncateText(shortDescription(d.description), 30);
            });
        };

        window._getCurrentGraphData = function () { return graphData; };
    }

    return { renderGraph: renderGraph };
})();
