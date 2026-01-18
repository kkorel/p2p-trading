export type StepId = number;

export class StepLogger {
  group(step: StepId, title: string) {
    const header = `=== [STEP ${step}] ${title} ===`;
    console.log(header);

    const time = () => new Date().toISOString();
    const line = (msg: string) => `[STEP ${step}] ${time()} ${msg}`;

    return {
      info(msg: string) {
        console.log(line(msg));
      },
      event(actorFrom: string, actorTo: string, msg: string) {
        console.log(line(`${actorFrom} -> ${actorTo}: ${msg}`));
      },
      done(msg?: string) {
        console.log(line(msg ?? 'done'));
      },
    };
  }
}

export default StepLogger;
