import Phaser from "phaser";
import Blackboard from "./Blackboard";
type Transform = Phaser.GameObjects.Components.Transform;

export const createGetClosestTagged =
  (tag: string) =>
  (
    blackboard: Blackboard,
    position: { x: number; y: number },
    maxDistance: number
  ): null | Transform => {
    const item = blackboard.getTagged(tag) as Transform[];
    if (!item.length) {
      return null;
    }

    let dist;
    let closestDist = Infinity;
    let nearestItem = null;
    for (let i = 0; i < item.length; i++) {
      dist = Phaser.Math.Distance.BetweenPoints(item[i], position);

      if (dist > closestDist || dist > maxDistance) {
        continue;
      }
      if (dist < closestDist) {
        closestDist = dist;
        nearestItem = item[i];
      }
    }

    return nearestItem;
  };
