/* graph.js — D3.js модуль рендера деревьев знаний с темами */
const GraphRenderer = (function () {
    'use strict';

    /* ============================================
       THEMES
       ============================================ */
    var THEMES = {
        sharp: {
            name: 'Sharp',
            bg: ['#0a0a0a', '#000000'],
            nodeFill: '#111111',
            nodeFillRoot: '#1a1a1a',
            nodeStroke: '#2a2a2a',
            nodeStrokeWidth: 1.5,
            titleColor: '#e8e8e8',
            descColor: '#777777',
            metaColor: '#555555',
            linkColor: '#333333',
            linkWidth: 1.5,
            linkWidthRoot: 2.5,
            linkOpacity: 0.5,
            accentRoot: '#4a9eff',
            accentMid: '#333333',
            accentLeaf: '#222222',
            cornerRadius: 1,
            shadow: false,
            glow: false
        },
        neon: {
            name: 'Neon',
            bg: ['#050510', '#000008'],
            nodeFill: '#0c0c1a',
            nodeFillRoot: '#10102a',
            nodeStroke: '#00ffcc',
            nodeStrokeWidth: 1.2,
            titleColor: '#00ffcc',
            descColor: '#66ffdd',
            metaColor: '#00aa88',
            linkColor: '#00ffcc',
            linkWidth: 1.2,
            linkWidthRoot: 2,
            linkOpacity: 0.45,
            accentRoot: '#ff0066',
            accentMid: '#00ffcc',
            accentLeaf: '#6633ff',
            cornerRadius: 0,
            shadow: true,
            glow: true,
            glowColor: '#00ffcc'
        },
        glass: {
            name: 'Glass',
            bg: ['#111118', '#0a0a10'],
            nodeFill: 'rgba(255,255,255,0.04)',
            nodeFillRoot: 'rgba(255,255,255,0.07)',
            nodeStroke: 'rgba(255,255,255,0.12)',
            nodeStrokeWidth: 1,
            titleColor: '#e0e0e0',
            descColor: '#999999',
            metaColor: '#777777',
            linkColor: 'rgba(255,255,255,0.1)',
            linkWidth: 1,
            linkWidthRoot: 1.8,
            linkOpacity: 0.4,
            accentRoot: '#a78bfa',
            accentMid: '#60a5fa',
            accentLeaf: '#34d399',
            cornerRadius: 6,
            shadow: true,
            glow: false
        },
        cyber: {
            name: 'Cyber',
            bg: ['#0a000a', '#000005'],
            nodeFill: '#0f0f1f',
            nodeFillRoot: '#1a1030',
            nodeStroke: '#ff3366',
            nodeStrokeWidth: 1.5,
            titleColor: '#ff3366',
            descColor: '#ff6699',
            metaColor: '#cc2255',
            linkColor: '#ff3366',
            linkWidth: 1.5,
            linkWidthRoot: 2.5,
            linkOpacity: 0.4,
            accentRoot: '#ffff00',
            accentMid: '#ff3366',
            accentLeaf: '#00ccff',
            cornerRadius: 0,
            shadow: true,
            glow: true,
            glowColor: '#ff3366'
        },
        minimal: {
            name: 'Minimal',
            bg: ['#fafafa', '#ffffff'],
            nodeFill: '#ffffff',
            nodeFillRoot: '#f5f5f5',
            nodeStroke: '#222222',
            nodeStrokeWidth: 2,
            titleColor: '#111111',
            descColor: '#666666',
            metaColor: '#999999',
            linkColor: '#cccccc',
            linkWidth: 1.5,
            linkWidthRoot: 2.5,
            linkOpacity: 0.6,
            accentRoot: '#111111',
            accentMid: '#444444',
            accentLeaf: '#888888',
            cornerRadius: 2,
            shadow: false,
            glow: false
        },
        ocean: {
            name: 'Ocean',
            bg: ['#020c1b', '#010a15'],
            nodeFill: '#0a192f',
            nodeFillRoot: '#112240',
            nodeStroke: '#64ffda',
            nodeStrokeWidth: 1.2,
            titleColor: '#ccd6f6',
            descColor: '#8892b0',
            metaColor: '#5a6a8a',
            linkColor: '#233554',
            linkWidth: 1.5,
            linkWidthRoot: 2.5,
            linkOpacity: 0.5,
            accentRoot: '#64ffda',
            accentMid: '#5eead4',
            accentLeaf: '#38bdf8',
            cornerRadius: 3,
            shadow: true,
            glow: false
        }
    };

    var SHAPES = {
        rectangle: { rx: 0, ry: 0 },
        sharp: { rx: 1, ry: 1 },
        rounded: { rx: 8, ry: 8 },
        pill: { rx: 999, ry: 999 }
    };

    var currentTheme = 'sharp';
    var currentShape = 'sharp';
    var currentEdgesProcessed = [];

    /* ============================================
       HELPERS
       ============================================ */

    function getTheme() { return THEMES[currentTheme] || THEMES.sharp; }

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

    var CARD_SIZES = {
        0: { width: 260, height: 88 },
        1: { width: 220, height: 74 },
        2: { width: 190, height: 64 },
        3: { width: 170, height: 56 },
        4: { width: 150, height: 50 }
    };

    function computeCardWidth(depth, titleLen, descLen) {
        var base = CARD_SIZES[depth] || CARD_SIZES[4];
        var w = base.width;
        if (titleLen > 16) w += (titleLen - 16) * 2;
        if (descLen > 35) w += (descLen - 35) * 1;
        return Math.min(320, Math.max(w, base.width));
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
        var th = getTheme();
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
        var connected = getConnectedNodeIds(nodeId);
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

    /* ============================================
       NODE SHAPE DRAWING
       ============================================ */

    function drawNodeShape(sel, d, th, depth) {
        var w = d.cardWidth;
        var h = d.cardHeight;
        var shape = SHAPES[currentShape] || SHAPES.sharp;
        var rx = shape.rx;
        var ry = shape.ry;

        // root accent bar
        if (depth === 0) {
            sel.append('rect')
                .attr('class', 'node-accent-bar')
                .attr('width', w).attr('height', 3)
                .attr('x', -w / 2).attr('y', -h / 2)
                .attr('fill', th.accentRoot)
                .attr('rx', rx).attr('ry', ry);
        }

        // main rect
        sel.append('rect')
            .attr('class', 'node-card-rect')
            .attr('width', w).attr('height', h)
            .attr('x', -w / 2).attr('y', -h / 2)
            .attr('rx', rx).attr('ry', ry)
            .attr('fill', depth === 0 ? th.nodeFillRoot : th.nodeFill)
            .attr('stroke', th.nodeStroke)
            .attr('stroke-width', th.nodeStrokeWidth);

        // glow effect
        if (th.glow && depth <= 1) {
            sel.append('rect')
                .attr('class', 'node-glow')
                .attr('width', w + 6).attr('height', h + 6)
                .attr('x', -w / 2 - 3).attr('y', -h / 2 - 3)
                .attr('rx', rx + 2).attr('ry', ry + 2)
                .attr('fill', 'none')
                .attr('stroke', th.glowColor || th.nodeStroke)
                .attr('stroke-width', 1)
                .attr('opacity', 0.3);
        }

        // shadow
        if (th.shadow) {
            sel.insert('rect', ':first-child')
                .attr('class', 'node-shadow')
                .attr('width', w).attr('height', h)
                .attr('x', -w / 2 + 2).attr('y', -h / 2 + 3)
                .attr('rx', rx).attr('ry', ry)
                .attr('fill', 'rgba(0,0,0,0.35)');
        }
    }

    /* ============================================
       RENDER
       ============================================ */

    function renderGraph(graphData, topicName) {
        var container = document.getElementById('graph-container');
        if (!container) return;
        container.innerHTML = '';
        currentEdgesProcessed = [];
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

        var th = getTheme();
        var isDark = currentTheme !== 'minimal';
        var width = window.innerWidth;
        var height = window.innerHeight;

        var svg = d3.select('#graph-container').append('svg').attr('width', width).attr('height', height);

        // defs
        var defs = svg.append('defs');

        var bgGrad = defs.append('radialGradient').attr('id', 'vignette-bg').attr('cx', '50%').attr('cy', '55%').attr('r', '55%');
        bgGrad.append('stop').attr('offset', '0%').attr('stop-color', th.bg[0]);
        bgGrad.append('stop').attr('offset', '100%').attr('stop-color', th.bg[1]);
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#vignette-bg)');

        // glow filter
        if (th.glow) {
            var filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
            filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', function (d) { return d; });
        }

        var graphGroup = svg.append('g').attr('class', 'graph-root');
        var positionKey = 'graph_pos_' + (topicName || '').replace(/\s+/g, '_');
        var zoomBehavior = d3.zoom().scaleExtent([0.15, 4]).on('zoom', function (e) {
            graphGroup.attr('transform', e.transform);
            try { localStorage.setItem(positionKey, JSON.stringify({ x: e.transform.x, y: e.transform.y, k: e.transform.k })); } catch (ex) {}
        });
        svg.call(zoomBehavior);

        // tree layout
        var rootId = findRootNodeId(graphData.nodes, graphData.edges);
        var hierarchyRoot = buildHierarchy(graphData.nodes, graphData.edges, rootId);
        var d3Hierarchy = d3.hierarchy(hierarchyRoot);
        d3.tree().nodeSize([560, 260])(d3Hierarchy);

        // flat nodes
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

        // center
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

        // edges
        var edgesProcessed = [];
        d3Hierarchy.links().forEach(function (link) {
            if (nodeById[link.source.data.id] && nodeById[link.target.data.id]) {
                edgesProcessed.push({ source: nodeById[link.source.data.id], target: nodeById[link.target.data.id] });
            }
        });
        currentEdgesProcessed = edgesProcessed;

        // draw links
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

        var linkElements = linkGroup.selectAll('path').data(edgesProcessed).enter()
            .append('path').attr('class', 'graph-link')
            .attr('stroke', th.linkColor)
            .attr('stroke-width', function (d) { return d.source.depth === 0 ? th.linkWidthRoot : th.linkWidth; })
            .attr('stroke-opacity', 0)
            .attr('d', function (d) { return curvePath(d.source, d.target); });

        // draw nodes
        var nodeGroup = graphGroup.append('g').attr('class', 'nodes-layer');
        var nodeElements = nodeGroup.selectAll('g').data(nodesFlat).enter()
            .append('g').attr('class', 'knowledge-node')
            .attr('opacity', 0)
            .attr('transform', function (d) { return 'translate(' + d.tx + ',' + d.ty + ')'; });

        // draw shapes
        nodeElements.each(function (d) {
            drawNodeShape(d3.select(this), d, th, d.depth);
        });

        // title
        nodeElements.append('text').attr('class', 'node-card-title')
            .text(function (d) { return truncateText(d.label, 24); })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
            .attr('x', 0)
            .attr('y', function (d) { return d.depth === 0 ? -8 : -6; })
            .attr('font-size', function (d) { return d.depth === 0 ? '12px' : d.depth === 1 ? '11px' : '10px'; })
            .attr('fill', th.titleColor)
            .attr('font-weight', function (d) { return d.depth === 0 ? '700' : '600'; });

        // description
        nodeElements.append('text').attr('class', 'node-card-desc')
            .text(function (d) {
                if (!d.description) return '';
                return truncateText(shortDescription(d.description), 32);
            })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
            .attr('x', 0)
            .attr('y', function (d) { return d.depth === 0 ? 8 : 7; })
            .attr('font-size', '8px')
            .attr('fill', th.descColor)
            .attr('opacity', function (d) { return d.description ? 0.85 : 0; });

        // meta (time)
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
            .attr('fill', th.metaColor)
            .attr('opacity', 0.7);

        // difficulty dots
        nodeElements.each(function (d) {
            var g = d3.select(this);
            var diff = d.difficulty || 3;
            var startX = -d.cardWidth / 2 + 10;
            var y = d.cardHeight / 2 - 8;
            for (var i = 0; i < 5; i++) {
                g.append('circle')
                    .attr('cx', startX + i * 8)
                    .attr('cy', y)
                    .attr('r', 2.5)
                    .attr('fill', function () {
                        if (i >= diff) return th.nodeStroke + '33';
                        if (diff <= 2) return th.accentMid;
                        if (diff === 3) return th.accentMid + 'cc';
                        return th.accentLeaf || th.accentMid + '88';
                    });
            }
        });

        // click → modal
        nodeElements.on('click', function (event, d) {
            event.stopPropagation();
            ModalManager.openModal(d, graphData);
        });

        // hover
        nodeElements.on('mouseenter', function (event, d) { applyHoverEffect(d.id); })
            .on('mouseleave', function () { removeHoverEffect(); });

        // wave animation
        var nodesByDepth = {};
        nodesFlat.forEach(function (n) {
            if (!nodesByDepth[n.depth]) nodesByDepth[n.depth] = [];
            nodesByDepth[n.depth].push(n);
        });
        var sortedDepths = Object.keys(nodesByDepth).map(Number).sort(function (a, b) { return a - b; });
        var cumDelay = 0;
        var waveDelay = 160;

        sortedDepths.forEach(function (dep) {
            nodesByDepth[dep].forEach(function (nd, idx) {
                var delay = waveDelay + cumDelay + idx * 35;
                setTimeout(function () {
                    var sel = nodeElements.filter(function (n) { return n.id === nd.id; });
                    var sx = width / 2, sy = height / 2;
                    if (nd.depth > 0) {
                        var pl = d3Hierarchy.links().find(function (l) { return l.target.data.id === nd.id; });
                        if (pl) { sx = nodeById[pl.source.data.id].tx; sy = nodeById[pl.source.data.id].ty; }
                    }
                    sel.attr('transform', 'translate(' + sx + ',' + sy + ') scale(0.15)').attr('opacity', 0)
                        .transition().duration(420).ease(d3.easeCubicOut)
                        .attr('opacity', 1).attr('transform', 'translate(' + nd.tx + ',' + nd.ty + ') scale(1)');
                }, delay);
            });
            cumDelay += nodesByDepth[dep].length * 35 + 320;
        });

        // link animation
        var linksByDepth = {};
        edgesProcessed.forEach(function (e) {
            if (!linksByDepth[e.source.depth]) linksByDepth[e.source.depth] = [];
            linksByDepth[e.source.depth].push(e);
        });
        var sortedLinkDeps = Object.keys(linksByDepth).map(Number).sort(function (a, b) { return a - b; });
        var linkDelay = waveDelay + 220;
        sortedLinkDeps.forEach(function (dep) {
            setTimeout(function () {
                linkElements.filter(function (l) { return l.source.depth === dep; }).each(function () {
                    var pathEl = d3.select(this);
                    var totalLen = this.getTotalLength();
                    pathEl.attr('stroke-dasharray', totalLen).attr('stroke-dashoffset', totalLen)
                        .attr('stroke-opacity', th.linkOpacity)
                        .transition().duration(700).ease(d3.easeQuadOut).attr('stroke-dashoffset', 0);
                });
            }, linkDelay);
            linkDelay += 220;
        });

        // focus on root
        var totalAnimTime = waveDelay + sortedDepths.length * 380 + 400;
        setTimeout(function () {
            if (!nodeById[rootId]) return;
            var scale = 0.85;
            var tx = width / 2 - nodeById[rootId].tx * scale;
            var ty = height / 2 - nodeById[rootId].ty * scale;
            var transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
            svg.transition().duration(800).ease(d3.easeCubicInOut).call(zoomBehavior.transform, transform);
        }, totalAnimTime);

        // public methods
        window._graphHighlight = function (nodeId) { highlightConnections(nodeId, nodesFlat); };
        window._graphSearch = function (query) {
            if (!query) { removeHoverEffect(); return; }
            var q = query.toLowerCase();
            d3.selectAll('.knowledge-node').each(function (d) {
                var match = (d.label || '').toLowerCase().indexOf(q) !== -1 || (d.description || '').toLowerCase().indexOf(q) !== -1;
                d3.select(this).classed('dimmed', !match).classed('highlighted', match);
            });
        };

        window._graphExportPdf = function () {
            var svgEl = document.querySelector('#graph-container svg');
            if (!svgEl) return;
            if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
                Toast.show(I18n.t('pdfLibsMissing') || 'Libraries not loaded', 'error');
                return;
            }
            Toast.show(I18n.t('pdfExporting') || 'Exporting PDF...', 'info');
            html2canvas(svgEl, { backgroundColor: th.bg[1], scale: 2 }).then(function (canvas) {
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
            sel.select('.node-card-title').text(function (d) { return truncateText(d.label, 24); });
            sel.select('.node-card-desc').text(function (d) {
                if (!d.description) return '';
                return truncateText(shortDescription(d.description), 32);
            });
        };

        window._getCurrentGraphData = function () { return graphData; };

        // render toolbar
        renderToolbar();
    }

    /* ============================================
       STYLE TOOLBAR
       ============================================ */

    function renderToolbar() {
        var existing = document.getElementById('graph-toolbar');
        if (existing) existing.remove();

        var toolbar = document.createElement('div');
        toolbar.id = 'graph-toolbar';
        toolbar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;gap:6px;padding:8px 14px;background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.08);border-radius:12px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.5);';

        // theme selector
        var themeLabel = document.createElement('span');
        themeLabel.style.cssText = 'color:#888;font-size:11px;align-self:center;margin-right:4px;';
        themeLabel.textContent = 'THEME';
        toolbar.appendChild(themeLabel);

        Object.keys(THEMES).forEach(function (key) {
            var btn = document.createElement('button');
            btn.style.cssText = 'border:none;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;font-weight:600;letter-spacing:0.5px;transition:all 0.15s;';
            btn.textContent = THEMES[key].name;
            btn.dataset.theme = key;

            if (key === currentTheme) {
                btn.style.background = THEMES[key].accentRoot;
                btn.style.color = '#000';
            } else {
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.color = '#aaa';
            }

            btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(255,255,255,0.12)'; });
            btn.addEventListener('mouseleave', function () {
                btn.style.background = key === currentTheme ? THEMES[key].accentRoot : 'rgba(255,255,255,0.06)';
                btn.style.color = key === currentTheme ? '#000' : '#aaa';
            });

            btn.addEventListener('click', function () {
                currentTheme = key;
                var gd = window._getCurrentGraphData();
                if (gd) renderGraph(gd, document.querySelector('.home-topic-name') ? document.querySelector('.home-topic-name').textContent : '');
            });

            toolbar.appendChild(btn);
        });

        // separator
        var sep = document.createElement('div');
        sep.style.cssText = 'width:1px;background:rgba(255,255,255,0.1);margin:0 6px;align-self:stretch;';
        toolbar.appendChild(sep);

        // shape selector
        var shapeLabel = document.createElement('span');
        shapeLabel.style.cssText = 'color:#888;font-size:11px;align-self:center;margin-right:4px;';
        shapeLabel.textContent = 'SHAPE';
        toolbar.appendChild(shapeLabel);

        var shapeIcons = { rectangle: '▬', sharp: '▮', rounded: '▢', pill: '◎' };
        Object.keys(SHAPES).forEach(function (key) {
            var btn = document.createElement('button');
            btn.style.cssText = 'border:none;border-radius:6px;padding:5px 8px;font-size:13px;cursor:pointer;transition:all 0.15s;';
            btn.textContent = shapeIcons[key] || key;
            btn.dataset.shape = key;
            btn.title = key;

            if (key === currentShape) {
                btn.style.background = 'rgba(255,255,255,0.15)';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'rgba(255,255,255,0.04)';
                btn.style.color = '#777';
            }

            btn.addEventListener('click', function () {
                currentShape = key;
                var gd = window._getCurrentGraphData();
                if (gd) renderGraph(gd, document.querySelector('.home-topic-name') ? document.querySelector('.home-topic-name').textContent : '');
            });

            toolbar.appendChild(btn);
        });

        document.body.appendChild(toolbar);
    }

    /* ============================================
       PUBLIC API
       ============================================ */

    function setTheme(theme) {
        if (THEMES[theme]) currentTheme = theme;
    }

    function setShape(shape) {
        if (SHAPES[shape]) currentShape = shape;
    }

    function getThemes() { return THEMES; }
    function getShapes() { return SHAPES; }

    return {
        renderGraph: renderGraph,
        setTheme: setTheme,
        setShape: setShape,
        getThemes: getThemes,
        getShapes: getShapes
    };
})();
