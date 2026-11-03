import { GITHUB_ACTION_PATH } from "./trust-pages.ts";

export { GITHUB_ACTION_PATH };

export const GITHUB_ACTION_TITLE = "SunsetDiff GitHub Action | SunsetDiff";
export const GITHUB_ACTION_DESCRIPTION =
  "Inputs and a workflow example for the SunsetDiff Action that flags deprecated and retiring model ids.";

/** Ref that contains action/action.yml. This site deploys from that branch. */
export const ACTION_REPOSITORY = "alixgrosbard/model-migrate";
export const ACTION_REF = "cursor/sunsetdiff-v1-3cab";
export const ACTION_USES = `${ACTION_REPOSITORY}/action@${ACTION_REF}`;

export const ACTION_API_URL = "https://sunsetdiff.onrender.com/api/v1/models.json";
export const ACTION_MODEL_HOST = "https://sunsetdiff.onrender.com";

export interface ActionInput {
  name: string;
  required: boolean;
  defaultValue: string;
  description: string;
}

/** Matches action/action.yml. Tests fail if that file drifts. */
export const ACTION_INPUTS: ActionInput[] = [
  {
    name: "paths",
    required: false,
    defaultValue: "**/*.{py,ts,js,json,yaml,yml,toml,env.example}",
    description: "Glob of files to scan. The bundled scanner walks the repo and keeps these extensions.",
  },
  {
    name: "warn-days",
    required: false,
    defaultValue: "60",
    description: "Warn when a shutdown is within this many days.",
  },
  {
    name: "fail-days",
    required: false,
    defaultValue: "14",
    description: "Fail the job when a shutdown is within this many days, or the model is already retired.",
  },
  {
    name: "api-url",
    required: false,
    defaultValue: ACTION_API_URL,
    description: "Models JSON URL. A bundled snapshot is used when this is unreachable.",
  },
];

export const ACTION_BEHAVIOR = [
  "The Action file is action/action.yml. It runs action/dist/index.js on Node 20. It is not listed in this repository as a Marketplace action.",
  "It checks out nothing by itself. The workflow below uses actions/checkout first, which is the checkout step this repository's own workflows use. The scanner then reads the workspace.",
  "It skips directories named node_modules, .git, dist, and snapshots. Other files are kept when they match the paths glob.",
  "It loads the models JSON from api-url. The default is the compact array at /api/v1/models.json on sunsetdiff.onrender.com. If that response is not a non-empty JSON array, it uses the bundled file action/snapshot/models.json. The static generator writes that file from the same compact rows.",
  "A model is reported when its status is retired, deprecated, or legacy. A model with another status is reported when it has a shutdown date, the date kind is not not_before or none, and the date is within warn-days.",
  "The finding is an error when the status is retired, or the shutdown date is within fail-days. Other findings are warnings. Each one is an annotation on the file and line. The job summary is a table. The job fails when there is at least one error. The failure text says that many model ids are inside the fail window or already retired.",
  `The annotation links to ${ACTION_MODEL_HOST}/models/<provider>/<slug>/. That host is the one written in the scanner. The public site is https://sunsetdiff.com.`,
  "The Action reads files and writes annotations and the job summary. It does not commit, and it does not send email.",
];

export const ACTION_WORKFLOW = `name: Check model ids
on:
  pull_request:
jobs:
  sunsetdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${ACTION_USES}
        with:
          paths: "${ACTION_INPUTS[0].defaultValue}"
          warn-days: "${ACTION_INPUTS[1].defaultValue}"
          fail-days: "${ACTION_INPUTS[2].defaultValue}"
          api-url: "${ACTION_INPUTS[3].defaultValue}"
`;
