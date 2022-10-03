import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as path from "path";
import { Request, Response, NextFunction } from "express";
import * as express from "express";
import ApplicationError from "./errors/application-error";

const app = express();

function logResponseTime(req: Request, res: Response, next: NextFunction) {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    const message = `${req.method} ${res.statusCode} ${elapsedTimeInMs}ms\t${req.path}`;
    console.log({
      level: "debug",
      message,
      consoleLoggerOptions: { label: "API" },
    });
  });

  next();
}

app.use(logResponseTime);

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

app.use(
  (err: ApplicationError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    return res.status(err.status || 500).json({
      error: err.message,
    });
  }
);

export default app;
