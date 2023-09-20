import { SnakeSoldier, ElementGem, SkillGem, FactionGem, SnakeCatalog } from '../typechain-types';
import { PHASE_1_2_IDS } from './utils';
import * as CC from './catalogConstants';

const BASE_URI = 'ipfs://QmViB6rJTEeJeypDJ9WCS6Q6nPyQ8mfyJmVXqEH2jgxAbq/gems';
const ELEMENT_GEMS_URI = `${BASE_URI}/elements/`;
const SKILL_GEMS_URI = `${BASE_URI}/skills/`;
const FACTION_GEMS_URI = `${BASE_URI}/factions/`;
const EQUIPPABLE_GROUP_ID = 1;
const OLD_ASSET_ID = 1;
const NEW_ASSET_ID = 2;

// Retrieved on August 20th
const claimedElementGems = [
  1, 2, 201, 202, 203, 204, 205, 206, 207, 208, 209, 21, 210, 211, 212, 213, 214, 215, 216, 217,
  218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 23, 230, 231, 232, 233, 234, 235, 236,
  237, 238, 239, 24, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
  256, 257, 258, 259, 26, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 27, 270, 271, 272, 273,
  274, 275, 276, 277, 278, 279, 28, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 29, 290, 291,
  292, 293, 294, 295, 296, 30, 31, 315, 316, 317, 318, 319, 32, 320, 321, 322, 323, 324, 33, 334,
  335, 336, 337, 338, 339, 34, 340, 341, 342, 343, 344, 345, 347, 348, 349, 350, 351, 352, 358, 359,
  36, 360, 361, 362, 364, 365, 367, 368, 369, 37, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379,
  38, 380, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400,
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419,
  420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438,
  439, 440, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 462, 463, 464, 465, 466, 472, 473,
  474, 475, 476, 477, 478, 479, 480, 481, 498, 499, 500, 501, 503, 504, 505, 506, 507, 509, 510,
  511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 544, 545, 546, 547, 548,
  549, 550, 551, 552, 553, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580,
  581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 609, 610, 611, 612,
  613, 614, 615, 616, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634, 640, 641,
  642, 643, 644, 645, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661,
  662, 663, 664, 665, 666, 667, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680,
];
const claimedSkillGems = [
  1, 2, 201, 202, 203, 204, 205, 206, 207, 208, 209, 21, 210, 211, 212, 213, 214, 215, 216, 217,
  218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 23, 230, 231, 232, 233, 234, 235, 236,
  237, 238, 239, 24, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
  256, 257, 258, 259, 26, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 27, 270, 271, 272, 273,
  274, 275, 276, 277, 278, 279, 28, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 29, 290, 291,
  292, 293, 294, 295, 30, 31, 315, 316, 317, 318, 319, 32, 320, 321, 322, 323, 324, 33, 334, 335,
  336, 337, 338, 339, 34, 340, 341, 342, 343, 344, 345, 347, 348, 349, 350, 351, 352, 358, 359, 36,
  360, 361, 362, 364, 365, 367, 368, 369, 37, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 38,
  380, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 392, 393, 394, 395, 396, 397, 398, 398,
  399, 399, 400, 400, 401, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
  415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433,
  434, 435, 436, 437, 438, 439, 440, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 462, 463,
  464, 465, 466, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 498, 499, 500, 501, 503, 504,
  505, 506, 507, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524,
  544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 567, 568, 569, 570, 571, 572, 573, 574, 575,
  576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594,
  595, 609, 610, 611, 612, 613, 614, 615, 616, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631,
  632, 633, 634, 640, 641, 642, 643, 644, 645, 645, 647, 648, 649, 650, 651, 652, 653, 654, 655,
  656, 657, 658, 659, 660, 661, 662, 663, 664, 665, 666, 667, 669, 670, 671, 672, 673, 674, 675,
  676, 677, 678, 679, 680,
];
const claimedFactionGems = [
  1, 2, 201, 202, 203, 204, 205, 206, 207, 208, 209, 21, 210, 211, 212, 213, 214, 215, 216, 217,
  218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 23, 230, 231, 232, 233, 234, 235, 236,
  237, 238, 239, 24, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
  256, 257, 258, 259, 26, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 27, 270, 271, 272, 273,
  274, 275, 276, 277, 278, 279, 28, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 29, 290, 291,
  292, 293, 294, 295, 30, 31, 315, 316, 317, 318, 319, 32, 320, 321, 322, 323, 324, 33, 334, 335,
  336, 337, 338, 339, 34, 340, 341, 342, 343, 344, 345, 347, 348, 349, 350, 351, 352, 358, 359, 36,
  360, 361, 362, 364, 365, 367, 368, 369, 37, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 38,
  380, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400,
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419,
  420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438,
  439, 440, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 462, 463, 464, 465, 466, 472, 473,
  474, 475, 476, 477, 478, 479, 480, 481, 498, 499, 500, 501, 503, 504, 505, 506, 507, 509, 510,
  511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 544, 545, 546, 547, 548,
  549, 550, 551, 552, 553, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580,
  581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 609, 610, 611, 612,
  613, 614, 615, 616, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634, 640, 641,
  642, 643, 644, 645, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661,
  662, 663, 664, 665, 666, 667, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680,
];

async function addEquippableGemAssets(
  snakes: SnakeSoldier,
  elementGem: ElementGem,
  skillGem: SkillGem,
  factionGem: FactionGem,
  catalog: SnakeCatalog,
): Promise<void> {
  console.log('Adding equippable gem assets');

  let tx = await elementGem.addEquippableAssetEntry(
    EQUIPPABLE_GROUP_ID,
    catalog.address,
    ELEMENT_GEMS_URI,
    [],
  );
  await tx.wait();
  tx = await skillGem.addEquippableAssetEntry(
    EQUIPPABLE_GROUP_ID,
    catalog.address,
    SKILL_GEMS_URI,
    [],
  );
  await tx.wait();
  tx = await factionGem.addEquippableAssetEntry(
    EQUIPPABLE_GROUP_ID,
    catalog.address,
    FACTION_GEMS_URI,
    [],
  );
  await tx.wait();
  console.log('Added equippable asset entries');

  await elementGem.setValidParentForEquippableGroup(
    EQUIPPABLE_GROUP_ID,
    snakes.address,
    CC.SLOT_ELEMENT_GEM_ID,
  );
  await skillGem.setValidParentForEquippableGroup(
    EQUIPPABLE_GROUP_ID,
    snakes.address,
    CC.SLOT_SKILL_GEM_ID,
  );
  await factionGem.setValidParentForEquippableGroup(
    EQUIPPABLE_GROUP_ID,
    snakes.address,
    CC.SLOT_FACTION_GEM_ID,
  );
  console.log('Set valid parents for equippable group');

  const elementGemIds = PHASE_1_2_IDS.filter((id) => claimedElementGems.includes(id));
  const skillGemIds = PHASE_1_2_IDS.filter((id) => claimedSkillGems.includes(id));
  const factionGemIds = PHASE_1_2_IDS.filter((id) => claimedFactionGems.includes(id));

  // Split the ids into chunks of 20
  const chunkSize = 20;
  const idChunksElement = [];
  const idChunksSkill = [];
  const idChunksFaction = [];
  for (let i = 0; i < elementGemIds.length; i += chunkSize) {
    idChunksElement.push(elementGemIds.slice(i, i + chunkSize));
  }
  for (let i = 0; i < skillGemIds.length; i += chunkSize) {
    idChunksSkill.push(skillGemIds.slice(i, i + chunkSize));
  }
  for (let i = 0; i < factionGemIds.length; i += chunkSize) {
    idChunksFaction.push(factionGemIds.slice(i, i + chunkSize));
  }

  for (const chunk of idChunksElement) {
    let tx = await elementGem.addAssetToTokens(chunk, NEW_ASSET_ID, OLD_ASSET_ID);
    await tx.wait();
    console.log(`Added assets to element group ${chunk[0]}-${chunk[chunk.length - 1]}`);
  }
  for (const chunk of idChunksSkill) {
    let tx = await skillGem.addAssetToTokens(chunk, NEW_ASSET_ID, OLD_ASSET_ID);
    await tx.wait();
    console.log(`Added assets to skill group ${chunk[0]}-${chunk[chunk.length - 1]}`);
  }
  let i = 0;
  for (const chunk of idChunksFaction) {
    i++;
    if (i < 14) continue;
    let tx = await factionGem.addAssetToTokens(chunk, NEW_ASSET_ID, OLD_ASSET_ID);
    await tx.wait();
    console.log(`Added assets to faction group ${chunk[0]}-${chunk[chunk.length - 1]}`);
  }
}

export default addEquippableGemAssets;
