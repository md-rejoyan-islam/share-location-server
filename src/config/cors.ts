import dotenv from "dotenv";
dotenv.config();

import { CorsOptions } from "cors";

const whitelist: string[] = (process.env.CORS_WHITELIST || "").split(",");

const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    if ((origin && whitelist.includes(origin)) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

// export the corsOptions object
export default corsOptions;
