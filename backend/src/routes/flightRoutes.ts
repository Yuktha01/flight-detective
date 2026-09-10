import { Router } from "express";
// import { getFlight } from "../services/aviationstackService";
import { investigateFlight } from "../services/flightService";

const router = Router();

router.get("/:flightNumber", async (req, res) => {
  try {
    const flightNumber = req.params.flightNumber.toUpperCase();

    const flight = await investigateFlight(flightNumber);

    if (!flight) {
      res.status(404).json({
        error: {
          code: "FLIGHT_NOT_FOUND",
          message: "We couldn't find that flight.",
        },
      });
      return;
    }

    res.json(flight);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: {
        code: "FLIGHT_DATA_UNAVAILABLE",
        message: "Flight information is temporarily unavailable.",
      },
    });
  }
});

export default router;