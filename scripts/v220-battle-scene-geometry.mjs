import {nativeShape} from './v25-battle-scene.mjs';

// Coordinates share the 1280×720 gameplay frame. Paint extends to x=-400…1680
// so visual-only mobile bleed can be filled without widening touch targets.
export const paintWidth = 2080;
export const sceneHeight = 720;
export const groundY = 493;
const left = -400;
const right = 1680;

const rect = (name, x, y, w, h, colour, opacity = 1) =>
  ({name, type: 'rect', box: [x, y, w, h], colour, opacity});
const poly = (name, points, colour) => ({name, type: 'polygon', points, colour, opacity: 1});
const line = (name, points, colour, width = 2, opacity = 1) =>
  ({name, type: 'line', points, colour, width, opacity});
const light = (name, box, colour, opacity) => ({name, type: 'ellipse', box, colour, opacity});
const fade = (name, box, colour, direction) =>
  ({name, type: 'fade', box, colour, direction, opacity: 1});

function floor(rear, palette) {
  const [colour, face, seam, chips, lip] = palette;
  const vanishingX = 670;
  const radialLines = [-390, -102, 156, 420, 960, 1254, 1536, 1840].map((x, index) =>
    line('Depth' + index, [[vanishingX + (x - vanishingX) * .27, rear + 4], [x, 721]], seam, 2, .3));
  const floorJoints = [rear + 23, 495, 547, 624].map((y, index) => {
    const offset = [480, 758, 543, 867][index];
    return line('PavingJoint' + index, [[left, y + 10], [300, y - 3],
      [offset, y + 1], [1000, y - 4], [right, y + 5]], seam, 2, .34);
  });
  return [
    rect('ContinuousStone', left, rear, paintWidth, sceneHeight - rear + 12, colour),
    rect('RaisedRearEdge', left, rear, paintWidth, 8, lip),
    poly('WestLargePaving', [[-68, 590], [267, 576], [364, 665], [-162, 680]], face),
    poly('EastLargePaving', [[952, 573], [1250, 585], [1465, 658], [1032, 650]], face),
    poly('FrontBrokenPaving', [[295, 694], [492, 649], [588, 704], [565, 720], [220, 720]], face),
    ...radialLines,
    ...floorJoints,
    line('WestBreak', [[114, 576], [152, 555], [142, 541], [177, 519]], chips, 2, .48),
    line('EastBreak', [[1103, 527], [1058, 541], [1068, 566], [1008, 590]], chips, 2, .45),
    fade('NearDepth', [left, 535, paintWidth, 197], '#172025', 'bottom'),
    poly('WestNearDebris', [[left, 681], [-140, 653], [42, 671], [133, 720], [left, 720]], '#202027'),
    poly('EastNearDebris', [[1142, 720], [1240, 666], [1413, 656], [right, 676], [right, 720]], '#202027'),
  ];
}

function basaltSealApproach() {
  const warmRock = '#654838';
  const sideRock = '#392B2D';
  const fissures = [
    [[-185, 0], [-110, 112], [-132, 262]],
    [[57, 47], [108, 113], [101, 202], [151, 254]],
    [[346, 104], [302, 188], [346, 247]],
    [[974, 120], [1008, 170], [989, 253]],
    [[1303, 11], [1220, 98], [1250, 148]],
    [[1534, 115], [1463, 251], [1512, 318]],
  ];
  return [
    ['Depth', [
      rect('OpaqueSky', left, 0, paintWidth, sceneHeight, '#312333'),
      rect('CoolStoneShell', left, 82, paintWidth, 368, '#382D41'),
      light('DeepAmethyst', [478, 148, 350, 318], '#755471', .29),
      poly('FarSteppedRidge', [[312, 417], [435, 410], [494, 372], [593, 357], [666, 314], [770, 350], [818, 397], [950, 422]], '#594552'),
      poly('FarBrokenRidge', [[396, 427], [579, 398], [642, 365], [715, 371], [835, 416], [956, 429]], '#4D414E'),
    ]],
    ['Ruins', [
      poly('WestBasaltWall', [[left, 0], [632, 0], [510, 80], [415, 113], [353, 261], [406, 369], [333, 444], [left, 444]], warmRock),
      poly('EastBasaltWall', [[696, 0], [right, 0], [right, 438], [933, 438], [850, 359], [916, 285], [866, 189], [849, 112]], '#5E4033'),
      poly('WestRecess', [[left, 17], [299, 47], [236, 135], [299, 231], [213, 436], [left, 437]], sideRock),
      poly('EastRecess', [[1034, 58], [right, 21], [right, 438], [1072, 429], [1113, 314], [1046, 220]], sideRock),
      poly('WestStoneFace', [[-310, 264], [42, 198], [151, 254], [113, 354], [31, 413], [-326, 414]], '#604439'),
      poly('EastStoneFace', [[1146, 264], [1275, 216], [1548, 260], [1577, 424], [1206, 402]], '#584035'),
      ...fissures.map((points, index) => line('Fissure' + index, points, '#8D6650', 3, .3)),
      poly('WestHewnBase', [[274, 437], [297, 383], [371, 365], [393, 394], [369, 437]], '#48362F'),
      poly('EastHewnBase', [[925, 438], [908, 392], [942, 368], [1009, 389], [1032, 438]], '#43332F'),
      poly('WestButtress', [[377, 337], [457, 333], [436, 392], [432, 416], [375, 432]], '#4B352E'),
      poly('WestButtressFace', [[379, 338], [407, 341], [404, 397], [375, 430]], '#73523E'),
      rect('WestMasonry', 365, 324, 199, 22, '#6B4C3B'),
      rect('WestMasonryShade', 375, 346, 185, 11, '#3C2B2B'),
      poly('EastButtress', [[810, 343], [908, 337], [911, 428], [849, 416], [828, 377]], '#46332C'),
      poly('EastButtressFace', [[868, 343], [908, 341], [911, 420], [886, 420]], '#6F4E3C'),
      rect('EastMasonry', 746, 328, 184, 22, '#664936'),
      rect('EastMasonryShade', 757, 350, 169, 11, '#3C2B2B'),
      ...[389, 448, 526, 782, 848, 906].map((x, index) =>
        line('StoneBlockBevel' + index, [[x, 332], [x - 8, 343]], '#8A6550', 2, .48)),
      ...[197, 1162].flatMap((x, index) => [
        poly('CarvedRockFace' + index, [[x - 34, 219], [x + 9, 190], [x + 29, 239], [x + 19, 332], [x - 42, 364]], '#523B36'),
        line('CarvedRockVein' + index, [[x + 7, 200], [x + 17, 247], [x - 2, 309], [x - 23, 338]], '#8B634C', 2, .37),
      ]),
      poly('SealObelisk', [[620, 406], [611, 311], [642, 267], [673, 312], [666, 406]], '#716047'),
      poly('SealObeliskFace', [[635, 400], [630, 314], [643, 293], [651, 325], [647, 399]], '#9C754B'),
      line('SealCarving', [[625, 342], [642, 323], [659, 342], [642, 367], [625, 342]], '#D29863', 3, .65),
      rect('SealPlinth', 595, 401, 97, 12, '#503E39'),
      rect('SealStep', 556, 413, 180, 15, '#614C40'),
      light('MutedSealReflection', [565, 323, 160, 142], '#B57955', .18),
      fade('DarkCeiling', [left, 0, paintWidth, 140], '#251E27', 'top'),
    ]],
    ['Paving', floor(437, ['#625047', '#68574A', '#AD876A', '#99775D', '#705747'])],
  ];
}

function jadeAqueductGallery() {
  const ribs = [-120, 102, 411, 764, 1195, 1451];
  const windows = [[226, 311], [292, 292], [531, 282], [592, 259], [659, 265],
    [861, 310], [918, 282], [980, 313], [1091, 299], [1332, 284]];
  return [
    ['Depth', [
      rect('OpaqueSky', left, 0, paintWidth, sceneHeight, '#24353E'),
      rect('DistantMist', left, 106, paintWidth, 325, '#405660'),
      light('MistBasin', [319, 88, 750, 430], '#71877D', .25),
      poly('UpperRidge', [[left, 326], [-88, 248], [134, 281], [316, 207], [465, 273], [647, 224], [821, 248], [1062, 224], [1315, 296], [right, 257], [right, 425], [left, 425]], '#405B64'),
      poly('LowerRidge', [[left, 385], [-115, 346], [276, 338], [476, 375], [691, 317], [897, 374], [1190, 344], [1408, 381], [right, 347], [right, 426], [left, 426]], '#385057'),
      ...windows.flatMap(([x, y], index) => {
        const low = index % 2 === 0;
        return [
          rect('FarCivicHall' + index, x - 17, y, 33, 423 - y, low ? '#43545A' : '#4C5C5D'),
          line('FarHallEave' + index, [[x - 23, y + 1], [x, y - 8], [x + 24, y + 1]], '#526868', 4),
          rect('FarLamp' + index, x - 2, y + 14, 5, 11, '#AC9067', .67),
        ];
      }),
    ]],
    ['Gallery', [
      rect('Vault', left, 0, paintWidth, 110, '#29333B'),
      poly('LowSweptEave', [[left, 74], [-185, 98], [198, 81], [465, 86], [639, 100], [842, 87], [1133, 82], [1432, 96], [right, 73], [right, 110], [1428, 132], [1133, 115], [848, 121], [638, 135], [455, 121], [196, 114], [-181, 133], [left, 112]], '#39464A'),
      rect('DistantStoneRail', left, 392, paintWidth, 29, '#36454C'),
      rect('DistantStoneCap', left, 388, paintWidth, 6, '#61716F', .7),
      ...ribs.flatMap((x, index) => [
        poly('JadeRib' + index, [[x - 18, 89], [x + 32, 105], [x + 21, 416], [x - 22, 426]], '#3E4144'),
        rect('CopperInlay' + index, x - 9, 114, 5, 295, '#82765E', .45),
        rect('RibCapital' + index, x - 31, 107, 71, 12, '#585247'),
        rect('RibStoneShoe' + index, x - 30, 415, 64, 11, '#5A5248'),
      ]),
      poly('WaterGateRoof', [[578, 354], [606, 342], [650, 339], [677, 345], [705, 355], [679, 357], [627, 352]], '#4D5759'),
      line('GateRidge', [[581, 353], [622, 342], [650, 339], [705, 354]], '#7D7D69', 2, .6),
      rect('CentralWaterGate', 601, 353, 79, 39, '#303E45'),
      rect('CopperGateBar', 604, 381, 72, 4, '#766C58', .5),
      ...[130, 241, 353, 469, 812, 964, 1063, 1141].map((x, index) =>
        line('RailMasonry' + index, [[x, 396], [x - 5, 408], [x + 3, 416]], '#546164', 2, .65)),
      fade('UnderVault', [left, 0, paintWidth, 148], '#202932', 'top'),
    ]],
    ['Paving', floor(426, ['#515955', '#58615A', '#818C7E', '#899589', '#626B60'])],
  ];
}

const group = (name, children) =>
  ({name, kind: 'container', position: [0, 0], size: [paintWidth, sceneHeight], children});

// nativeShape uses a 676-unit design frame. Align its top with the top of
// the 720-unit gameplay frame, including the area behind the HUD.
export function candidateBattleScene(act, theme, {contactTrial = false} = {}) {
  const authored = act === 1 ? basaltSealApproach() : act === 2 ? jadeAqueductGallery() : null;
  if (!authored) throw Error('Expected act 1 or 2');
  if (contactTrial) authored.at(-1)[1].push(light('MeasuredHeroContact',
    [277, groundY - 4, 86, 10], '#18151A', .2));
  const layers = authored.map(([name, shapes]) => {
    const images = shapes.flatMap(shape => nativeShape(shape, theme, {earSelection: 'balanced'}));
    const children = images.length <= 60 ? images : Array.from({length: Math.ceil(images.length / 60)},
      (_, index) => group('Batch' + index, images.slice(index * 60, (index + 1) * 60)));
    return group(name, children);
  });
  return {...group('CandidateBattleScene', layers), position: [0, 22]};
}

export function controlCount(node) {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + controlCount(child), 0);
}
