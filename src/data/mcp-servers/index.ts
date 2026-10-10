import type { RegistryServer } from "@/lib/registry/types";
import sentry from "./sentry.json";
import socket from "./socket.json";
import parallelSearch from "./parallel-search.json";
import asana from "./asana.json";
import atlassian from "./atlassian.json";
import clickup from "./clickup.json";
import intercom from "./intercom.json";
import linear from "./linear.json";
import notion from "./notion.json";
import airtable from "./airtable.json";
import paypal from "./paypal.json";
import stripe from "./stripe.json";
import square from "./square.json";
import plaid from "./plaid.json";
import figma from "./figma.json";
import invideo from "./invideo.json";
import cloudflare from "./cloudflare.json";
import cohesivity from "./cohesivity.json";
import workato from "./workato.json";
import zapier from "./zapier.json";

export type { RegistryServer } from "@/lib/registry/types";

export const MCP_REGISTRY_SERVERS = [
  sentry,
  socket,
  parallelSearch,
  asana,
  atlassian,
  clickup,
  intercom,
  linear,
  notion,
  airtable,
  paypal,
  stripe,
  square,
  plaid,
  figma,
  invideo,
  cloudflare,
  cohesivity,
  workato,
  zapier,
] as RegistryServer[];
