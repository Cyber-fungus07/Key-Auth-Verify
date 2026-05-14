// routes/protected.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { submitTypingData } from "../controllers/typing.controller.js";
import { TypingWord } from "../modals/typing.model.js";

const router = express.Router();

router.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized!",
    user: req.user,
  });
});

router.post("/typing/submit", authMiddleware, submitTypingData);

// router.get("/typing/records", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const records = await TypingWord.find({ user: userId }).sort({ timestamp: -1 });
//     return res.json({ records });
//   } catch (err) {
//     return res.status(500).json({ error: `Server Error: ${err.message}` });
//   }
// });

export default router;
