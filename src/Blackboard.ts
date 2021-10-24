export type BlackboardObj = Phaser.GameObjects.Components.Transform | Phaser.GameObjects.GameObject;

export default class Blackboard {
  private data: { [key: string]: any } = {};
  public set = (key: string, value: any) => {
    this.data[key] = value;
  };
  public get = <T>(key: string, fallback?: T): T | null => {
    return this.data[key] as T ?? (fallback ?? null);
  };

  private taggedObjects: { [tag: string]: BlackboardObj[] } = {};

  public tagObject = (tags: string[], gameObject: BlackboardObj) => {
    let tag;
    for (let i = 0; i < tags.length; i++) {
      tag = tags[i];
      this.taggedObjects[tag] = this.taggedObjects[tag] || [];
      this.taggedObjects[tag].push(gameObject);
    }
  };

  public removeObjectTags = (tags: string[], gameObject: BlackboardObj) => {
    let tag;
    for(let i = 0; i < tags.length; i++){
      tag = tags[i];
      if (!this.taggedObjects[tag]){ continue; }
      this.taggedObjects[tag] = this.taggedObjects[tag].filter(x => x !== gameObject);
    }
  };

  public getTagged = (tag: string): BlackboardObj[] => {
    return this.taggedObjects[tag] || [];
  };
}