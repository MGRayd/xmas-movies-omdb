/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
functions.setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Callable function used by the web app to proxy fanart.tv requests
// and avoid CORS issues in the browser.
export const fanartProxy = functions.https.onCall(async (data, context) => {
  try {
    // Log the raw data we received to understand the payload shape
    logger.debug("fanartProxy raw data", {
      dataType: typeof data,
      hasDataProperty: (data as any) && Object.prototype.hasOwnProperty.call(data as any, "data"),
    });

    const payload: any = (data as any)?.data ?? data;
    const imdbId = payload?.imdbId as string | undefined;

    const rawTmdbId: any = payload?.tmdbId;
    const tmdbIdNormalized: number | undefined =
      typeof rawTmdbId === "number"
        ? rawTmdbId
        : typeof rawTmdbId === "string" && rawTmdbId.trim()
        ? Number(rawTmdbId)
        : undefined;

    const apiKey = payload?.apiKey as string | undefined;

    const idForApi = tmdbIdNormalized != null ? String(tmdbIdNormalized) : imdbId;

    logger.debug("fanartProxy payload fields", {
      hasImdbId: !!imdbId,
      hasTmdbId: tmdbIdNormalized != null,
      hasApiKey: !!apiKey,
      idForApi,
    });

    if (!idForApi || !apiKey) {
      logger.warn("fanartProxy called without usable id or apiKey", {
        hasImdbId: !!imdbId,
        hasTmdbId: tmdbIdNormalized != null,
        hasApiKey: !!apiKey,
      });
      // Gracefully return no posters rather than erroring the client
      return {posters: []};
    }

    const endpoint = `https://webservice.fanart.tv/v3.2/movies/${encodeURIComponent(
      idForApi,
    )}?api_key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(endpoint as any);
    if (!res.ok) {
      logger.error("fanart.tv error", {
        status: res.status,
        statusText: res.statusText,
        endpoint,
      });

      // 404 in v3.2 usually just means no images for that ID; treat as "no posters".
      if (res.status === 404) {
        return {posters: []};
      }

      throw new functions.https.HttpsError(
        "unknown",
        `fanart.tv request failed: ${res.status} ${res.statusText}`,
      );
    }

    const json: any = await res.json();

    const posters: string[] = [];
    if (Array.isArray(json.movieposter)) {
      for (const p of json.movieposter) {
        if (typeof p?.url === "string") {
          posters.push(p.url);
        }
      }
    }

    const unique = Array.from(new Set(posters));

    if (unique.length === 0) {
      logger.debug("fanart.tv returned no movieposter entries", {
        imdbId,
        responseKeys: json && typeof json === "object" ? Object.keys(json) : null,
      });
    }

    return {posters: unique};
  } catch (err: any) {
    logger.error("fanartProxy failed", {error: err?.message || String(err)});
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError("internal", "Failed to fetch posters from fanart.tv");
  }
});
