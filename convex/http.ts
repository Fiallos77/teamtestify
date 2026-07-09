import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/embed/widget",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});

http.route({
  path: "/embed/widget",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const widgetId = new URL(request.url).searchParams.get("id");
    if (!widgetId) {
      return new Response(JSON.stringify({ error: "Missing widget id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const payload = await ctx.runQuery(internal.embed.getWidgetPayload, {
      widgetId,
    });
    if (!payload) {
      return new Response(JSON.stringify({ error: "Widget not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        ...CORS_HEADERS,
      },
    });
  }),
});

http.route({
  path: "/embed/event",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});

http.route({
  path: "/embed/event",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      await ctx.runMutation(api.embed.logEvent, {
        widgetId: body.widgetId,
        type: body.type,
        testimonialId: body.testimonialId,
      });
    } catch {
      // Best-effort analytics: never fail the embed over a bad/late event.
    }
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

export default http;
