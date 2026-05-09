export class JobPrototype {
  constructor(x, y, id, customName) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.customName = customName || '';
    this.silver = false;
    this.gold = false;
    this.distance = 0;
    this.experience = 0;
    this.money = 0;
    this.motivation = 0;
    this.stopMotivation = 75;
    this.repeatTotal = 0;
    this.repeatRemaining = 0;
    this.set = -2;
  }

  calculateDistance() {
    this.distance = GameMap.calcWayTime({ x: this.x, y: this.y }, Character.position);
  }
}

export class ConsumablePrototype {
  constructor(id, image, name) {
    this.id = id;
    this.energy = 0;
    this.motivation = 0;
    this.health = 0;
    this.selected = true;
    this.image = image;
    this.count = 0;
    this.name = name;
    this.invId = null;
  }
}
