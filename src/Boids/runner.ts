import seedrandom from "seedrandom";

// const wallForce = (r: number) => 0;
// const sepForce = (r: number) => 0;
// const alignForce = (r: number) => 0;
// const cohesionForce = (r: number) => 0;

const wallForce = (r: number) => -Math.exp(-r) * 10;
const sepForce = (r: number) => 100 / r;
const alignForce = (r: number) => -3 * r;
const cohesionForce = (r: number) => 3 * r * r;

const defaultRunner: BoidsRunner2DProps = {
  boidCount: 40,
  worldSize: { x: 100, y: 100 },
  percRadius: 10,
  wallForce,
  alignForce,
  sepForce,
  cohesionForce,
  seed: "",
  dt: 0.001,
  maxVel: 30,
};

export class Vec2D {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static fromRng(rng: () => number) {
    const x = rng();
    const y = rng();
    return new Vec2D(x, y);
  }

  static zero() {
    return new Vec2D(0, 0);
  }

  abs(): number {
    if (this.x == 0 && this.y == 0) throw new Error("got zero vec");
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  clone() {
    return new Vec2D(this.x, this.y);
  }

  add(o: Vec2D) {
    this.x += o.x;
    this.y += o.y;
    return this;
  }

  sub(o: Vec2D) {
    this.x -= o.x;
    this.y -= o.y;
    return this;
  }

  muls(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  divs(s: number) {
    if (s == 0) throw new Error("Divide by zero");
    this.x /= s;
    this.y /= s;
    return this;
  }

  norm() {
    return this.divs(this.abs());
  }

  dot = (o: Vec2D): number => this.x * o.x + this.y * o.y;
  cross = (o: Vec2D): number => this.x * o.y - this.y * o.x;
  perp = () => new Vec2D(this.y, -this.x).norm();
}

export class Runner2D implements BoidsRunner2D {
  boidCount: number;
  worldSize: { x: number; y: number };
  percRadius: number;
  seed: string;
  wallForce: (r: number) => number;
  sepForce: (r: number) => number;
  alignForce: (r: number) => number;
  cohesionForce: (r: number) => number;
  rng: () => number;
  maxVel: number;
  pos: Vec2D[];
  vel: Vec2D[];
  acc: Vec2D[];
  dt: number;

  static zeros(n: number) {
    const vecs = [];
    for (let i = 0; i < n; i++) {
      vecs.push(Vec2D.zero());
    }
    return vecs;
  }

  randPos(n: number) {
    const rndX = this.rngWithMinMax(0, this.worldSize.x);
    const rndY = this.rngWithMinMax(0, this.worldSize.y);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const X = rndX();
      const Y = rndY();
      console.log(X, Y);
      pos.push(new Vec2D(X, Y));
    }
    return pos;
  }

  randVel(n: number): Vec2D[] {
    const vel: Vec2D[] = [];
    const rndV = this.maxVel;
    const rng = this.rngWithMinMax(-1, 1);
    for (let i = 0; i < n; i++) {
      const vec = Vec2D.fromRng(rng).norm().muls(rndV);
      vel.push(vec);
    }
    return vel;
  }

  initVecs() {
    this.pos = this.randPos(this.boidCount);
    this.vel = this.randVel(this.boidCount);
    this.acc = Runner2D.zeros(this.boidCount);
  }

  rngWithMinMax =
    (min: number = 0, max: number = 1) =>
    () =>
      min + (max - min) * this.rng();

  constructor(props?: Partial<BoidsRunner2DProps>) {
    this.boidCount = props?.boidCount || defaultRunner.boidCount;
    this.worldSize = props?.worldSize || defaultRunner.worldSize;
    this.percRadius = props?.percRadius || defaultRunner.percRadius;
    this.wallForce = props?.wallForce || defaultRunner.wallForce;
    this.alignForce = props?.alignForce || defaultRunner.alignForce;
    this.sepForce = props?.sepForce || defaultRunner.sepForce;
    this.cohesionForce = props?.cohesionForce || defaultRunner.cohesionForce;
    this.seed = props?.seed || defaultRunner.seed;
    this.maxVel = props?.maxVel || defaultRunner.maxVel;
    this.dt = props?.dt || defaultRunner.dt;

    console.log(this.boidCount);

    this.rng = seedrandom(this.seed);
    this.pos = this.randPos(this.boidCount);
    this.vel = this.randVel(this.boidCount);
    this.acc = Runner2D.zeros(this.boidCount);
    console.log(this.pos);
  }

  get aspectRatio() {
    const { x, y } = this.worldSize;
    return y / x;
  }
  step() {
    // calculate distances
    const dist = new Float32Array(this.boidCount * (this.boidCount - 1));
    for (let j = 1; j < this.boidCount; j++) {
      for (let i = 0; i < j; i++) {
        dist[i * this.boidCount + j] = this.pos[i]
          .clone()
          .sub(this.pos[j])
          .abs();
        dist[j * this.boidCount + i] = dist[i * this.boidCount + j];
      }
    }

    // zero acc
    this.acc = Runner2D.zeros(this.boidCount);

    for (let i = 0; i < this.boidCount; i++) {
      // calculate cohesion forces
      // get neighbours
      const nb = [];
      for (let j = 0; j < this.boidCount; j++) {
        if (i !== j && dist[j * this.boidCount + i] < this.percRadius)
          nb.push(j);
      }
      // calculate center of neighbours
      const center = Vec2D.zero();
      let count = 0;
      nb.forEach((j) => {
        center.add(this.pos[j]);
        count += 1;
      });
      const pos_i = this.pos[i];
      if (count > 0) {
        center.divs(count);

        const sep = center.clone().sub(pos_i);
        const sep_dist = sep.abs();
        this.acc[i].add(sep.norm().muls(cohesionForce(sep_dist)));
      }

      // calculate wall forces
      let fx = 0;
      let fy = 0;
      fx -= this.wallForce(pos_i.x);
      fx += this.wallForce(this.worldSize.x - pos_i.x);
      fy -= this.wallForce(pos_i.y);
      fy += this.wallForce(this.worldSize.y - pos_i.y);
      const wf = new Vec2D(fx, fy);
      this.acc[i].add(wf);
    }

    // calculate sepration force and alignForce
    for (let j = 1; j < this.boidCount; j++) {
      for (let i = 0; i < j; i++) {
        if (dist[j * this.boidCount + i] < this.percRadius) {
          const pos_i = this.pos[i];
          const pos_j = this.pos[j];
          const vel_i = this.vel[i];
          const vel_j = this.vel[j];
          // sep force
          const pos_ij = pos_i.clone().sub(pos_j);
          const sepf = this.sepForce(pos_ij.abs());
          const sepv = pos_ij.clone().norm().muls(sepf);
          this.acc[i].add(sepv);
          this.acc[j].sub(sepv);
          // alignForce
          const alf = this.alignForce(
            this.alignForce(vel_j.clone().norm().cross(vel_i.clone().norm())),
          );
          this.acc[i].add(vel_i.perp().muls(alf));
          this.acc[j].sub(vel_j.perp().muls(alf));
        }
      }
    }

    // calc next velocity and pos
    for (let i = 0; i < this.boidCount; i++) {
      this.vel[i].add(this.acc[i].muls(this.dt)).norm().muls(this.maxVel);
      this.pos[i].add(this.vel[i].clone().muls(this.dt));
    }
  }
}
