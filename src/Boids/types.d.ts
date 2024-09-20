declare interface BoidsRunner2DProps {
  boidCount: number;
  worldSize: Vec2D;
  percRadius: number;
  wallForce: (r: number) => number;
  sepForce: (r: number) => number;
  alignForce: (r: number) => number;
  cohesionForce: (r: number) => number;
  maxVel: number;
  seed?: string;
  dt: number;
}

declare interface BoidsRunner2D extends BoidsRunner2DProps {
  rng: () => number;
  pos: Vec2D[];
  vel: Vec2D[];
  acc: Vec2D[];
}

declare type BoidsProps = {
  runnerProps?: Partial<BoidsRunner2DProps>;
  frameRate?: number;
  skipFrames?: number;
  boidSize?: { w: number; h: number };
};

declare type BoidsState = object;
