import assert from 'node:assert/strict';
import {child, count, inventory, states, walk} from './styles.mjs';

const skipPath = ['stage', 'battlePanel', 'skip'];
const rewardPath = ['stage', 'battlePanel', 'rewardList', 'stsRewardPanel'];
const shopPath = ['stage', 'nodePanel', 'shopView', 'v25ShopCloth'];
const skipLegacy = new Map([['border', 'image'], ['plate', 'image'], ['v25StateChrome', 'container']]);
const retainedRolls = new Set(['upperRoll', 'lowerRoll']);
const stitch = /^stitch(?:-1|1)_\d$/;
const panelPaths = [rewardPath, shopPath];
const get = (root, path) => path.reduce(child, root);
const pathKey = (root, trail) => [root.name, ...trail].join('/');
const group = (name, children) => ({name, kind:'container', position:[0,0], size:[0,0], children});

function compactSkip(button) {
    assert.equal(button.kind, 'presetButton');
    assert.deepEqual(button.states, Object.fromEntries(states.map(s => [s,s])));
    assert.equal(count(button), 93, 'Reward skip experimental baseline drift');
    const result = structuredClone(button);
    for (const state of result.children) {
        const legacy = state.children.filter(part => skipLegacy.has(part.name));
        assert.equal(legacy.length, skipLegacy.size);
        assert(legacy.every(part => part.kind === skipLegacy.get(part.name) && part.visible === false));
        assert.equal(count(child(state, 'v25StateChrome')), 4);
        state.children = state.children.filter(part => !skipLegacy.has(part.name));
        assert.deepEqual(state.children.map(part => part.name), ['roundedButton','label']);
    }
    assert.equal(count(result), 69);
    return result;
}

function rewardPanelCandidate(panel, rectImage) {
    const vertical = child(panel, 'vertical');
    const horizontal = child(panel, 'horizontal');
    const rolls = panel.children.filter(part => retainedRolls.has(part.name));
    assert.equal(vertical.image, rectImage);
    assert.equal(horizontal.image, rectImage);
    assert.equal(vertical.colour, horizontal.colour);
    assert.equal(rolls.length, retainedRolls.size);
    assert.equal(count(panel), 9);
    return {...structuredClone(panel), children:[
        {...structuredClone(vertical), name:'surface', size:[...panel.size]},
        ...structuredClone(rolls),
    ]};
}

function shopPanelCandidate(panel) {
    assert.equal(count(panel), 19);
    const copy = structuredClone(panel);
    const removed = copy.children.filter(part => stitch.test(part.name));
    assert.equal(removed.length, 10);
    assert(removed.every(part => part.kind === 'image' && part.image === 100004));
    copy.children = copy.children.filter(part => !stitch.test(part.name));
    assert.equal(count(copy), 9);
    return copy;
}

// Keep the same real Skip control as the shared bank input sentinel in the panel cases.
function bank(button, panel) {
    const sample = {...structuredClone(button), name:'button0', position:panel ? [0,-270] : [0,0]};
    const background = {name:'background', kind:'image', image:100001, size:[1400,750], colour:'#282936'};
    return [background, ...(panel ? [structuredClone(panel)] : []), group('buttons',[group('row0',[sample])])];
}

const classes = {
    provenLegacy: {decision:'GO', scope:'Hidden in a verified four-state preset family. Prune only at the listed matching paths.'},
    provenPreset: {decision:'GO', scope:'Use the compact preset shape with original state mapping, hit region and caption.'},
    otherPreset: {decision:'KEEP', scope:'Retain this binding and art. It is outside the verified prune family.'},
    sampledPanel: {decision:'HOLD', scope:'Structural candidate. It removes visible art and needs appearance validation.'},
    sampledPanelArt: {decision:'KEEP', scope:'Retain the existing artwork in production while reviewing the panel candidate.'},
    layout: {decision:'KEEP', scope:'Retain ownership, transform and draw order. Hidden layout can still be updated.'},
    primitive: {decision:'KEEP', scope:'Keep the current geometry; individual primitive use is not evidence of safe composition replacement.'},
    gallery: {decision:'KEEP', scope:'Keep the existing sprite. Verify raw atlas and slice metadata before proposing substitution.'},
    text: {decision:'KEEP', scope:'Keep label bounds, alignment, content owner and accessible semantics.'},
    pointer: {decision:'KEEP', scope:'Keep input owner, raycast and capture behavior.'},
    virtualized: {decision:'KEEP', scope:'Keep grid lifetime, scrolling and template ownership.'},
    auxiliary: {decision:'KEEP', scope:'Retain the current native control until a focused probe establishes an alternative.'},
};

function census(layout) {
    const exactPresets = new Set(inventory(layout).map(({path}) => path));
    const verifiedSkip = pathKey(layout, skipPath);
    const comparedPanels = new Set(panelPaths.map(path => pathKey(layout, path)));
    const legacyRoots = new Set([...exactPresets, verifiedSkip].flatMap(path => states.flatMap(state =>
        [...skipLegacy.keys()].filter(name => name !== 'v25StateChrome' || path === verifiedSkip)
            .map(name => path + '/' + state + '/' + name))));
    exactPresets.add(verifiedSkip);

    const byKind = {}, byClass = {}, nodes = [];
    for (const [node, trail] of walk(layout)) {
        if (trail.length === 1) continue;
        const path = trail.join('/');
        const boundary = trail.map((_,i) => trail.slice(0,i+1).join('/'));
        const id = boundary.some(parent => legacyRoots.has(parent)) ? 'provenLegacy'
            : exactPresets.has(path) ? 'provenPreset'
            : comparedPanels.has(path) ? 'sampledPanel'
            : boundary.some(parent => comparedPanels.has(parent)) ? 'sampledPanelArt'
            : node.kind === 'presetButton' ? 'otherPreset'
            : node.kind === 'container' ? 'layout'
            : node.kind === 'image' ? (node.image <= 100006 ? 'primitive' : 'gallery')
            : ['text','textWindow'].includes(node.kind) ? 'text'
            : node.kind === 'cursorArea' ? 'pointer'
            : node.kind === 'grid' ? 'virtualized' : 'auxiliary';
        assert(node.kind, path);
        byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
        byClass[id] = (byClass[id] ?? 0) + 1;
        nodes.push([path, node.kind, id]);
    }
    assert.equal(byClass.provenLegacy, 248);
    return {scope:'One manifest of the generated run interface, excluding the logical root and separate templates.',
        total:nodes.length, byKind, byClass, classes, columns:['path','kind','class'], nodes};
}

export function supplemental(layout, theme) {
    const skip = get(layout, skipPath);
    const compact = compactSkip(skip);
    const reward = get(layout, rewardPath);
    const square = rewardPanelCandidate(reward, theme.image?.rect ?? 100001);
    const cloth = get(layout, shopPath);
    const simplerCloth = shopPanelCandidate(cloth);
    const cases = {
        skipA:bank(skip), skipB:bank(compact),
        rewardPanelA:bank(compact, reward), rewardPanelB:bank(compact, square),
        shopPanelA:bank(compact, cloth), shopPanelB:bank(compact, simplerCloth),
    };
    const describe = (path,a,b,decision,boundary) => ({path:pathKey(layout,path),
        A:count(a), B:count(b), saved:count(a)-count(b), decision, boundary});
    return {cases, report:{
        skip:describe(skipPath,skip,compact,'GO','Official-profile battle Skip keeps four state children and measured style. The bank exercises click and disabled gates without invoking reward transactions.'),
        rewardPanel:describe(rewardPath,reward,square,'HOLD','A uses the actual rounded reward shell. B uses a built-in rectangular image and keeps the two rolls. The 3-unit rounded corners are lost.'),
        shopPanel:describe(shopPath,cloth,simplerCloth,'HOLD','B keeps the existing cloth, shadow, seams and perimeter, with ten visible stitches removed. Gallery texture and full-page appearance require verification.'),
        census:census(layout),
    }};
}
