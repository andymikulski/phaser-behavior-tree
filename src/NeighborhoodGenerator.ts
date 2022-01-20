import { PerlinNoise } from './PerlinNoise';

type Tuple2D = [number, number, number?];
type Tuple3D = [number, number, number];

// const noise = PoissonDisc;
// noise.seed(1234567890);


// var ratio = window.devicePixelRatio || 1,
//   zoom = 5,
//   radius = (window.innerWidth < 620 ? 10 : 20) * ratio, //  * zoom,
//   width = Math.min(1024, window.innerWidth) * ratio,
//   height = Math.min(1024, window.innerWidth) * ratio,
//   x0 = radius,
//   y0 = radius,
//   x1 = width - radius,
//   y1 = height - radius,
//   numAttempts = 30;


// function getNoiseValueAtPoint(pt: Tuple2D) {
//   return getNoiseValueAtCoords(pt[0], pt[1])
// }

// function getNoiseValueAtCoords(x: number, y: number) {
//   var base =
//     ((noise.simplex2((x / 250) * 0.5, (y / 250) * 0.5) + 1) / 2)

//   var wide_mountains =
//     (noise.simplex2((x / 250) / zoom, (y / 250) / zoom) + 1) / 2

//   var thresh = 0.6
//   var remainder = 1.0 - thresh
//   if (wide_mountains >= thresh) {
//     wide_mountains = (wide_mountains - thresh) / remainder
//   } else {
//     wide_mountains = 0
//   }

//   var pointy_mountains =
//     ((noise.simplex2(x / 250, y / 250) + 1) / 2)
//   thresh = 0.75
//   remainder = 1.0 - thresh
//   if (pointy_mountains >= thresh) {
//     pointy_mountains = ((pointy_mountains - thresh) / remainder) * 1.25
//   } else {
//     pointy_mountains = 0
//   }

//   return (((base + wide_mountains + pointy_mountains) * 10) | 0) / 10;
// }

// //-----------

// function isValidLand(point: Tuple2D) {
//   let _valcheck_value = getNoiseValueAtPoint(point)
//   return _valcheck_value >= 0.2 && _valcheck_value <= 0.6
// }

// function isNotSteep(point: Tuple2D, origin_point_a: Tuple2D, origin_point_b: Tuple2D) {
//   let _valcheck_value = getNoiseValueAtPoint(point);
//   if (origin_point_a) {
//     let _valcheck_value_two = getNoiseValueAtPoint(origin_point_a);
//     if (Math.abs(_valcheck_value_two - _valcheck_value) >= 0.15) {
//       return false;
//     }
//   }
//   if (origin_point_b) {
//     let _valcheck_value_three = getNoiseValueAtPoint(origin_point_b);
//     if (Math.abs(_valcheck_value_three - _valcheck_value) >= 0.15) {
//       return false;
//     }
//   }
//   return true;
// }

// function sweepLand(point_a: Tuple3D, point_b: Tuple3D, steps = 4, sweepFunc: (a: Tuple2D, b: Tuple2D, c: Tuple2D) => boolean) {
//   let pt;
//   for (let i = 0; i < steps; i++) {
//     pt = lerp_point(point_a, point_b, (1 / steps) * i)
//     if (!sweepFunc(pt, point_a, point_b)) {
//       return false;
//     }
//   }
//   return true;
// }

function scale_vector(vector: Tuple2D, scale: number) {
  return [vector[0] * scale, vector[1] * scale] as Tuple2D;
}
function add_vector(vector_a: Tuple2D, vector_b: Tuple2D): Tuple2D {
  return [vector_a[0] + vector_b[0], vector_a[1] + vector_b[1]] as Tuple2D;
}

function lerp_point(point_a: Tuple2D, point_b: Tuple2D, t = 0.5) {
  return add_vector(scale_vector(point_a, t), scale_vector(point_b, 1 - t))
}

function rand() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}



function distance2(a: Tuple2D, b: Tuple2D) {
  var dx = b[0] - a[0],
    dy = b[1] - a[1];
  return dx * dx + dy * dy;
}





// ---------------


// let found = { count: 0, list: [] } as any;

// function reset(r: number, x: number, y: number) {
//   found = { count: 0, list: [] }

//   var innerSqrd = r * r,
//     A = 4 * r * r - innerSqrd,
//     cellSize = r * Math.SQRT1_2,
//     gridWidth = Math.ceil(width / cellSize),
//     gridHeight = Math.ceil(height / cellSize),
//     grid = new Array(gridWidth * gridHeight),
//     activePoints = [] as Tuple3D[];


//   while (!isValidLand([x, y] as Tuple2D)) {
//     x = (x + Math.random()) % width
//     y = (y + Math.random()) % height
//   }

//   // Seed the starting point
//   registerWaypointNode([x, y]);

//   stepNeighborhoodExpansion();


// }


export default class PoissonNeighborhood {
  public activePoints = [] as Tuple3D[];
  public pointsOfInterest = [] as Tuple3D[];
  public declaredWaypoints = [] as Tuple3D[];

  public edges = [] as [(Tuple2D|Tuple3D), (Tuple2D|Tuple3D)][];

  private gridWidth: number;
  private gridHeight: number;
  private grid: Tuple3D[];
  public cellSize: number;

  private A: number;
  private innerSqrd: number;

  private readonly zoom: number = 5;

  private readonly NUM_ATTEMPTS: number = 30;


  private checkValidLand = (point: Tuple2D) => {
    return true;
    let val = this.getNoiseValueAtCoords(point[0], point[1]);
    return val >= 0.2 && val <= 0.6;
  }

  private checkSteepLand = (point: Tuple2D, originA?: Tuple2D, originB?: Tuple2D) => {
    let pointValue = this.getNoiseValueAtPoint(point);
    if (originA) {
      let originAValue = this.getNoiseValueAtPoint(originA);
      if (Math.abs(originAValue - pointValue) >= 0.15) {
        return true;
      }
    }
    if (originB) {
      let originBValue = this.getNoiseValueAtPoint(originB);
      if (Math.abs(originBValue - pointValue) >= 0.15) {
        return true;
      }
    }
    return false;
  }

  getNoiseValueAtPoint = (pt: Tuple2D | Tuple3D) => {
    return this.getNoiseValueAtCoords(pt[0], pt[1])
  }

  getNoiseValueAtCoords = (x: number, y: number) => {
    const base =
      ((PerlinNoise.simplex2((x / 250) * 0.5, (y / 250) * 0.5) + 1) / 2)

    let wideMountainValue =
      (PerlinNoise.simplex2((x / 250) / this.zoom, (y / 250) / this.zoom) + 1) / 2

    let thresh = 0.6;
    let remainder = 1.0 - thresh;
    if (wideMountainValue >= thresh) {
      wideMountainValue = (wideMountainValue - thresh) / remainder;
    } else {
      wideMountainValue = 0;
    }

    let pointyMountainValue =
      ((PerlinNoise.simplex2(x / 250, y / 250) + 1) / 2);
    thresh = 0.75;
    remainder = 1.0 - thresh;
    if (pointyMountainValue >= thresh) {
      pointyMountainValue = ((pointyMountainValue - thresh) / remainder) * 1.25
    } else {
      pointyMountainValue = 0
    }

    // Posterize values to nearest .1
    return (((base + wideMountainValue + pointyMountainValue) * 10) | 0) / 10;
  }

  private sweepLand = (point_a: Tuple3D, point_b: Tuple3D, steps = 4, sweepFunc: (a: Tuple2D | Tuple3D, b: Tuple2D | Tuple3D, c: Tuple2D | Tuple3D) => boolean) => {
    let pt;
    for (let i = 0; i < steps; i++) {
      pt = lerp_point(point_a, point_b, (1 / steps) * i)
      if (!sweepFunc(pt, point_a, point_b)) {
        return false;
      }
    }
    return true;
  }

  // Generate point chosen uniformly from spherical annulus between radius r
  // and 2r from p.
  private generateAround = (p: Tuple2D, num_attempt: number) => {
    var θ = Math.random() * 2 * Math.PI,
      r = Math.sqrt(Math.random() * this.A + this.innerSqrd) + (num_attempt * 0.5); // http://stackoverflow.com/a/9048443/64009
    return [p[0] + r * Math.cos(θ), p[1] + r * Math.sin(θ), 0] as Tuple3D;
  }



  private near = (p: Tuple2D) => {
    var n = 2,
      x = p[0] / this.cellSize | 0,
      y = p[1] / this.cellSize | 0,
      x0 = Math.max(x - n, 0),
      y0 = Math.max(y - n, 0),
      x1 = Math.min(x + n + 1, this.gridWidth),
      y1 = Math.min(y + n + 1, this.gridHeight);
    for (var y = y0; y < y1; ++y) {
      var o = y * this.gridWidth;
      for (var x = x0; x < x1; ++x) {
        var g = this.grid[o + x];
        if (g && distance2(g, p) < this.innerSqrd) return true;
      }
    }
    return false;
  }

  private withinExtent = (p: Tuple2D) => {
    var x = p[0], y = p[1];
    const radius = 150;
    const x0 = radius;
    const y0 = radius;
    const x1 = this.worldWidth - radius;
    const y1 = this.worldHeight - radius;

    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  constructor(private worldWidth: number, private worldHeight: number, private startX: number, private startY: number) {
    PerlinNoise.seed(1234567890);

    const r = 150;
    this.innerSqrd = r * r;
    this.A = 4 * r * r - this.innerSqrd;
    this.cellSize = r * Math.SQRT1_2;
    this.gridWidth = Math.ceil(this.worldWidth / this.cellSize);
    this.gridHeight = Math.ceil(this.worldHeight / this.cellSize);
    this.grid = new Array(this.gridWidth * this.gridHeight);


    while (!this.checkValidLand([startX, startY] as Tuple2D)) {
      startX = (startX + (Math.random() * 10 * (Math.random() > 0.5 ? -1 : 1))) % this.worldWidth
      startY = (startY + (Math.random() * 10 * (Math.random() > 0.5 ? -1 : 1))) % this.worldHeight
    }
    this.startX = startX;
    this.startY = startY;

    // Seed the starting point
    this.registerWaypointNode([this.startX, this.startY, 0]);
  }

  public registerObstacle = (pos: Tuple3D) => {
    this.grid[this.gridWidth * (pos[1] / this.cellSize | 0) + (pos[0] / this.cellSize | 0)] = pos;
  }

  public registerWaypointNode = (p: Tuple3D, origin_point?: Tuple2D) => {
    p[2] = (p[2] || 0) + 1;

    this.declaredWaypoints.push(p as Tuple3D);
    this.activePoints.push(p as Tuple3D);
    this.grid[this.gridWidth * (p[1] / this.cellSize | 0) + (p[0] / this.cellSize | 0)] = p;

    if (origin_point) {
      origin_point[2] = (origin_point[2] || 0) + 1;

      this.edges.push([
        origin_point,
        p,
      ]);
    }
  }


  public getAllWaypoints = () => {
    return this.pointsOfInterest;
  }

  public getPOI = () => {
    if (!this.pointsOfInterest.length) {
      this.stepUntilPOI();
    }
    return this.pointsOfInterest[0];
  }


  private ends:any = null;
  public getEnds = () => {
    if (this.ends) {
      return this.ends;
    }

    this.ends = [];
    for(let i = 0; i < this.declaredWaypoints.length; i++){
      if (this.declaredWaypoints[i][2] <= 1) {
        this.ends.push(this.declaredWaypoints[i]);
      }
    }
    return this.ends;
  }

  public stepUntilPOI = () => {
    // var start = Date.now();
    let start = 0;
    do {
      start += 1;
      const poi = this.stepExpansion(true, Math.sin(start * 0.3) > 0.5);
      if (poi) {
        return poi;
      }
    } while (this.activePoints.length > 1) // && Date.now() - start < 1000 / 24);

    return this.pointsOfInterest[0];
  }

  public stepExpansion = (returNextPoi: boolean = false, fromFront: boolean = false): null | Tuple3D => {
    // var i = (Math.random() * Math.random() * this.activePoints.length) | 0,
    var i = fromFront ? 0 : (Math.random() * this.activePoints.length) | 0,
      p = this.activePoints[i];

    if (!p) { return null; }

    for (var j = 0; j < this.NUM_ATTEMPTS; ++j) {
      var q = this.generateAround(p, j + 1) as Tuple3D;
      if (
        this.withinExtent(q) &&
        !this.near(q)
        // Check path between two points is valid (e.g. not hitting a mountain/water)
        // && this.sweepLand(q, p, 4, this.checkValidLand)
        // Check that there isn't a steep incline between here and there
        // && !this.sweepLand(q, p, 4, this.checkSteepLand)
      ) {
        this.registerWaypointNode(q, p);
        break;
      }
    }

    // No suitable candidate found; remove from active queue.
    // (This means we are at the end of a line)
    if (j === this.NUM_ATTEMPTS) {
      this.activePoints[i] = this.activePoints.pop();
        // this.pointsOfInterest.push(p);
      //   if (p[2] < 2){ //  || (p[2] > 4 && rand() > 0.5)) {
      //   this.pointsOfInterest.push(p);
      //   // Stop here if we just want the next found point
      //   if (returNextPoi) {
      //     // this.activePoints[i] = this.activePoints.pop();
      //     return p;
      //   }
      // }

    }
  }
}