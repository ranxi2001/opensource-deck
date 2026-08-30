#!/usr/bin/env node
import { runCli } from "./main";

void runCli(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
