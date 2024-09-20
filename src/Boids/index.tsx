import React from "react";
import p5 from "p5";
import "./styles.scss";
import { Runner2D, Vec2D } from "./runner";

class Boids extends React.Component<BoidsProps> {
  p5ref: React.RefObject<HTMLDivElement>;
  p5: p5 | undefined;
  active: boolean;
  debounceTimeout: number | undefined;
  runner: Runner2D;
  frameRate: number;
  skipFrames: number;
  boidSize: { w: number; h: number };
  yData: Float32Array;
  maxData: number;
  frameNo: number;
  constructor(props: BoidsProps) {
    super(props);
    this.p5ref = React.createRef();
    this.runner = new Runner2D(props.runnerProps);
    this.active = true;
    this.frameRate = props.frameRate || 30;
    this.skipFrames = props.skipFrames || 20;
    this.boidSize = props.boidSize || { w: 2, h: 4 };
    this.maxData = 300;
    this.yData = new Float32Array(this.maxData);
    this.frameNo = 0;

    // binds
    this.handleScroll = this.handleScroll.bind(this);
    this.handleScrollDebounced = this.handleScrollDebounced.bind(this);
  }

  handleScrollDebounced() {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(this.handleScroll, 100); // Adjust the delay as needed
  }

  handleScroll() {
    const inView = this.canvasInView();
    if (this.active && !inView) {
      this.p5!.frameRate(0);
      this.active = false;
    } else if (!this.active && inView) {
      this.p5!.frameRate(this.frameRate);
      this.active = true;
    }
  }

  canvasInView() {
    const canvas = this.p5ref.current!;
    const rect = canvas.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    return (
      rect.bottom > 0 && // Bottom edge is below the top of the viewport
      rect.top < windowHeight // Top edge is above the bottom of the viewport
    );
  }

  componentDidMount(): void {
    this.p5 = new p5(this.sketch, this.p5ref.current as HTMLElement);
  }

  componentWillUnmount(): void {
    if (this.p5) {
      this.p5.remove();
    }
  }

  calcFrame() {
    const { runner } = this;
    for (let i = 0; i < this.skipFrames; i++) {
      runner.step();
    }
    this.yData[this.frameNo % this.maxData] = runner.alignmentFactor;
    this.frameNo += 1;
  }

  makeBoid(p: p5, pos: Vec2D, vel: Vec2D) {
    const { w, h } = this.boidSize;
    const dir = vel.clone().norm().muls(h);
    const perp = dir.perp().muls(w / 2);
    const p1 = pos.clone().add(dir);
    const p2 = pos.clone().add(perp);
    const p3 = pos.clone().sub(perp);
    p.triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  }

  renderFrame() {
    const { runner } = this;
    const p = this.p5!;
    p.fill("white");
    p.stroke(0, 0, 0, 0);
    for (let i = 0; i < runner.boidCount; i++) {
      this.makeBoid(p, runner.pos[i], runner.vel[i]);
    }
  }

  renderChart() {
    //
    // background rectangle
    const { runner } = this;
    const { x, y } = runner.worldSize;
    const xx = (i: number) => ((2 + i / 100) * x) / 3;
    const yy = (i: number) => (y / 5) * (1 - i / 100);
    const p = this.p5!;
    p.fill(0, 0, 0, 240);
    p.rect(xx(0), yy(100), x / 3, y / 5);
    p.stroke(50, 50, 50);
    const max = this.frameNo;
    let min = max - this.maxData;
    if (min < 0) min = 0;
    for (let i = min; i < max; i++) {
      const nextX = ((i - min) / this.maxData) * 100;
      const nextY = this.yData[i % this.maxData];
      p.line(xx(nextX), yy(0), xx(nextX), yy(nextY));
    }
  }

  sketch = (p: p5) => {
    p.setup = () => {
      const width = this.p5ref.current?.offsetWidth || 400;
      const height = width / this.runner.aspectRatio;
      p.createCanvas(width, height);
      p.background(0, 0, 0, 0);
      p.frameRate(this.frameRate);
      p.strokeWeight(0.3);
      window.addEventListener("scroll", this.handleScrollDebounced, {
        passive: true,
      });
    };

    p.draw = () => {
      p.clear();
      const sc = p.width / this.runner.worldSize.x;
      p.scale(sc);
      this.calcFrame();
      this.renderFrame();
      this.renderChart();
    };
  };

  render(): React.ReactNode {
    return (
      <div className="Boids">
        <div className="canvas-cont" ref={this.p5ref}></div>
      </div>
    );
  }
}

export default Boids;
