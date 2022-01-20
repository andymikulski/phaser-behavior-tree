import Phaser from 'phaser';
import Blackboard from './Blackboard';




export const GetClosestTaggedObject = (blackboard: Blackboard, pos: { x: number; y: number; }, tag: string) => {
  const found = blackboard.getTagged(tag) as any[];
  if (!found.length) {
    return null;
  }

  let closest = null;
  let smallestDist = Infinity;
  let foundPos;
  for (let i = 0; i < found.length; i++) {
    foundPos = found[i].body?.position ?? found[i];

    const dist = Phaser.Math.Distance.Between(
      pos.x, pos.y,
      foundPos.x, foundPos.y
    );
    if (dist < smallestDist) {
      closest = found[i];
    }
  }
  return closest === null ? closest : (closest.body?.position ?? closest);
};
