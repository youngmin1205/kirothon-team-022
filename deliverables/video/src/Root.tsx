import { Composition } from 'remotion';
import { DemoFilm, FILM_FRAMES, FPS } from './DemoFilm';
export const Root = () => (
  <Composition id="DemoFilm" component={DemoFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
);
