import { Response, Router } from "express";
import {
  MalformedProviderResponseError,
  ProviderAuthError,
  ProviderQuotaError,
  ProviderResponseError,
  UpstreamConnectionError,
  UpstreamTimeoutError,
} from "../services/aviationstackService";
import { flightCache } from "../services/flightCache";
import { investigateFlight } from "../services/flightService";

const router = Router();

function handleRouteError(res: Response, error: unknown, context: string) {
  if (error instanceof UpstreamTimeoutError) {
    res.status(504).json({
      error: {
        code: "UPSTREAM_TIMEOUT",
        message: "Flight data provider timed out. Please try again.",
      },
    });
    return;
  }

  if (error instanceof ProviderQuotaError) {
    res.status(503).json({
      error: {
        code: "PROVIDER_QUOTA_EXCEEDED",
        message:
          "Flight data service is temporarily unavailable due to upstream rate limits. Please try again later.",
      },
    });
    return;
  }

  if (error instanceof ProviderAuthError) {
    console.error(`Upstream authentication error during ${context}:`, error.message);
    res.status(500).json({
      error: {
        code: "FLIGHT_DATA_UNAVAILABLE",
        message: "Flight information is temporarily unavailable.",
      },
    });
    return;
  }

  if (
    error instanceof ProviderResponseError ||
    error instanceof MalformedProviderResponseError ||
    error instanceof UpstreamConnectionError
  ) {
    console.error(`Upstream provider failure during ${context}:`, error.message);
    res.status(502).json({
      error: {
        code: "PROVIDER_ERROR",
        message: "Flight data provider returned an error. Please try again.",
      },
    });
    return;
  }

  console.error(`Unhandled error during ${context}:`, error);
  res.status(500).json({
    error: {
      code: "FLIGHT_DATA_UNAVAILABLE",
      message: "Flight information is temporarily unavailable.",
    },
  });
}


router.get("/:flightNumber", async (req, res) => {
  try {
    const flightNumber = req.params.flightNumber.toUpperCase();

    const flightNumberPattern = /^[A-Z][A-Z0-9]{1,2}\d{1,4}$/;

    if (!flightNumberPattern.test(flightNumber)) {
      res.status(400).json({
        error: {
          code: "INVALID_FLIGHT_NUMBER",
          message: "Please enter a valid flight number.",
        },
      });
      return;
    }

    const isRefresh = req.query.refresh === "true";

    if (!isRefresh) {
      const cached = flightCache.get(flightNumber);
      if (cached !== undefined) {
        res.setHeader("X-Cache", "HIT");
        if (cached === null) {
          res.status(404).json({
            error: {
              code: "FLIGHT_NOT_FOUND",
              message: "We couldn't find that flight.",
            },
          });
          return;
        }
        res.json(cached);
        return;
      }
    }

    const flight = await investigateFlight(flightNumber);

    res.setHeader("X-Cache", "MISS");

    if (!flight) {
      // Cache 404 results for 60 seconds to protect provider quota against invalid lookup bursts
      flightCache.set(flightNumber, null, 60);
      res.status(404).json({
        error: {
          code: "FLIGHT_NOT_FOUND",
          message: "We couldn't find that flight.",
        },
      });
      return;
    }

    // Cache successful results for 120 seconds
    flightCache.set(flightNumber, flight, 120);
    res.json(flight);
  } catch (error) {
    handleRouteError(res, error, `flight lookup (${req.params.flightNumber})`);
  }
});

export default router;

