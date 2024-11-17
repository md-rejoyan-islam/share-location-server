import cors from "cors";
import express from "express";
import corsOptions from "../config/cors";

const middleware = [cors(corsOptions), express.json()];

export default middleware;
