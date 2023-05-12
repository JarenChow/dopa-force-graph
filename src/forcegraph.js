let graph = new dopa.Canvas({
  container: '#graph',
  duration: Infinity
});

// 初始化静态属性和资源
const RADIUS = 25;
const far = ___FONT_AWESOME___.styles.far;
const paths = [];
for (let key in far) {
  let icon = far[key];
  let width = icon[0], height = icon[1], svgPath = icon[4];
  if (width > 512 || height > 512) continue;
  let scale = RADIUS * Math.SQRT1_2 / (Math.max(width, height) / 2);
  let path = new dopa.Path(0, 0, svgPath);
  path.x = -width / 2 * scale;
  path.y = -height / 2 * scale;
  path.scaleX = scale;
  path.scaleY = scale;
  path.updateTransform();
  paths.push(path);
}
const colors = ['#68bdf6', '#6dce9e', '#faafc2', '#f2baf6', '#ff928c',
  '#fcea7e', '#ffc766', '#405f9e', '#a5abb6', '#78cecb', '#b88cbb',
  '#ced2d9', '#e84646', '#fa5f86', '#ffab1a', '#797b80', '#fcda19',
  '#c9d96f', '#47991f', '#70edee', '#ff75ea'].map((color) => {
  let rgb = new dopa.Rgb().fromHex(color);
  let lab = new dopa.Lab().fromRgb(rgb);
  lab.lightness -= 15;
  rgb.fromLab(lab);
  return {
    hex: color,
    darker: rgb.toHex()
  };
});
// 初始化基础对象
let nodes = [], links = [];
let root = graph.create('group');
let group = graph.create('group', {
  group: root
});
let background = graph.create('rect', {
  fillStyle: '#edededaa'
});
// 初始化两个回调
graph.on('resize', () => {
  let width = graph.width, height = graph.height;
  background.width = width;
  background.height = height;
  root.x = width / 2;
  root.y = height / 2;
});
graph.on('render', () => {
  background.fill();
  links.forEach((link) => {
    link.line.stroke();
  });
  nodes.forEach((node) => {
    if (node.mousein) {
      node.shadow.x = node.x;
      node.shadow.y = node.y;
      node.shadow.fill();
    }
    node.circle.fill().stroke();
    node.path.fill();
  });
});

// 随机数组元素
function rand(array) {
  return array[dopa.util.randInt(array.length)];
}

// 刷新元素属性
function refresh() {
  nodes.forEach((node) => {
    node.circle.x = node.path.x = node.x;
    node.circle.y = node.path.y = node.y;
  });
  links.forEach((link) => {
    link.line.startX = link.source.x;
    link.line.startY = link.source.y;
    link.line.endX = link.target.x;
    link.line.endY = link.target.y;
  });
}

// 初始化节点
let nodeMap = {
  id: 0,
  addNode() {
    let id = nodeMap.id++, color = rand(colors);
    let node = {
      id: id,
      shadow: graph.create('arc', {
        group: group,
        radius: RADIUS * 1.25,
        fillStyle: '#d3eeff'
      }),
      circle: graph.create('arc', {
        group: group,
        radius: RADIUS,
        fillStyle: color.hex,
        strokeStyle: color.darker,
        lineWidth: 2
      }),
      path: graph.create('path', {
        group: group,
        path: rand(paths),
        fillStyle: 'white'
      })
    };
    nodes.unshift(node);
    nodeMap[id] = node;
    return node;
  }
};
for (let i = 0; i < 25; i++) nodeMap.addNode();
// 初始化连线
let linkMap = {
  addLink(source, target) {
    let key1 = source.id + '-' + target.id,
      key2 = target.id + '-' + source.id;
    if (linkMap[key1] || linkMap[key2]) return;
    links.push({
      source: source,
      target: target,
      line: graph.create('line', {
        group: group,
        lineWidth: 2,
        strokeStyle: 'grey'
      })
    });
    linkMap[key1] = linkMap[key2] = true;
  }
};
nodes.reduce((previous, current) => {
  linkMap.addLink(previous, current);
  return current;
});
for (let i = 1; i < nodes.length / 4; i++) {
  let source = rand(nodes), target;
  do target = rand(nodes); while (target === source);
  linkMap.addLink(source, target);
}
// 初始化 d3-force
let forceLink = d3.forceLink(links);
let simulation = d3.forceSimulation(nodes)
  .force('link', forceLink)
  .force('manyBody', d3.forceManyBody())
  .force('collide', d3.forceCollide(RADIUS * 1.6))
  .force('center', d3.forceCenter(0, 0))
  .on('tick', refresh)
  .alphaTarget(0.005);
// 初始化事件相关
let pointer = null;
graph.on('pointerdown', () => {
  locate.pause();
  if (pointer === null) return;
  simulation.alphaTarget(0.1);
  pointer.fx = pointer.circle.x;
  pointer.fy = pointer.circle.y;
});
graph.on('pointermove', (ev) => {
  loop.start();
  switch (ev.buttons) {
    case 0:
      let last = pointer;
      pointer = null;
      nodes.forEach((node) => {
        node.mousein = node.circle.isPointInPath(ev.x, ev.y);
        if (node.mousein) pointer = node;
      });
      if (last === null ^ pointer === null) {
        graph.cursor = pointer ? 'pointer' : 'move';
      }
      break;
    default:
      if (pointer) {
        pointer.circle.drag(ev.movementX, ev.movementY);
        pointer.path.drag(ev.movementX, ev.movementY);
        pointer.fx = pointer.circle.x;
        pointer.fy = pointer.circle.y;
      } else {
        group.drag(ev.movementX, ev.movementY);
      }
      break;
  }
});
graph.on('pointerup', () => {
  if (pointer === null) return;
  pointer.fx = pointer.fy = null;
  simulation.alphaTarget(0.005);
});
graph.on('wheel', (ev) => {
  locate.pause();
  smooth.zooming = ev.zooming;
  smooth.x = ev.x - root.x;
  smooth.y = ev.y - root.y;
  smooth.start();
});
graph.on('dblclick', () => {
  if (pointer === null) return;
  let count = dopa.util.randInt(1, 5), angle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    let node = nodeMap.addNode();
    linkMap.addLink(pointer, node);
    forceLink.links(links);
    simulation.nodes(nodes).alpha(0.3);
    node.x = pointer.x + RADIUS * Math.sqrt(i) * Math.cos(angle * i);
    node.y = pointer.y + RADIUS * Math.sqrt(i) * Math.sin(angle * i);
    refresh();
  }
});
graph.on('visibilitychange', () => {
  graph.visible ? graph.render() : graph.pause();
});
// 初始化动画相关
let located = null,
  easeInOut = dopa.ease.quadInOut,
  easeOut = dopa.ease.quadOut,
  lerp = dopa.util.lerp;
graph.locateNode = (id) => {
  located = nodeMap[id];
  locate.start();
};
let locate = graph.create('animator', {
  onstart() {
    this.fromX = group.x;
    this.fromY = group.y;
    this.incrementX = root.x - located.circle.e;
    this.incrementY = root.y - located.circle.f;
    scale.duration = this.duration;
    scale.start();
  },
  onupdate(ratio) {
    ratio = easeInOut(ratio);
    group.x = this.fromX + this.incrementX * ratio;
    group.y = this.fromY + this.incrementY * ratio;
  },
  duration: 5000
});
let scale = graph.create('animator', {
  onupdate(ratio) {
    root.scaleX = root.scaleY = ratio < 0.5 ?
      1 + (0.125 - 1) * easeInOut(ratio / 0.5) :
      0.125 + (1 - 0.125) * easeInOut((ratio - 0.5) / 0.5);
  }
});
let loop = graph.create('animator', {
  onfinish() {
    let id;
    do id = dopa.util.randInt(nodes.length); while (id === (located && located.id));
    graph.locateNode(id);
    this.start();
  },
  duration: 7500
}).start();
let smooth = graph.create('animator', {
  onstart() {
    let fromScale = group.scaleX,
      toScale = dopa.util.limitNumber(fromScale * this.zooming, 0.125, 8);
    this.fromScale = fromScale;
    this.toScale = toScale;
    let zooming = toScale / fromScale;
    this.fromX = group.x;
    this.fromY = group.y;
    this.toX = lerp(this.x, group.x, zooming);
    this.toY = lerp(this.y, group.y, zooming);
    this.duration = ((zooming < 1 ? 1 / zooming : zooming) - 1) * 400;
  },
  onupdate(ratio) {
    ratio = easeOut(ratio);
    group.scaleX = group.scaleY = lerp(this.fromScale, this.toScale, ratio);
    group.x = lerp(this.fromX, this.toX, ratio);
    group.y = lerp(this.fromY, this.toY, ratio);
    group.updateTransform();
  }
});
